'use client';

export const WAKE_WORDS = ['היי בית', 'הי בית', 'בית חכם', 'hey bait', 'hey bayit'];

export function containsWakeWord(transcript: string): boolean {
  const lower = transcript.trim().toLowerCase();
  return WAKE_WORDS.some((w) => lower.includes(w.toLowerCase()));
}

export function stripWakeWord(transcript: string): string {
  let result = transcript;
  for (const w of WAKE_WORDS) {
    result = result.replace(new RegExp(w, 'gi'), '').trim();
  }
  return result;
}

// ── TTS helpers ──────────────────────────────────────────────────────────────

let cachedHebrewVoice: SpeechSynthesisVoice | null = null;

export function getBestHebrewVoice(): SpeechSynthesisVoice | null {
  if (cachedHebrewVoice) return cachedHebrewVoice;

  const voices = window.speechSynthesis.getVoices();
  const hebrew = voices.filter(
    (v) => v.lang.startsWith('he') || v.lang.startsWith('iw'),
  );

  // Prefer local voices, then online, then any
  const local = hebrew.find((v) => v.localService);
  cachedHebrewVoice = local ?? hebrew[0] ?? null;
  return cachedHebrewVoice;
}

export function speak(
  text: string,
  onStart?: () => void,
  onEnd?: () => void,
  rate = 0.9,
  pitch = 1,
): SpeechSynthesisUtterance {
  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'he-IL';
  utter.rate = rate;
  utter.pitch = pitch;

  const voice = getBestHebrewVoice();
  if (voice) utter.voice = voice;

  utter.onstart = onStart ?? null;
  utter.onend = onEnd ?? null;
  utter.onerror = onEnd ?? null;

  // Voices may not be loaded yet — retry once
  if (!window.speechSynthesis.getVoices().length) {
    window.speechSynthesis.onvoiceschanged = () => {
      const v = getBestHebrewVoice();
      if (v) utter.voice = v;
      window.speechSynthesis.speak(utter);
    };
  } else {
    window.speechSynthesis.speak(utter);
  }

  return utter;
}

export function stopSpeaking(): void {
  window.speechSynthesis.cancel();
}
