'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { DevicePanel } from '@/components/DevicePanel';
import { QuickCommands } from '@/components/QuickCommands';
import { TimeDisplay } from '@/components/TimeDisplay';
import dynamic from 'next/dynamic';
const AudioVisualizer = dynamic(
  () => import('@/components/AudioVisualizer').then((m) => m.AudioVisualizer),
  { ssr: false },
);
const ParticleBackground = dynamic(
  () => import('@/components/ParticleBackground').then((m) => m.ParticleBackground),
  { ssr: false },
);
import { useAvatarState } from '@/hooks/useAvatarState';
import { useGeminiLive, type LiveState } from '@/hooks/useGeminiLive';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { fetchDevices, toggleDevice } from '@/lib/avatar-api';
import { type Device } from '@/lib/devices';

export default function HomePage() {
  const avatarState = useAvatarState();
  const [devices, setDevices] = useState<Device[]>([]);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    const orig = console.log.bind(console);
    console.log = (...args: unknown[]) => {
      orig(...args);
      const msg = args.map(String).join(' ');
      if (msg.startsWith('[STT]') || msg.startsWith('[GeminiLive]')) {
        setDebugLogs((prev) => [...prev.slice(-30), msg]);
      }
    };
    return () => { console.log = orig; };
  }, []);

  useEffect(() => {
    fetchDevices().then((real) => { if (real.length > 0) setDevices(real); });
  }, []);

  // ── Device action from Gemini function call ───────────────────────────────
  const handleDeviceAction = useCallback((entity_id: string, _service: string) => {
    const isOn = _service === 'turn_on' || _service === 'open_cover';
    setDevices((prev) => prev.map((d) => d.id === entity_id ? { ...d, isOn } : d));
  }, []);

  // ── Avatar state bridge ───────────────────────────────────────────────────
  const pauseRef   = useRef<() => void>(() => {});
  const resumeRef  = useRef<() => void>(() => {});

  const handleStateChange = useCallback((s: LiveState) => {
    if (s === 'idle')           { avatarState.setIdle();      resumeRef.current(); }
    else if (s === 'listening') { avatarState.setListening(); }
    else if (s === 'thinking')  { avatarState.setThinking();  }
    else if (s === 'speaking')  { avatarState.setSpeaking(''); pauseRef.current(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Gemini Live hook ──────────────────────────────────────────────────────
  const { connected, connect, disconnect, activateTurn, sendText } = useGeminiLive({
    devices: devices.map((d) => ({
      entity_id:     d.id,
      friendly_name: d.name,
      state:         d.isOn ? 'on' : 'off',
    })),
    onStateChange:  handleStateChange,
    onTranscript:   avatarState.setTranscript,
    onDeviceAction: handleDeviceAction,
  });

  // ── Wake word detection (browser SpeechRecognition, no token cost) ────────
  const { isSupported, startListening, stopListening, pauseForSpeaking, resumeAfterSpeaking } =
    useSpeechRecognition({
      onWakeWord: () => {
        if (connected) activateTurn();
      },
      onCommandReady:      () => {},   // Gemini handles commands, not us
      onInterimTranscript: () => {},
    });

  // Wire pause/resume into the state bridge
  useEffect(() => { pauseRef.current  = pauseForSpeaking;    }, [pauseForSpeaking]);
  useEffect(() => { resumeRef.current = resumeAfterSpeaking; }, [resumeAfterSpeaking]);

  // Start wake word listening when connected, stop when disconnected
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted) return;
    if (connected && isSupported) startListening();
    else stopListening();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, connected, isSupported]);

  // ── Connect / disconnect ──────────────────────────────────────────────────
  const handleConnect = async () => {
    await connect();
  };

  const handleDisconnect = () => {
    stopListening();
    disconnect();
  };

  // ── Orb tap: connect on first tap, activate turn if already connected ─────
  const handleOrbTap = () => {
    if (!connected) {
      handleConnect();
    } else if (avatarState.state === 'idle') {
      activateTurn();
    }
  };

  // ── Manual device toggle ──────────────────────────────────────────────────
  const handleDeviceToggle = useCallback((id: string) => {
    const device = devices.find((d) => d.id === id);
    if (!device) return;
    const newState = !device.isOn;
    setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, isOn: newState } : d)));
    toggleDevice(id, newState);
  }, [devices]);

  // ── Quick command ─────────────────────────────────────────────────────────
  const handleQuickCommand = useCallback((text: string) => {
    if (!connected) return;
    sendText(text);
  }, [connected, sendText]);

  const isBusy = avatarState.state !== 'idle';

  return (
    <main
      className="relative w-full h-full flex flex-col overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at center, #0a0a14 0%, #050510 100%)',
        minHeight: '100dvh',
      }}
    >
      <ParticleBackground />

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="relative z-20 flex items-start justify-between px-6 pt-5 pb-2">
        <TimeDisplay />
        <div className="flex items-center gap-3">
          {connected && (
            <button
              onClick={handleDisconnect}
              title="נתק"
              className="w-9 h-9 rounded-full flex items-center justify-center text-lg
                border transition-all duration-150 active:scale-90
                bg-red-500/25 border-red-400/50 text-red-300 hover:bg-red-500/35"
            >
              ✕
            </button>
          )}
          <DevicePanel devices={devices} onToggle={handleDeviceToggle} />
        </div>
      </header>

      {/* ── Centre ──────────────────────────────────────────────────────── */}
      <section className="relative z-10 flex-1 flex items-center justify-center">
        <div className="relative flex items-center justify-center">
          <AudioVisualizer state={avatarState.state} />
          <div
            className="relative cursor-pointer"
            onClick={handleOrbTap}
            role="button"
            aria-label="חבר לאלברט"
          >
            <Avatar state={avatarState.state} transcript={avatarState.transcript} />
          </div>
        </div>
      </section>

      {/* ── Connect prompt ───────────────────────────────────────────────── */}
      {!connected && (
        <div className="relative z-10 flex flex-col items-center gap-3 pb-4">
          <button
            onClick={handleConnect}
            className="px-8 py-3 rounded-full text-base font-medium
              bg-indigo-500/20 border border-indigo-400/30 text-indigo-300
              hover:bg-indigo-500/30 active:scale-95 transition-all duration-150"
          >
            🎤 התחבר לאלברט
          </button>
          <p className="text-xs text-white/30">אמור &quot;אלברט&quot; כדי להתחיל</p>
        </div>
      )}

      {/* ── Hints ───────────────────────────────────────────────────────── */}
      {connected && avatarState.state === 'idle' && (
        <div className="relative z-10 text-center pb-2">
          <p className="text-xs text-white/20">אמור &quot;אלברט&quot; — או לחץ על הגלגל</p>
        </div>
      )}

      {/* Last response banner */}
      {avatarState.lastResponse && avatarState.state !== 'idle' && (
        <div className="relative z-10 mx-auto mb-2 px-6 py-2 max-w-sm text-center">
          <p className="text-sm text-white/60">{avatarState.lastResponse}</p>
        </div>
      )}

      {/* ── Quick commands ───────────────────────────────────────────────── */}
      <footer className="relative z-10">
        <QuickCommands onCommand={handleQuickCommand} disabled={isBusy || !connected} />
      </footer>

      {/* ── Debug panel (tap 3× on title to toggle) ─────────────────────── */}
      <button
        onClick={() => setShowDebug((v) => !v)}
        className="fixed bottom-2 left-2 z-50 text-[10px] text-white/20 px-1"
      >
        dbg
      </button>
      {showDebug && (
        <div className="fixed inset-x-2 bottom-8 z-50 max-h-48 overflow-y-auto
          bg-black/80 rounded-xl p-2 text-[10px] text-green-300 font-mono space-y-0.5">
          <div className="text-white/50 mb-1">isSupported={String(isSupported)} connected={String(connected)}</div>
          {debugLogs.length === 0 && <div className="text-white/30">אין לוגים עדיין</div>}
          {debugLogs.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
    </main>
  );
}
