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
      <div className="relative flex items-center justify-center" style={{ width: 240, height: 295 }}>

        {/* Ambient glow behind figure */}
        <div
          className="absolute"
          style={{
            width: 220,
            height: 270,
            borderRadius: '50%',
            background: `radial-gradient(ellipse at center, ${color}28 0%, transparent 70%)`,
            filter: 'blur(28px)',
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
                  width: 230,
                  height: 230,
                  top: 32,
                  border: `1.5px solid ${color}`,
                  opacity: 0.35,
                  animationDelay: `${delay}s`,
                }}
              />
            ))}
          </>
        )}

        {/* Einstein SVG character */}
        <div
          className={state === 'idle' ? 'orb-idle' : state === 'thinking' ? 'orb-thinking' : ''}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <EinsteinFace state={state} color={color} />
        </div>
      </div>

      {/* State label */}
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

// ─── Einstein SVG Face ────────────────────────────────────────────────────────

function EinsteinFace({ state, color }: { state: AvatarState; color: string }) {
  const isListening = state === 'listening';
  const isThinking  = state === 'thinking';
  const isSpeaking  = state === 'speaking';

  // ── Eyebrow paths per state ──
  const lBrow = isListening
    ? 'M 60 112 Q 75 104 88 109'   // raised — surprised / attentive
    : isThinking
    ? 'M 60 122 Q 75 118 88 121'   // low & furrowed — deep thought
    : 'M 60 118 Q 75 111 88 116';  // relaxed normal

  const rBrow = isListening
    ? 'M 112 109 Q 125 104 140 112'
    : isThinking
    ? 'M 112 118 Q 125 114 140 120'
    : 'M 112 116 Q 125 111 140 118';

  // ── Eye openness ──
  const eyeRy  = isListening ? 11 : isThinking ? 7 : 9;

  // ── Pupil offset when thinking (looking up-left = pensive) ──
  const lpx = isThinking ? 70 : 72;
  const lpy = isThinking ? 131 : 134;
  const rpx = isThinking ? 126 : 128;
  const rpy = isThinking ? 131 : 134;

  // ── Mouth shapes ──
  const mouthSmile   = 'M 84 194 Q 100 203 116 194';
  const mouthNeutral = 'M 87 194 Q 100 199 113 194';
  const mouthOpen1   = 'M 82 191 Q 100 208 118 191';
  const mouthOpen2   = 'M 84 193 Q 100 203 116 193';

  const staticMouth = isThinking ? mouthNeutral : mouthSmile;

  return (
    <svg viewBox="0 0 200 260" width="200" height="260" xmlns="http://www.w3.org/2000/svg">

      {/* ── JACKET / BODY ─────────────────────────────────────────────── */}
      <ellipse cx="100" cy="258" rx="78" ry="30" fill="#3d3020" />
      {/* Sweater neckline */}
      <path d="M 44 242 Q 100 225 156 242"
        stroke="#5a4530" strokeWidth="16" fill="none" strokeLinecap="round"/>
      {/* Sweater texture lines */}
      <path d="M 50 248 Q 100 235 150 248"
        stroke="#4a3828" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.6"/>

      {/* ── NECK ──────────────────────────────────────────────────────── */}
      <rect x="83" y="195" width="34" height="36" rx="9" fill="#e8a860"/>

      {/* ── WILD HAIR (white fluffy clusters) ─────────────────────────── */}
      {/* Top crown */}
      <circle cx="100" cy="50"  r="35" fill="#f3f1ed"/>
      <circle cx="78"  cy="55"  r="30" fill="#f3f1ed"/>
      <circle cx="122" cy="55"  r="30" fill="#f3f1ed"/>
      {/* Extra top puffs for wildness */}
      <circle cx="62"  cy="48"  r="24" fill="#f0eee9"/>
      <circle cx="138" cy="48"  r="24" fill="#f0eee9"/>
      <circle cx="88"  cy="36"  r="22" fill="#f3f1ed"/>
      <circle cx="112" cy="36"  r="22" fill="#f3f1ed"/>
      {/* Left side flyaways */}
      <circle cx="46"  cy="78"  r="28" fill="#eceae5"/>
      <circle cx="36"  cy="105" r="25" fill="#e9e7e2"/>
      <circle cx="32"  cy="130" r="21" fill="#e6e4df"/>
      <circle cx="35"  cy="152" r="17" fill="#e3e1dc"/>
      {/* Right side flyaways */}
      <circle cx="154" cy="78"  r="28" fill="#eceae5"/>
      <circle cx="164" cy="105" r="25" fill="#e9e7e2"/>
      <circle cx="168" cy="130" r="21" fill="#e6e4df"/>
      <circle cx="165" cy="152" r="17" fill="#e3e1dc"/>

      {/* ── HEAD / FACE (drawn over hair base) ────────────────────────── */}
      <ellipse cx="100" cy="152" rx="62" ry="74" fill="#f5c490"/>

      {/* ── EARS ──────────────────────────────────────────────────────── */}
      <ellipse cx="38"  cy="155" rx="12" ry="17" fill="#f5c490"/>
      <ellipse cx="162" cy="155" rx="12" ry="17" fill="#f5c490"/>
      <ellipse cx="38"  cy="155" rx="6"  ry="10" fill="#e0a060"/>
      <ellipse cx="162" cy="155" rx="6"  ry="10" fill="#e0a060"/>

      {/* ── FACE SHADING (depth) ──────────────────────────────────────── */}
      <ellipse cx="100" cy="162" rx="58" ry="62" fill="#e8a860" opacity="0.22"/>
      {/* Temple shadows */}
      <ellipse cx="52"  cy="140" rx="16" ry="28" fill="#d99050" opacity="0.15"/>
      <ellipse cx="148" cy="140" rx="16" ry="28" fill="#d99050" opacity="0.15"/>

      {/* ── FOREHEAD WRINKLES ─────────────────────────────────────────── */}
      <path d="M 70 114 Q 100 110 130 114"
        fill="none" stroke="#c07840" strokeWidth="1.2" opacity="0.45"/>
      <path d="M 73 122 Q 100 118 127 122"
        fill="none" stroke="#c07840" strokeWidth="1"   opacity="0.35"/>

      {/* ── CHEEK & SMILE LINES ───────────────────────────────────────── */}
      <path d="M 50 148 Q 46 162 50 176"
        fill="none" stroke="#c07840" strokeWidth="1.5" opacity="0.4"/>
      <path d="M 150 148 Q 154 162 150 176"
        fill="none" stroke="#c07840" strokeWidth="1.5" opacity="0.4"/>
      {/* Smile folds */}
      <path d="M 68 183 Q 72 190 76 196"
        fill="none" stroke="#c07840" strokeWidth="1.2" opacity="0.4"/>
      <path d="M 132 183 Q 128 190 124 196"
        fill="none" stroke="#c07840" strokeWidth="1.2" opacity="0.4"/>

      {/* ── EYEBROWS (thick dark — his most expressive feature) ───────── */}
      <path d={lBrow}
        stroke="#3a2818" strokeWidth="7.5" fill="none" strokeLinecap="round"/>
      <path d={rBrow}
        stroke="#3a2818" strokeWidth="7.5" fill="none" strokeLinecap="round"/>
      {/* Eyebrow inner hairs (texture) */}
      <path d={lBrow}
        stroke="#5a4030" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.4"
        strokeDasharray="4 3"/>
      <path d={rBrow}
        stroke="#5a4030" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.4"
        strokeDasharray="4 3"/>

      {/* ── UPPER EYELID LINES ────────────────────────────────────────── */}
      <path d="M 59 131 Q 72 126 88 131"
        fill="none" stroke="#a06020" strokeWidth="1.5" opacity="0.6"/>
      <path d="M 112 131 Q 128 126 141 131"
        fill="none" stroke="#a06020" strokeWidth="1.5" opacity="0.6"/>

      {/* ── EYES ──────────────────────────────────────────────────────── */}
      {/* Whites */}
      <ellipse cx="72"  cy="136" rx="14" ry={eyeRy} fill="white"/>
      <ellipse cx="128" cy="136" rx="14" ry={eyeRy} fill="white"/>
      {/* Irises */}
      <circle cx={lpx} cy={lpy} r="8.5" fill="#5c3010"/>
      <circle cx={rpx} cy={rpy} r="8.5" fill="#5c3010"/>
      {/* Pupils */}
      <circle cx={lpx} cy={lpy} r="5.5" fill="#150800"/>
      <circle cx={rpx} cy={rpy} r="5.5" fill="#150800"/>
      {/* Specular highlights */}
      <circle cx={lpx - 2} cy={lpy - 3} r="2.5" fill="white"/>
      <circle cx={rpx - 2} cy={rpy - 3} r="2.5" fill="white"/>
      {/* Lower eyelid / eye-bags */}
      <path d="M 59 144 Q 72 150 88 144"
        fill="none" stroke="#b07030" strokeWidth="1.2" opacity="0.55"/>
      <path d="M 112 144 Q 128 150 141 144"
        fill="none" stroke="#b07030" strokeWidth="1.2" opacity="0.55"/>

      {/* ── NOSE ──────────────────────────────────────────────────────── */}
      {/* Bridge */}
      <path d="M 96 147 C 93 157 91 165 88 172"
        fill="none" stroke="#c07030" strokeWidth="2" opacity="0.55"/>
      <path d="M 104 147 C 107 157 109 165 112 172"
        fill="none" stroke="#c07030" strokeWidth="2" opacity="0.55"/>
      {/* Tip */}
      <ellipse cx="100" cy="174" rx="13" ry="9" fill="#eeaa68"/>
      {/* Nostrils */}
      <ellipse cx="91"  cy="175" rx="6" ry="5" fill="#c87838" opacity="0.65"/>
      <ellipse cx="109" cy="175" rx="6" ry="5" fill="#c87838" opacity="0.65"/>

      {/* ── MUSTACHE (Einstein's most iconic feature) ─────────────────── */}
      <path
        d="M 68 184
           C 73 173 86 167 100 171
           C 114 167 127 173 132 184
           C 124 194 110 191 100 188
           C  90 191  76 194  68 184 Z"
        fill="#f3f1ed" stroke="#d8d6d0" strokeWidth="0.8"/>
      {/* Center part */}
      <path d="M 100 171 L 100 188"
        stroke="#ccc9c3" strokeWidth="1.8" opacity="0.6"/>
      {/* Texture hairs */}
      <path d="M 78 179 Q 89 175 99 176"
        fill="none" stroke="#ccc9c3" strokeWidth="0.9" opacity="0.7"/>
      <path d="M 101 176 Q 111 175 122 179"
        fill="none" stroke="#ccc9c3" strokeWidth="0.9" opacity="0.7"/>
      <path d="M 72 185 Q 83 183 97 183"
        fill="none" stroke="#ccc9c3" strokeWidth="0.8" opacity="0.5"/>
      <path d="M 103 183 Q 117 183 128 185"
        fill="none" stroke="#ccc9c3" strokeWidth="0.8" opacity="0.5"/>

      {/* ── MOUTH ─────────────────────────────────────────────────────── */}
      {isSpeaking ? (
        <>
          {/* Dark mouth interior */}
          <ellipse cx="100" cy="199" rx="16" ry="4" fill="#7a2810">
            <animate attributeName="ry" values="2;9;2" dur="0.38s" repeatCount="indefinite"/>
          </ellipse>
          {/* Upper teeth row */}
          <rect x="89" y="195" width="22" height="5" rx="2.5" fill="#f8f7f0" opacity="0.9"/>
          {/* Lower teeth (moves with jaw open) */}
          <rect x="90" y="202" width="20" height="4" rx="2" fill="#f0efe8" opacity="0.8">
            <animate attributeName="y" values="202;207;202" dur="0.38s" repeatCount="indefinite"/>
          </rect>
        </>
      ) : (
        <path
          d={staticMouth}
          fill="none" stroke="#b06040" strokeWidth="2.8" strokeLinecap="round"
        />
      )}

      {/* ── CHIN DIMPLE ───────────────────────────────────────────────── */}
      <path d="M 97 212 Q 100 216 103 212"
        fill="none" stroke="#c07030" strokeWidth="1" opacity="0.45"/>

      {/* ── THINKING: finger to cheek ─────────────────────────────────── */}
      {isThinking && (
        <g opacity="0.92">
          {/* Forearm */}
          <rect x="52" y="200" width="16" height="48" rx="8" fill="#e8a860"/>
          {/* Hand/fist */}
          <ellipse cx="60" cy="200" rx="14" ry="10" fill="#e8a860"/>
          {/* Index finger pointing up */}
          <rect x="57" y="175" width="9"  height="30" rx="4.5" fill="#f0b070"/>
          {/* Fingernail */}
          <ellipse cx="61.5" cy="176" rx="4" ry="3" fill="#e09850"/>
        </g>
      )}

      {/* ── STATE COLOR GLOW UNDER CHIN / COLLAR ──────────────────────── */}
      <ellipse cx="100" cy="230" rx="40" ry="12" fill={color} opacity="0.18"/>
    </svg>
  );
}
