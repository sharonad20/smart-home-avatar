'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { containsWakeWord, stripWakeWord } from '@/lib/speech';

export type RecognitionMode = 'wake' | 'command';

interface UseSpeechRecognitionOptions {
  onWakeWord: () => void;
  onCommandReady: (transcript: string) => void;
  onInterimTranscript: (t: string) => void;
  onReadyToRecord?: () => void;  // when set: Groq mode — abort STT and let caller record
}

// Wait this long after the last speech segment before sending the command.
// Prevents sending partial sentences when Chrome splits Hebrew into segments.
const COMMAND_DEBOUNCE_MS = 500;

export function useSpeechRecognition({
  onWakeWord,
  onCommandReady,
  onInterimTranscript,
  onReadyToRecord,
}: UseSpeechRecognitionOptions) {
  const recognitionRef   = useRef<SpeechRecognition | null>(null);
  const modeRef          = useRef<RecognitionMode>('wake');
  const isActiveRef      = useRef(false);
  const isSpeakingRef    = useRef(false);
  // Blocks STT results from the moment a command fires until resumeAfterSpeaking is called.
  // Prevents the recognition window between command dispatch and TTS start from producing extras.
  const isProcessingRef  = useRef(false);
  const commandTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accumulatedRef   = useRef('');

  // Callback refs — the recognition useEffect runs once, but parent callbacks
  // can change between renders (e.g. when devices update after a command).
  // Always calling .current ensures we invoke the latest version.
  const onWakeWordRef          = useRef(onWakeWord);
  const onCommandReadyRef      = useRef(onCommandReady);
  const onInterimTranscriptRef = useRef(onInterimTranscript);
  const onReadyToRecordRef     = useRef(onReadyToRecord);
  useEffect(() => { onWakeWordRef.current          = onWakeWord;          }, [onWakeWord]);
  useEffect(() => { onCommandReadyRef.current      = onCommandReady;      }, [onCommandReady]);
  useEffect(() => { onInterimTranscriptRef.current = onInterimTranscript; }, [onInterimTranscript]);
  useEffect(() => { onReadyToRecordRef.current     = onReadyToRecord;     }, [onReadyToRecord]);

  const [isSupported,        setIsSupported]        = useState(true);
  const [isListeningForWake, setIsListeningForWake] = useState(false);

  // Helpers — only touch refs so safe to call from any closure
  const clearCommandTimer = useCallback(() => {
    if (commandTimerRef.current) { clearTimeout(commandTimerRef.current); commandTimerRef.current = null; }
  }, []);
  const clearDebounce = useCallback(() => {
    if (debounceTimerRef.current) { clearTimeout(debounceTimerRef.current); debounceTimerRef.current = null; }
  }, []);

  type SpeechRecognitionCtor = { new (): SpeechRecognition };

  const createRecognition = useCallback((): SpeechRecognition | null => {
    type AnyWindow = { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
    const win = window as unknown as AnyWindow;
    const Ctor = win.SpeechRecognition ?? win.webkitSpeechRecognition;
    if (!Ctor) return null;

    const r = new Ctor();
    r.lang            = 'he-IL';
    r.continuous      = true;
    r.interimResults  = true;
    r.maxAlternatives = 1;
    return r;
  }, []);

  const startRecognition = useCallback(() => {
    if (!isActiveRef.current) return;
    try { recognitionRef.current?.start(); } catch { /* already started */ }
  }, []);

  const enterCommandMode = useCallback(() => {
    modeRef.current        = 'command';
    accumulatedRef.current = '';
    clearDebounce();
    clearCommandTimer();
    // Failsafe: if user says nothing for 6 s, give up and return to wake
    commandTimerRef.current = setTimeout(() => {
      if (modeRef.current === 'command') {
        accumulatedRef.current = '';
        modeRef.current        = 'wake';
        onInterimTranscriptRef.current('');
      }
    }, 6_000);
  }, [clearCommandTimer, clearDebounce]);

  useEffect(() => {
    const r = createRecognition();
    if (!r) { setIsSupported(false); return; }
    recognitionRef.current = r;

    const fireAccumulatedCommand = () => {
      const command = accumulatedRef.current.trim();
      accumulatedRef.current   = '';
      debounceTimerRef.current = null;
      if (!command) return;
      clearCommandTimer();
      modeRef.current           = 'wake';
      isProcessingRef.current   = true;   // block recognition until TTS ends
      onInterimTranscriptRef.current('');
      onCommandReadyRef.current(stripWakeWord(command) || command);
    };

    r.onresult = (event) => {
      if (isSpeakingRef.current || isProcessingRef.current) return;

      let interim = '';
      let final   = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) final   += text;
        else                          interim += text;
      }

      if (modeRef.current === 'wake') {
        onInterimTranscriptRef.current('');
        const combined = (interim + final).trim();
        if (combined) console.log('[STT] heard:', combined);

        if (containsWakeWord(combined)) {
          const rest = stripWakeWord(combined).trim();
          if (rest.length > 2) {
            // Wake word + inline command — Web Speech transcript is sufficient
            clearDebounce();
            clearCommandTimer();
            accumulatedRef.current  = '';
            modeRef.current         = 'wake';
            isProcessingRef.current = true;
            onWakeWordRef.current();
            onCommandReadyRef.current(rest);
          } else if (onReadyToRecordRef.current) {
            // Groq mode: abort STT and let caller record via MediaRecorder
            clearDebounce();
            clearCommandTimer();
            accumulatedRef.current  = '';
            modeRef.current         = 'wake';
            isProcessingRef.current = true;
            recognitionRef.current?.abort();
            onWakeWordRef.current();
            onReadyToRecordRef.current();
          } else {
            enterCommandMode();
            onWakeWordRef.current();
          }
        }
      } else {
        // ── Command mode ─────────────────────────────────────────────────
        if (final) {
          const sep = accumulatedRef.current ? ' ' : '';
          accumulatedRef.current += sep + final.trim();
        }
        const display = (accumulatedRef.current + (interim ? ' ' + interim : '')).trim();
        onInterimTranscriptRef.current(stripWakeWord(display) || display);

        if (final) {
          clearDebounce();
          debounceTimerRef.current = setTimeout(fireAccumulatedCommand, COMMAND_DEBOUNCE_MS);
        }
      }
    };

    r.onend = () => {
      if (isActiveRef.current && !isSpeakingRef.current && !isProcessingRef.current) {
        setTimeout(startRecognition, 150);
      }
    };

    r.onerror = (e) => {
      console.log('[STT] error:', e.error);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setIsSupported(false);
        isActiveRef.current = false;
        setIsListeningForWake(false);
      }
      // network / no-speech / aborted — recoverable, onend will restart
    };

    return () => {
      isActiveRef.current = false;
      r.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    isActiveRef.current     = true;
    isSpeakingRef.current   = false;
    isProcessingRef.current = false;
    modeRef.current         = 'wake';
    accumulatedRef.current  = '';
    clearDebounce();
    clearCommandTimer();
    setIsListeningForWake(true);
    startRecognition();
  }, [clearCommandTimer, clearDebounce, startRecognition]);

  const stopListening = useCallback(() => {
    isActiveRef.current     = false;
    isSpeakingRef.current   = false;
    isProcessingRef.current = false;
    modeRef.current         = 'wake';
    accumulatedRef.current  = '';
    clearDebounce();
    clearCommandTimer();
    setIsListeningForWake(false);
    recognitionRef.current?.abort();
  }, [clearCommandTimer, clearDebounce]);

  const triggerCommandMode = useCallback(() => {
    enterCommandMode();
  }, [enterCommandMode]);

  const pauseForSpeaking = useCallback(() => {
    isSpeakingRef.current  = true;
    modeRef.current        = 'wake';
    accumulatedRef.current = '';
    clearDebounce();
    clearCommandTimer();
    recognitionRef.current?.abort();
  }, [clearCommandTimer, clearDebounce]);

  const resumeAfterSpeaking = useCallback(() => {
    isSpeakingRef.current   = false;
    isProcessingRef.current = false;   // unblock recognition
    if (isActiveRef.current) setTimeout(startRecognition, 500);
  }, [startRecognition]);

  return {
    isSupported,
    isListeningForWake,
    startListening,
    stopListening,
    triggerCommandMode,
    pauseForSpeaking,
    resumeAfterSpeaking,
  };
}
