'use client';

import type { AvatarState } from '@/hooks/useAvatarState';

const STATE_LABELS: Record<AvatarState, string> = {
  idle:      'מוכן',
  listening: 'מאזין...',
  thinking:  'חושב...',
  speaking:  'מדבר...',
};

const STATE_COLORS: Record<AvatarState, string> = {
  idle:      '#6366f1',
  listening: '#06b6d4',
  thinking:  '#f59e0b',
  speaking:  '#10b981',
};

interface AvatarProps {
  state: AvatarState;
  transcript?: string;
}

export function Avatar({ state, transcript }: AvatarProps) {
  const color = STATE_COLORS[state];

  return (
    <div className="flex flex-col items-center justify-center gap-4 select-none">
      <div className="relative flex items-center justify-center" style={{ width: 250, height: 310 }}>

        {/* Ambient glow */}
        <div
          className="absolute"
          style={{
            width: 230,
            height: 280,
            borderRadius: '50%',
            background: `radial-gradient(ellipse at center, ${color}26 0%, transparent 68%)`,
            filter: 'blur(30px)',
          }}
        />

        {/* Pulse rings for listening / speaking */}
        {(state === 'listening' || state === 'speaking') && (
          <>
            {[0, 0.55, 1.1].map((delay) => (
              <div
                key={delay}
                className="absolute rounded-full pulse-ring-anim"
                style={{
                  width: 240,
                  height: 240,
                  top: 35,
                  border: `1.5px solid ${color}`,
                  opacity: 0.3,
                  animationDelay: `${delay}s`,
                }}
              />
            ))}
          </>
        )}

        <div
          className={state === 'idle' ? 'orb-idle' : state === 'thinking' ? 'orb-thinking' : ''}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <EinsteinFace state={state} color={color} />
        </div>
      </div>

      <div className="flex flex-col items-center gap-1">
        <span
          className="text-2xl font-medium tracking-widest"
          style={{ color, textShadow: `0 0 14px ${color}88` }}
        >
          {STATE_LABELS[state]}
        </span>
        {transcript && (
          <p className="text-sm text-white/60 text-center max-w-xs leading-relaxed px-4">
            {transcript}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Einstein SVG ─────────────────────────────────────────────────────────────
// Design notes:
//   • The hair is the dominant element — wide, wild, and light against the dark BG
//   • Eyebrows are very dark and thick (opposite of the white hair) — Einstein's most
//     expressive feature besides the hair
//   • Mustache is wide and white, covering the whole upper lip
//   • Face is relatively small so hair gets proper visual weight
//   • Nose is bulbous at the tip with visible nostrils (characteristic)

function EinsteinFace({ state, color }: { state: AvatarState; color: string }) {
  const isListening = state === 'listening';
  const isThinking  = state === 'thinking';
  const isSpeaking  = state === 'speaking';

  // ── Eyebrow paths (dark arched brows, position shifts per state) ──
  const lBrow = isListening
    ? 'M 57 119 Q 73 109 89 115'   // raised — wide-eyed curiosity
    : isThinking
    ? 'M 57 127 Q 73 122 89 126'   // pulled down — concentration
    : 'M 57 123 Q 73 115 89 120';  // relaxed

  const rBrow = isListening
    ? 'M 111 115 Q 127 109 143 119'
    : isThinking
    ? 'M 111 123 Q 127 118 143 125'
    : 'M 111 120 Q 127 115 143 123';

  // ── Eye openness ──
  const eyeRy = isListening ? 12 : isThinking ? 7 : 9;

  // ── Pupil position (thinking = glancing up-left, pensive) ──
  const lpx = isThinking ? 69  : 72;
  const lpy = isThinking ? 133 : 137;
  const rpx = isThinking ? 128 : 128;
  const rpy = isThinking ? 133 : 137;

  // ── Mouth ──
  const mouthSmile   = 'M 82 198 Q 100 208 118 198';
  const mouthNeutral = 'M 85 198 Q 100 203 115 198';

  return (
    <svg viewBox="0 0 200 270" width="210" height="283" xmlns="http://www.w3.org/2000/svg">

      {/* ══ JACKET / BODY ═══════════════════════════��════════════════════ */}
      <ellipse cx="100" cy="268" rx="80" ry="28" fill="#352818"/>
      {/* Sweater neckline — two overlapping strokes for knit look */}
      <path d="M 38 252 Q 100 234 162 252"
        stroke="#503c28" strokeWidth="20" fill="none" strokeLinecap="round"/>
      <path d="M 44 254 Q 100 240 156 254"
        stroke="#3e2e1c" strokeWidth="10" fill="none" strokeLinecap="round" opacity="0.7"/>

      {/* ══ NECK ════════════════════════��═════════════════════════════════ */}
      <rect x="82" y="205" width="36" height="38" rx="10" fill="#dda060"/>

      {/* ══ WILD HAIR ═══════════════════════════════════════════���════════ */}
      {/*
        Strategy: large rotated ellipses create the organic cloud-like volume.
        Side wings extend ~40 px beyond the face; top rises ~85 px above face top.
        Hair is layered — back (darker), mid, front (lightest) — for depth.
      */}

      {/* --- Back layer (darker) --- */}
      <ellipse cx="100" cy="75"  rx="68" ry="70" fill="#d8d4cc"/>
      <ellipse cx="52"  cy="95"  rx="36" ry="58" fill="#d4d0c8" transform="rotate(-18 52 95)"/>
      <ellipse cx="148" cy="95"  rx="36" ry="58" fill="#d4d0c8" transform="rotate(18 148 95)"/>

      {/* --- Mid layer --- */}
      <ellipse cx="100" cy="64"  rx="58" ry="62" fill="#e0ddd6"/>
      <ellipse cx="42"  cy="88"  rx="32" ry="50" fill="#dedad2" transform="rotate(-22 42 88)"/>
      <ellipse cx="158" cy="88"  rx="32" ry="50" fill="#dedad2" transform="rotate(22 158 88)"/>
      {/* Lower side wings — these are Einstein's most distinctive hair feature */}
      <ellipse cx="24"  cy="128" rx="26" ry="40" fill="#d8d5cd" transform="rotate(-8 24 128)"/>
      <ellipse cx="176" cy="128" rx="26" ry="40" fill="#d8d5cd" transform="rotate(8 176 128)"/>

      {/* --- Front/top layer (lightest = most prominent) --- */}
      <ellipse cx="82"  cy="52"  rx="38" ry="44" fill="#eceae4" transform="rotate(-15 82 52)"/>
      <ellipse cx="118" cy="52"  rx="38" ry="44" fill="#eceae4" transform="rotate(15 118 52)"/>
      <ellipse cx="100" cy="44"  rx="42" ry="46" fill="#f0eee8"/>
      {/* Tufts that escape at odd angles (the "wild" part) */}
      <ellipse cx="58"  cy="42"  rx="22" ry="30" fill="#eceae4" transform="rotate(-30 58 42)"/>
      <ellipse cx="142" cy="42"  rx="22" ry="30" fill="#eceae4" transform="rotate(30 142 42)"/>
      <ellipse cx="36"  cy="72"  rx="20" ry="34" fill="#e4e2dc" transform="rotate(-25 36 72)"/>
      <ellipse cx="164" cy="72"  rx="20" ry="34" fill="#e4e2dc" transform="rotate(25 164 72)"/>
      {/* A few errant top wisps */}
      <ellipse cx="88"  cy="26"  rx="18" ry="22" fill="#e8e6e0" transform="rotate(-12 88 26)"/>
      <ellipse cx="112" cy="26"  rx="18" ry="22" fill="#e8e6e0" transform="rotate(12 112 26)"/>
      <ellipse cx="100" cy="20"  rx="16" ry="18" fill="#eceae4"/>

      {/* ══ HEAD / FACE ═══════════════════════════��═══════════════════════ */}
      <ellipse cx="100" cy="158" rx="60" ry="72" fill="#f0c080"/>

      {/* ══ EARS ══════════════════════════════════════════════════════════ */}
      <ellipse cx="40"  cy="162" rx="12" ry="18" fill="#f0c080"/>
      <ellipse cx="160" cy="162" rx="12" ry="18" fill="#f0c080"/>
      {/* Inner ear */}
      <ellipse cx="40"  cy="162" rx="6"  ry="11" fill="#d4904c"/>
      <ellipse cx="160" cy="162" rx="6"  ry="11" fill="#d4904c"/>

      {/* ══ FACE DEPTH / SHADING ══════════════════════════════════════════ */}
      <ellipse cx="100" cy="166" rx="56" ry="62" fill="#d4904c" opacity="0.18"/>
      {/* Temple shadows */}
      <ellipse cx="52"  cy="148" rx="16" ry="32" fill="#c07838" opacity="0.14"/>
      <ellipse cx="148" cy="148" rx="16" ry="32" fill="#c07838" opacity="0.14"/>

      {/* ══ FOREHEAD WRINKLES ═════════════════════════════════════════════ */}
      <path d="M 67 120 Q 100 114 133 120"
        fill="none" stroke="#a86020" strokeWidth="1.3" opacity="0.4"/>
      <path d="M 70 129 Q 100 124 130 129"
        fill="none" stroke="#a86020" strokeWidth="1.1" opacity="0.32"/>
      {/* Frown line between brows */}
      <path d="M 95 133 Q 100 130 105 133"
        fill="none" stroke="#a86020" strokeWidth="1.2" opacity={isThinking ? '0.7' : '0.3'}/>

      {/* ══ NASOLABIAL / CHEEK LINES ══════════════════════════════════════ */}
      <path d="M 52 158 Q 47 172 52 185"
        fill="none" stroke="#a86020" strokeWidth="1.5" opacity="0.38"/>
      <path d="M 148 158 Q 153 172 148 185"
        fill="none" stroke="#a86020" strokeWidth="1.5" opacity="0.38"/>
      <path d="M 67 193 Q 71 200 75 206"
        fill="none" stroke="#9a5818" strokeWidth="1.2" opacity="0.4"/>
      <path d="M 133 193 Q 129 200 125 206"
        fill="none" stroke="#9a5818" strokeWidth="1.2" opacity="0.4"/>

      {/* ══ EYEBROWS ═════════════════════════════════════════════════��════ */}
      {/*
        Very dark (#201008), very thick — the strongest contrast element on the face.
        Two strokes per brow: thick dark base + thinner lighter overlay for hair texture.
      */}
      <path d={lBrow} stroke="#1e1008" strokeWidth="9"   fill="none" strokeLinecap="round"/>
      <path d={lBrow} stroke="#3c2410" strokeWidth="4.5" fill="none" strokeLinecap="round"
        opacity="0.55" strokeDasharray="6 5"/>
      <path d={rBrow} stroke="#1e1008" strokeWidth="9"   fill="none" strokeLinecap="round"/>
      <path d={rBrow} stroke="#3c2410" strokeWidth="4.5" fill="none" strokeLinecap="round"
        opacity="0.55" strokeDasharray="6 5"/>

      {/* ══ UPPER EYELID CREASE (droopy — characteristic for older Einstein) ══ */}
      <path d="M 58 134 Q 72 128 90 134"
        fill="none" stroke="#906028" strokeWidth="2.2" opacity="0.65"/>
      <path d="M 110 134 Q 128 128 142 134"
        fill="none" stroke="#906028" strokeWidth="2.2" opacity="0.65"/>

      {/* ══ EYES ══════════════════════════════════════════════════════════ */}
      {/* Whites */}
      <ellipse cx="72"  cy="141" rx="15" ry={eyeRy} fill="white"/>
      <ellipse cx="128" cy="141" rx="15" ry={eyeRy} fill="white"/>
      {/* Warm brown irises */}
      <circle cx={lpx} cy={lpy} r="9.5" fill="#6a3c14"/>
      <circle cx={rpx} cy={rpy} r="9.5" fill="#6a3c14"/>
      {/* Pupils */}
      <circle cx={lpx} cy={lpy} r="5.8" fill="#140600"/>
      <circle cx={rpx} cy={rpy} r="5.8" fill="#140600"/>
      {/* Specular */}
      <circle cx={lpx - 3} cy={lpy - 3} r="3" fill="white"/>
      <circle cx={rpx - 3} cy={rpy - 3} r="3" fill="white"/>
      {/* Lower lid / eye-bag */}
      <path d="M 58 150 Q 72 156 90 150"
        fill="none" stroke="#9a6030" strokeWidth="1.4" opacity="0.55"/>
      <path d="M 110 150 Q 128 156 142 150"
        fill="none" stroke="#9a6030" strokeWidth="1.4" opacity="0.55"/>

      {/* ══ NOSE ══════════════════════════════════════════════════════════ */}
      {/* Bridge — two lines curving outward toward bulbous tip */}
      <path d="M 95 152 C 92 163 89 172 86 180"
        fill="none" stroke="#a86020" strokeWidth="2.2" opacity="0.55"/>
      <path d="M 105 152 C 108 163 111 172 114 180"
        fill="none" stroke="#a86020" strokeWidth="2.2" opacity="0.55"/>
      {/* Bulbous tip */}
      <ellipse cx="100" cy="183" rx="16" ry="10" fill="#e8a458"/>
      {/* Nostrils */}
      <ellipse cx="89"  cy="184" rx="7" ry="6"  fill="#b86820" opacity="0.68"/>
      <ellipse cx="111" cy="184" rx="7" ry="6"  fill="#b86820" opacity="0.68"/>
      {/* Nostril highlight */}
      <ellipse cx="87"  cy="182" rx="3" ry="2.5" fill="#d08040" opacity="0.5"/>
      <ellipse cx="109" cy="182" rx="3" ry="2.5" fill="#d08040" opacity="0.5"/>

      {/* ══ MUSTACHE ══════════════════════════════════════════════════════ */}
      {/*
        Wide (from x=62 to x=138), thick, white.
        Center-parted, droops slightly at the corners.
        This + the hair are the two things that make it unmistakably Einstein.
      */}
      <path
        d="M 62 192
           C 67 178 84 170 100 174
           C 116 170 133 178 138 192
           C 130 203 114 200 100 197
           C  86 200  70 203  62 192 Z"
        fill="#eeece6" stroke="#d5d2cb" strokeWidth="0.8"/>
      {/* Center part */}
      <path d="M 100 174 L 100 197"
        stroke="#c8c4bc" strokeWidth="2.2" opacity="0.65"/>
      {/* Hair texture lines — left side */}
      <path d="M 72 187 Q 85 181 99 182"
        fill="none" stroke="#c4c0b8" strokeWidth="1.1" opacity="0.75"/>
      <path d="M 67 194 Q 80 190 97 189"
        fill="none" stroke="#c0bdb5" strokeWidth="0.9" opacity="0.6"/>
      {/* Hair texture lines — right side */}
      <path d="M 101 182 Q 115 181 128 187"
        fill="none" stroke="#c4c0b8" strokeWidth="1.1" opacity="0.75"/>
      <path d="M 103 189 Q 120 190 133 194"
        fill="none" stroke="#c0bdb5" strokeWidth="0.9" opacity="0.6"/>

      {/* ══ MOUTH ═════════════════════════════════════════════════��════════ */}
      {isSpeaking ? (
        <>
          {/* Dark interior */}
          <ellipse cx="100" cy="206" rx="18" ry="4" fill="#6c1c08">
            <animate attributeName="ry" values="2;11;2" dur="0.36s" repeatCount="indefinite"/>
          </ellipse>
          {/* Upper teeth */}
          <rect x="87" y="201" width="26" height="5" rx="2.5" fill="#f6f5ec" opacity="0.92"/>
          {/* Lower teeth — moves with jaw */}
          <rect x="88" y="209" width="24" height="4" rx="2" fill="#eeeee5" opacity="0.8">
            <animate attributeName="y" values="209;214;209" dur="0.36s" repeatCount="indefinite"/>
          </rect>
        </>
      ) : (
        <path
          d={isThinking ? mouthNeutral : mouthSmile}
          fill="none" stroke="#9c4020" strokeWidth="2.8" strokeLinecap="round"
        />
      )}

      {/* ══ CHIN ══════════════════════════════════════════════════════════ */}
      <path d="M 96 218 Q 100 222 104 218"
        fill="none" stroke="#a86020" strokeWidth="1.1" opacity="0.45"/>

      {/* ══ THINKING: index finger resting on cheek ════════════════════════ */}
      {isThinking && (
        <g opacity="0.88">
          {/* Forearm coming from lower-left */}
          <rect x="48" y="208" width="18" height="52" rx="9" fill="#dda060"/>
          {/* Hand */}
          <ellipse cx="57" cy="208" rx="16" ry="11" fill="#e8aa68"/>
          {/* Index finger extended upward */}
          <rect x="54" y="178" width="10" height="34" rx="5" fill="#f0b870"/>
          {/* Fingernail */}
          <ellipse cx="59" cy="178" rx="5" ry="3.5" fill="#dc9848"/>
          {/* Knuckle line */}
          <path d="M 54 196 Q 59 193 64 196"
            fill="none" stroke="#c88840" strokeWidth="1" opacity="0.6"/>
        </g>
      )}

      {/* State color accent under collar */}
      <ellipse cx="100" cy="242" rx="48" ry="14" fill={color} opacity="0.16"/>

    </svg>
  );
}
