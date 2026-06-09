'use client';

import { useRef, useCallback } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VADInstance = any;

export function useAudioRecorder() {
  const vadRef     = useRef<VADInstance>(null);
  const resolveRef = useRef<((t: string) => void) | null>(null);
  const rejectRef  = useRef<((e: unknown) => void) | null>(null);

  // Dynamic import keeps onnxruntime-web out of the SSR bundle
  const getVAD = useCallback(async (): Promise<VADInstance> => {
    if (vadRef.current) return vadRef.current;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { MicVAD, utils } = await import('@ricky0123/vad-web') as any;

    const vad = await MicVAD.new({
      workletURL:              '/vad.worklet.bundle.min.js',
      modelURL:                '/silero_vad_v5.onnx',
      positiveSpeechThreshold: 0.5,
      negativeSpeechThreshold: 0.35,
      redemptionFrames:        30,  // ~1 s of silence before ending (32 ms/frame)
      minSpeechFrames:         5,   // ignore sub-150ms audio blips
      preSpeechPadFrames:      5,
      startOnLoad:             false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ortConfig: (ort: any) => {
        ort.env.wasm.numThreads = 1;
        ort.env.wasm.wasmPaths  = '/';
      },
      onSpeechEnd: async (audio: Float32Array) => {
        if (!resolveRef.current) return;
        const resolve_ = resolveRef.current;
        resolveRef.current = null;
        rejectRef.current  = null;

        vadRef.current?.pause();

        try {
          const wav  = utils.encodeWAV(audio);
          const blob = new Blob([wav], { type: 'audio/wav' });
          const form = new FormData();
          form.append('file', blob, 'audio.wav');

          const res  = await fetch(`${BACKEND_URL}/transcribe`, { method: 'POST', body: form });
          if (!res.ok) throw new Error(`transcribe ${res.status}`);
          const data = await res.json() as { transcript?: string };
          resolve_((data.transcript ?? '').trim());
        } catch (err) {
          rejectRef.current?.(err);
        }
      },
    });

    vadRef.current = vad;
    return vad;
  }, []);

  const startRecording = useCallback((): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      resolveRef.current = resolve;
      rejectRef.current  = reject;
      try {
        const vad = await getVAD();
        // Short delay so the tail of the wake word doesn't trigger immediate end
        await new Promise((r) => setTimeout(r, 300));
        await vad.start();
      } catch (err) {
        resolveRef.current = null;
        rejectRef.current  = null;
        reject(err);
      }
    });
  }, [getVAD]);

  const stopRecording = useCallback(() => {
    if (resolveRef.current) {
      resolveRef.current('');
      resolveRef.current = null;
      rejectRef.current  = null;
    }
    vadRef.current?.pause();
  }, []);

  return { startRecording, stopRecording };
}
