'use client';

import { useCallback, useEffect, useState } from 'react';
import { speak, stopSpeaking, getBestHebrewVoice } from '@/lib/speech';

interface UseSpeechSynthesisOptions {
  onStart?: () => void;
  onEnd?: () => void;
}

export function useSpeechSynthesis({ onStart, onEnd }: UseSpeechSynthesisOptions = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasHebrewVoice, setHasHebrewVoice] = useState(false);

  useEffect(() => {
    const check = () => setHasHebrewVoice(!!getBestHebrewVoice());
    check();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = check;
    }
  }, []);

  const sayText = useCallback(
    (text: string) => {
      setIsSpeaking(true);
      onStart?.();
      speak(
        text,
        () => { setIsSpeaking(true); },
        () => { setIsSpeaking(false); onEnd?.(); },
      );
    },
    [onStart, onEnd],
  );

  const stop = useCallback(() => {
    stopSpeaking();
    setIsSpeaking(false);
    onEnd?.();
  }, [onEnd]);

  return { isSpeaking, hasHebrewVoice, sayText, stop };
}
