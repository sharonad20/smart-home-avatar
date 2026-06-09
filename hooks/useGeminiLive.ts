'use client';

import { useRef, useCallback, useEffect, useState } from 'react';

const MODEL   = 'models/gemini-3.1-flash-live-preview';
const WS_BASE = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

// ── PCM helpers ───────────────────────────────────────────────────────────────

function f32ToI16(f32: Float32Array): ArrayBuffer {
  const i16 = new Int16Array(f32.length);
  for (let i = 0; i < f32.length; i++) {
    i16[i] = Math.max(-32768, Math.min(32767, Math.round(f32[i] * 32767)));
  }
  return i16.buffer;
}

function b64ToI16(b64: string): Int16Array {
  const bin  = atob(b64);
  const u8   = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Int16Array(u8.buffer);
}

function toB64(buf: ArrayBuffer): string {
  const u8 = new Uint8Array(buf);
  let s = '';
  for (const b of u8) s += String.fromCharCode(b);
  return btoa(s);
}

// ── Weather helper (Open-Meteo, no API key required) ─────────────────────────

async function fetchWeather(city?: string): Promise<Record<string, unknown>> {
  try {
    let lat: number, lon: number, locationName: string;

    if (city) {
      const geo = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=he`
      ).then(r => r.json()) as { results?: Array<{ latitude: number; longitude: number; name: string }> };
      if (!geo.results?.length) return { error: `לא נמצאה עיר: ${city}` };
      lat = geo.results[0].latitude;
      lon = geo.results[0].longitude;
      locationName = geo.results[0].name;
    } else {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
      );
      lat = pos.coords.latitude;
      lon = pos.coords.longitude;
      locationName = 'מיקום נוכחי';
    }

    const w = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code` +
      `&timezone=auto`
    ).then(r => r.json()) as {
      current: {
        temperature_2m: number; apparent_temperature: number;
        relative_humidity_2m: number; wind_speed_10m: number; weather_code: number;
      };
    };

    const WMO: Record<number, string> = {
      0:'שמיים בהירים', 1:'בהיר ברובו', 2:'מעונן חלקית', 3:'מעונן',
      45:'ערפל', 48:'ערפל קפוא', 51:'טחב קל', 53:'טחב', 55:'טחב כבד',
      61:'גשם קל', 63:'גשם', 65:'גשם כבד', 71:'שלג קל', 73:'שלג', 75:'שלג כבד',
      80:'מטרות קלות', 81:'מטרות', 82:'מטרות כבדות', 95:'סופת רעמים', 99:'סופת רעמים עם ברד',
    };

    const c = w.current;
    return {
      location:    locationName,
      temperature: `${Math.round(c.temperature_2m)}°C`,
      feels_like:  `${Math.round(c.apparent_temperature)}°C`,
      humidity:    `${c.relative_humidity_2m}%`,
      wind:        `${Math.round(c.wind_speed_10m)} קמ"ש`,
      condition:   WMO[c.weather_code] ?? `קוד ${c.weather_code}`,
    };
  } catch (e) {
    return { error: String(e) };
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type LiveState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface LiveDevice {
  entity_id:     string;
  friendly_name: string;
  state:         string;
}

interface Options {
  devices:        LiveDevice[];
  onStateChange?: (s: LiveState) => void;
  onTranscript?:  (t: string)   => void;
  onDeviceAction: (entity_id: string, service: string, value?: number) => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useGeminiLive({ devices, onStateChange, onTranscript, onDeviceAction }: Options) {
  const wsRef          = useRef<WebSocket | null>(null);
  const captureCtxRef  = useRef<AudioContext | null>(null);
  const playCtxRef     = useRef<AudioContext | null>(null);
  const nextTimeRef    = useRef<number>(0);
  const procRef        = useRef<ScriptProcessorNode | null>(null);
  const srcNodeRef     = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef      = useRef<MediaStream | null>(null);
  const turnActiveRef      = useRef(false);
  const turnCompleteRef    = useRef(false);
  const lastResponseRef    = useRef('');   // accumulated output transcription
  const [connected, setConnected] = useState(false);

  // Callback refs so closures always call the latest version
  const onStateChangeRef  = useRef(onStateChange);
  const onTranscriptRef   = useRef(onTranscript);
  const onDeviceActionRef = useRef(onDeviceAction);
  useEffect(() => { onStateChangeRef.current  = onStateChange;  }, [onStateChange]);
  useEffect(() => { onTranscriptRef.current   = onTranscript;   }, [onTranscript]);
  useEffect(() => { onDeviceActionRef.current = onDeviceAction; }, [onDeviceAction]);

  const emit = (s: LiveState) => onStateChangeRef.current?.(s);

  // ── Stop current turn (stop mic streaming to Gemini) ─────────────────────

  const stopTurnRef = useRef<() => void>(() => {});

  const stopTurn = useCallback(() => {
    if (!turnActiveRef.current) return;
    turnActiveRef.current = false;
    procRef.current?.disconnect();
    srcNodeRef.current?.disconnect();
    procRef.current   = null;
    srcNodeRef.current = null;
    // Release mic so SpeechRecognition can use it between turns
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    captureCtxRef.current?.close();
    captureCtxRef.current = null;
    emit('idle');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { stopTurnRef.current = stopTurn; }, [stopTurn]);

  // After Gemini finishes speaking, auto-listen for a follow-up reply (8 s window)
  const autoResumeRef = useRef<() => void>(() => {});
  const autoResume = useCallback(() => {
    stopTurnRef.current(); // disconnect mic first
    setTimeout(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        activateTurn(8_000);
      }
    }, 400);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { autoResumeRef.current = autoResume; }, [autoResume]);

  // ── Gapless audio playback ────────────────────────────────────────────────

  const scheduleChunk = useCallback((pcm: Int16Array) => {
    const ctx = playCtxRef.current;
    if (!ctx) return;

    emit('speaking');

    const buf  = ctx.createBuffer(1, pcm.length, 24000);
    const data = buf.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) data[i] = pcm[i] / 32768;

    const src  = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);

    const when = Math.max(ctx.currentTime + 0.02, nextTimeRef.current);
    src.start(when);
    nextTimeRef.current = when + buf.duration;

    src.onended = () => {
      if (
        turnCompleteRef.current &&
        playCtxRef.current &&
        nextTimeRef.current <= playCtxRef.current.currentTime + 0.06
      ) {
        turnCompleteRef.current = false;
        const text = lastResponseRef.current.trim();
        if (text.endsWith('?') || text.endsWith('？')) {
          autoResumeRef.current();
        } else {
          stopTurnRef.current();
        }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Interrupt (user speaks while Gemini talks) ────────────────────────────

  const interrupt = useCallback(() => {
    playCtxRef.current?.close();
    playCtxRef.current  = new AudioContext({ sampleRate: 24000 });
    nextTimeRef.current = 0;
    wsRef.current?.send(JSON.stringify({
      clientContent: { turns: [], turnComplete: false },
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Activate a turn: start streaming mic to Gemini ────────────────────────

  const activateTurn = useCallback(async (timeoutMs = 20_000) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (turnActiveRef.current) return;

    // Open mic for this turn (released after turn ends so SpeechRecognition can use it between turns)
    if (!streamRef.current || !captureCtxRef.current) {
      try {
        const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current     = mic;
        captureCtxRef.current = new AudioContext({ sampleRate: 16000 });
      } catch (err) {
        console.error('[GeminiLive] mic open failed', err);
        return;
      }
    }

    turnActiveRef.current   = true;
    turnCompleteRef.current = false;
    lastResponseRef.current = '';
    emit('listening');

    const src  = captureCtxRef.current.createMediaStreamSource(streamRef.current);
    const proc = captureCtxRef.current.createScriptProcessor(4096, 1, 1);
    procRef.current   = proc;
    srcNodeRef.current = src;

    proc.onaudioprocess = (e) => {
      const ws = wsRef.current;
      if (!turnActiveRef.current || ws?.readyState !== WebSocket.OPEN) return;
      ws.send(JSON.stringify({
        realtimeInput: {
          audio: {
            data:     toB64(f32ToI16(e.inputBuffer.getChannelData(0))),
            mimeType: 'audio/pcm;rate=16000',
          },
        },
      }));
    };

    src.connect(proc);
    proc.connect(captureCtxRef.current.destination);

    // Safety: auto-stop after timeout
    setTimeout(() => stopTurnRef.current(), timeoutMs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── WebSocket message handler ─────────────────────────────────────────────

  const onMessageRef = useRef<((ev: MessageEvent) => Promise<void>) | null>(null);
  onMessageRef.current = async (ev: MessageEvent) => {
    let raw: string;
    if (ev.data instanceof Blob) {
      raw = await ev.data.text();
    } else {
      raw = ev.data as string;
    }

    let msg: Record<string, unknown>;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.setupComplete) { return; }

    // ── Function calls (new API: top-level toolCall) ──────────────────────
    if (msg.toolCall) {
      const calls = (msg.toolCall as Record<string, unknown>).functionCalls as Array<{
        id: string; name: string; args: Record<string, unknown>;
      }>;
      for (const fc of (calls ?? [])) {
        if (fc.name === 'control_device') {
          emit('thinking');
          const entity_id = fc.args.entity_id as string;
          const service   = fc.args.service   as string;
          const value     = fc.args.value     as number | undefined;
          onDeviceActionRef.current(entity_id, service, value);

          try {
            const isOn = service === 'turn_on' || service === 'open_cover';
            await fetch(`${BACKEND}/toggle`, {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({ entity_id, state: isOn }),
            });
          } catch { /* best-effort */ }

          wsRef.current?.send(JSON.stringify({
            toolResponse: {
              functionResponses: [{ id: fc.id, response: { result: 'success' } }],
            },
          }));
        }

        if (fc.name === 'get_weather') {
          emit('thinking');
          const city    = fc.args.city as string | undefined;
          const weather = await fetchWeather(city);
          wsRef.current?.send(JSON.stringify({
            toolResponse: {
              functionResponses: [{ id: fc.id, response: weather }],
            },
          }));
        }

        if (fc.name === 'get_current_time') {
          const now   = new Date();
          const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Jerusalem',
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false,
          }).formatToParts(now);
          const p = Object.fromEntries(parts.filter(x => x.type !== 'literal').map(x => [x.type, x.value]));
          const datetime = `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second} (Asia/Jerusalem)`;
          console.log('[GeminiLive] get_current_time →', datetime);
          wsRef.current?.send(JSON.stringify({
            toolResponse: {
              functionResponses: [{ id: fc.id, response: { datetime } }],
            },
          }));
        }
      }
      return;
    }

    const content = msg.serverContent as Record<string, unknown> | undefined;
    if (!content) return;

    if (content.interrupted) { interrupt(); return; }

    // Collect output transcription to detect questions
    const outTx = (content.outputTranscription as Record<string, unknown> | undefined)?.text;
    if (typeof outTx === 'string') lastResponseRef.current += outTx;

    if (content.turnComplete) {
      turnCompleteRef.current = true;
      // If no audio was queued (e.g. text-only turn), decide immediately
      if (!playCtxRef.current || nextTimeRef.current <= playCtxRef.current.currentTime + 0.06) {
        turnCompleteRef.current = false;
        const text = lastResponseRef.current.trim();
        if (text.endsWith('?') || text.endsWith('？')) {
          autoResumeRef.current();
        } else {
          stopTurnRef.current();
        }
      }
    }

    const parts =
      ((content.modelTurn as Record<string, unknown>)?.parts as unknown[]) ?? [];

    for (const rawPart of parts) {
      const part = rawPart as Record<string, unknown>;

      const inl = part.inlineData as { mimeType?: string; data: string } | undefined;
      if (inl?.mimeType?.startsWith('audio/')) scheduleChunk(b64ToI16(inl.data));

      if (typeof part.text === 'string') onTranscriptRef.current?.(part.text);
    }
  };

  // ── Connect: open WebSocket + mic (don't start streaming yet) ────────────

  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const key = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!key) { console.error('[GeminiLive] NEXT_PUBLIC_GEMINI_API_KEY is not set'); return; }

    const ws = new WebSocket(`${WS_BASE}?key=${key}`);
    wsRef.current = ws;

    ws.onopen = () => {
      const deviceCtx = devices
        .map(d => `- ${d.friendly_name} (${d.entity_id}) מצב: ${d.state}`)
        .join('\n');

      const now = new Date();
      const ilTime = now.toLocaleString('he-IL', {
        timeZone: 'Asia/Jerusalem',
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });

      ws.send(JSON.stringify({
        setup: {
          model: MODEL,
          systemInstruction: {
            parts: [{
              text: [
                'אתה אלברט — עוזר בית חכם ועוזר אישי חכם. ענה תמיד בעברית.',
                'לשאלות על השעה, התאריך, היום בשבוע — חובה לקרוא ל-get_current_time. אל תנחש את השעה מהידע שלך.',
                'יש לך גישה לחיפוש Google — השתמש בו לשאלות על חדשות, מחירים, עובדות עדכניות, ספורט וכל מידע שאינך בטוח בו.',
                'למזג אוויר: העדף את get_weather שמחזיר נתונים מדויקים בזמן אמת.',
                'לשליטה במכשיר: קרא ל-control_device ואמר משפט קצר אחד בלבד.',
                'ענה תמיד בצורה טבעית וקצרה — עד 2-3 משפטים.',
                `מכשירים זמינים:\n${deviceCtx}`,
              ].join('\n'),
            }],
          },
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Algenib' } },
            },
          },
          outputAudioTranscription: {},
          tools: [
            { googleSearch: {} },
            { functionDeclarations: [
              {
                name:        'control_device',
                description: 'הפעל, כבה, פתח, סגור, או שנה טמפרטורת מכשיר בבית',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    entity_id: { type: 'STRING', description: 'מזהה המכשיר מהרשימה' },
                    service: {
                      type: 'STRING',
                      enum: ['turn_on', 'turn_off', 'open_cover', 'close_cover', 'set_temperature'],
                    },
                    value: { type: 'NUMBER', description: 'מעלות צלזיוס (רק עם set_temperature)' },
                  },
                  required: ['entity_id', 'service'],
                },
              },
              {
                name:        'get_weather',
                description: 'קבל מידע על מזג האוויר הנוכחי',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    city: { type: 'STRING', description: 'שם העיר — אם לא צוין, ישתמש במיקום הנוכחי' },
                  },
                  required: [],
                },
              },
              {
                name:        'get_current_time',
                description: 'קבל את השעה והתאריך המדויקים הנוכחיים בישראל',
                parameters:  { type: 'OBJECT', properties: {}, required: [] },
              },
            ],
          }],
        },
      }));

      setConnected(true);
    };

    ws.onmessage = (ev) => onMessageRef.current?.(ev);
    ws.onclose   = (ev) => { if (ev.code !== 1000) console.error('[GeminiLive] closed unexpectedly', ev.code, ev.reason); setConnected(false); emit('idle'); };
    ws.onerror   = (ev) => { console.error('[GeminiLive] error', ev); setConnected(false); emit('idle'); };

    // Mic opens lazily in activateTurn() so SpeechRecognition keeps mic access between turns
    playCtxRef.current = new AudioContext({ sampleRate: 24000 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices]);

  // ── Disconnect ────────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    stopTurnRef.current();
    streamRef.current?.getTracks().forEach(t => t.stop());
    captureCtxRef.current?.close();
    playCtxRef.current?.close();
    wsRef.current?.close();
    wsRef.current       = null;
    nextTimeRef.current = 0;
    setConnected(false);
    emit('idle');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Send text (Quick Commands) ────────────────────────────────────────────

  const sendText = useCallback((text: string) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({
      clientContent: {
        turns: [{ role: 'user', parts: [{ text }] }],
        turnComplete: true,
      },
    }));
  }, []);

  return { connected, connect, disconnect, activateTurn, interrupt, sendText };
}
