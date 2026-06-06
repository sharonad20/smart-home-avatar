'use client';

import { useState, useCallback, useRef } from 'react';

export type AvatarState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface AvatarStateManager {
  state: AvatarState;
  transcript: string;
  lastResponse: string;
  setIdle: () => void;
  setListening: () => void;
  setThinking: () => void;
  setSpeaking: (response: string) => void;
  setTranscript: (t: string) => void;
}

export function useAvatarState(): AvatarStateManager {
  const [state, setState] = useState<AvatarState>('idle');
  const [transcript, setTranscriptState] = useState('');
  const [lastResponse, setLastResponse] = useState('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimeout_ = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const setIdle = useCallback(() => {
    clearTimeout_();
    setState('idle');
  }, []);

  const setListening = useCallback(() => {
    clearTimeout_();
    setState('listening');
    setTranscriptState('');
    // Safety timeout — revert to idle after 15s of silence
    timeoutRef.current = setTimeout(() => setState('idle'), 15_000);
  }, []);

  const setThinking = useCallback(() => {
    clearTimeout_();
    setState('thinking');
  }, []);

  const setSpeaking = useCallback((response: string) => {
    clearTimeout_();
    setLastResponse(response);
    setState('speaking');
  }, []);

  const setTranscript = useCallback((t: string) => {
    setTranscriptState(t);
  }, []);

  return { state, transcript, lastResponse, setIdle, setListening, setThinking, setSpeaking, setTranscript };
}
