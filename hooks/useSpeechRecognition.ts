'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { containsWakeWord, stripWakeWord } from '@/lib/speech';

export type RecognitionMode = 'wake' | 'command';

interface UseSpeechRecognitionOptions {
  onWakeWord: () => void;
  onCommandReady: (transcript: string) => void;
  onInterimTranscript: (t: string) => void;
}

export function useSpeechRecognition({
  onWakeWord,
  onCommandReady,
  onInterimTranscript,
}: UseSpeechRecognitionOptions) {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const modeRef = useRef<RecognitionMode>('wake');
  const isActiveRef = useRef(false);
  const [isSupported, setIsSupported] = useState(true);
  const [isListeningForWake, setIsListeningForWake] = useState(false);
  const commandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopCommandTimer = () => {
    if (commandTimerRef.current) clearTimeout(commandTimerRef.current);
  };

  type SpeechRecognitionCtor = { new (): SpeechRecognition };

  const createRecognition = useCallback((): SpeechRecognition | null => {
    type AnyWindow = { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
    const win = window as unknown as AnyWindow;
    const Ctor = win.SpeechRecognition ?? win.webkitSpeechRecognition;

    if (!Ctor) return null;

    const r = new Ctor();
    r.lang = 'he-IL';
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;
    return r;
  }, []);

  const startRecognition = useCallback(() => {
    if (!isActiveRef.current) return;
    try {
      recognitionRef.current?.start();
    } catch {
      // Already started — ignore
    }
  }, []);

  const switchToCommandMode = useCallback(() => {
    modeRef.current = 'command';
    stopCommandTimer();
    // Auto-finalize after 8s in case onend doesn't fire
    commandTimerRef.current = setTimeout(() => {
      if (modeRef.current === 'command') {
        modeRef.current = 'wake';
      }
    }, 8_000);
  }, []);

  useEffect(() => {
    const r = createRecognition();
    if (!r) {
      setIsSupported(false);
      return;
    }

    recognitionRef.current = r;

    r.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += text;
        } else {
          interim += text;
        }
      }

      if (modeRef.current === 'wake') {
        const combined = (interim + final).trim();
        onInterimTranscript('');
        if (containsWakeWord(combined)) {
          const rest = stripWakeWord(combined);
          if (rest.length > 2) {
            // Wake word + command in one utterance
            switchToCommandMode();
            stopCommandTimer();
            modeRef.current = 'wake';
            onWakeWord();
            onCommandReady(rest);
          } else {
            switchToCommandMode();
            onWakeWord();
          }
        }
      } else {
        // Command mode
        const full = (interim + final).trim();
        const stripped = stripWakeWord(full);
        onInterimTranscript(stripped || full);

        if (final) {
          stopCommandTimer();
          modeRef.current = 'wake';
          onCommandReady(stripWakeWord(final) || final);
        }
      }
    };

    r.onend = () => {
      if (isActiveRef.current) {
        // Auto-restart for continuous listening
        setTimeout(startRecognition, 200);
      }
    };

    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setIsSupported(false);
        isActiveRef.current = false;
        setIsListeningForWake(false);
      }
      // network/no-speech errors are recoverable — onend will restart
    };

    return () => {
      isActiveRef.current = false;
      r.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    isActiveRef.current = true;
    modeRef.current = 'wake';
    setIsListeningForWake(true);
    startRecognition();
  }, [startRecognition]);

  const stopListening = useCallback(() => {
    isActiveRef.current = false;
    modeRef.current = 'wake';
    setIsListeningForWake(false);
    recognitionRef.current?.abort();
  }, []);

  const triggerCommandMode = useCallback(() => {
    switchToCommandMode();
  }, [switchToCommandMode]);

  return { isSupported, isListeningForWake, startListening, stopListening, triggerCommandMode };
}
