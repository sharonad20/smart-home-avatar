'use client';

export const WAKE_WORDS = [
  'אלברט', 'albert', 'hey albert', 'הי אלברט', 'היי אלברט',
  'albrt', 'albart', 'alberta', 'elbert', 'hal bert',
];

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

// Prefer a male Hebrew voice for the Einstein character.
// Male voices are sometimes labelled "Male", "David", "Moshe", or similar.
// Falls back to local, then any Hebrew voice.
export function getBestHebrewVoice(): SpeechSynthesisVoice | null {
  if (cachedHebrewVoice) return cachedHebrewVoice;

  const voices = window.speechSynthesis.getVoices();
  const hebrew = voices.filter(
    (v) => v.lang.startsWith('he') || v.lang.startsWith('iw'),
  );

  // Prefer Microsoft Edge neural voices first (best quality, free in Edge browser)
  const edgeNeural = hebrew.find((v) => v.name.toLowerCase().includes('avri'));
  const edgeFallback = hebrew.find((v) =>
    ['online', 'natural', 'neural'].some((n) => v.name.toLowerCase().includes(n)),
  );
  const maleNames = ['male', 'david', 'moshe', 'yossi', 'man', 'guy', 'avri'];
  const male = hebrew.find((v) =>
    maleNames.some((n) => v.name.toLowerCase().includes(n)),
  );
  const local = hebrew.find((v) => v.localService);

  cachedHebrewVoice = edgeNeural ?? edgeFallback ?? male ?? local ?? hebrew[0] ?? null;
  return cachedHebrewVoice;
}

// Einstein speaks slower and deeper than a default TTS voice:
//   rate  0.80 → measured, deliberate (like a professor thinking aloud)
//   pitch 0.72 → lower register (mature male voice)
const EINSTEIN_RATE  = 0.80;
const EINSTEIN_PITCH = 0.72;

export function speak(
  text: string,
  onStart?: () => void,
  onEnd?: () => void,
  rate  = EINSTEIN_RATE,
  pitch = EINSTEIN_PITCH,
): SpeechSynthesisUtterance {
  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang  = 'he-IL';
  utter.rate  = rate;
  utter.pitch = pitch;

  const voice = getBestHebrewVoice();
  if (voice) utter.voice = voice;

  utter.onstart = onStart ?? null;
  utter.onend   = onEnd   ?? null;
  utter.onerror = onEnd   ?? null;

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
