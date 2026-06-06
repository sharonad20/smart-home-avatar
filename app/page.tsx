'use client';

import { useCallback, useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { AudioVisualizer } from '@/components/AudioVisualizer';
import { DevicePanel } from '@/components/DevicePanel';
import { QuickCommands } from '@/components/QuickCommands';
import { TimeDisplay } from '@/components/TimeDisplay';
import { ParticleBackground } from '@/components/ParticleBackground';
import { useAvatarState } from '@/hooks/useAvatarState';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { processCommand } from '@/lib/avatar-api';
import { initialDevices, type Device } from '@/lib/devices';
import type { Action } from '@/lib/avatar-api';

export default function HomePage() {
  const avatarState = useAvatarState();
  const [devices, setDevices] = useState<Device[]>(initialDevices);
  const [micStarted, setMicStarted] = useState(false);
  const [micError, setMicError] = useState(false);

  // ── Command pipeline ──────────────────────────────────────────────────────
  const handleCommandReady = useCallback(
    async (transcript: string) => {
      if (!transcript.trim()) {
        avatarState.setIdle();
        return;
      }

      avatarState.setThinking();

      let response: { responseText: string; actions: Action[] };
      try {
        response = await processCommand(transcript);
      } catch {
        response = { responseText: 'מצטער, אירעה שגיאה. נסה שוב.', actions: [] };
      }

      // Apply device actions
      setDevices((prev) => {
        let next = [...prev];
        for (const action of response.actions) {
          if (action.type === 'toggle_device' && action.deviceId !== undefined) {
            next = next.map((d) =>
              d.id === action.deviceId ? { ...d, isOn: action.state ?? !d.isOn } : d,
            );
          }
        }
        return next;
      });

      avatarState.setSpeaking(response.responseText);
      sayText(response.responseText);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [avatarState],
  );

  // ── TTS ───────────────────────────────────────────────────────────────────
  const { sayText } = useSpeechSynthesis({
    onEnd: () => avatarState.setIdle(),
  });

  // ── STT ───────────────────────────────────────────────────────────────────
  const { isSupported, startListening, stopListening, triggerCommandMode } =
    useSpeechRecognition({
      onWakeWord: () => avatarState.setListening(),
      onCommandReady: handleCommandReady,
      onInterimTranscript: avatarState.setTranscript,
    });

  // ── Mic init ──────────────────────────────────────────────────────────────
  const handleStartMic = () => {
    if (!isSupported) {
      setMicError(true);
      return;
    }
    startListening();
    setMicStarted(true);
  };

  // ── Quick command button ──────────────────────────────────────────────────
  const handleQuickCommand = useCallback(
    (transcript: string) => {
      if (avatarState.state !== 'idle') return;
      avatarState.setListening();
      avatarState.setTranscript(transcript);
      setTimeout(() => handleCommandReady(transcript), 400);
    },
    [avatarState, handleCommandReady],
  );

  // ── Orb tap (manual trigger) ──────────────────────────────────────────────
  const handleOrbTap = () => {
    if (avatarState.state === 'idle') {
      avatarState.setListening();
      if (!micStarted) {
        handleStartMic();
      } else {
        triggerCommandMode();
      }
    } else if (avatarState.state === 'speaking') {
      stopListening();
      avatarState.setIdle();
    }
  };

  // ── Device toggle ─────────────────────────────────────────────────────────
  const handleDeviceToggle = (id: string) => {
    setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, isOn: !d.isOn } : d)));
  };

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
      <header className="relative z-10 flex items-start justify-between px-6 pt-5 pb-2">
        <TimeDisplay />

        <div className="flex items-center gap-3">
          <DevicePanel devices={devices} onToggle={handleDeviceToggle} />
        </div>
      </header>

      {/* ── Centre ──────────────────────────────────────────────────────── */}
      <section className="relative z-10 flex-1 flex items-center justify-center">
        {/* Visualizer ring sits behind avatar */}
        <div className="relative flex items-center justify-center">
          <AudioVisualizer state={avatarState.state} />
          <div
            className="relative cursor-pointer"
            onClick={handleOrbTap}
            role="button"
            aria-label="הפעל מאזין"
          >
            <Avatar state={avatarState.state} transcript={avatarState.transcript} />
          </div>
        </div>
      </section>

      {/* ── Mic start prompt (first launch) ─────────────────────────────── */}
      {!micStarted && (
        <div className="relative z-10 flex flex-col items-center gap-3 pb-4">
          <button
            onClick={handleStartMic}
            className="px-8 py-3 rounded-full text-base font-medium
              bg-indigo-500/20 border border-indigo-400/30 text-indigo-300
              hover:bg-indigo-500/30 active:scale-95
              transition-all duration-150"
          >
            {micError ? '⚠️ אין גישה למיקרופון — השתמש בכפתורים' : '🎤 הפעל האזנה'}
          </button>
          {!micError && (
            <p className="text-xs text-white/30">
              אמור &quot;היי בית&quot; כדי להתחיל
            </p>
          )}
        </div>
      )}

      {/* Wake word hint when mic is active and idle */}
      {micStarted && avatarState.state === 'idle' && (
        <div className="relative z-10 text-center pb-2">
          <p className="text-xs text-white/20">אמור &quot;היי בית&quot; — או לחץ על הגלגל</p>
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
        <QuickCommands onCommand={handleQuickCommand} disabled={isBusy} />
      </footer>
    </main>
  );
}
