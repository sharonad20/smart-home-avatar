'use client';

import { useMemo } from 'react';
import type { AvatarState } from '@/hooks/useAvatarState';

const STATE_COLORS: Record<AvatarState, string> = {
  idle:      '#6366f1',
  listening: '#06b6d4',
  thinking:  '#f59e0b',
  speaking:  '#10b981',
};

const STATE_LABELS: Record<AvatarState, string> = {
  idle:      'מוכן',
  listening: 'מאזין...',
  thinking:  'חושב...',
  speaking:  'מדבר...',
};

const STATE_ICONS: Record<AvatarState, string> = {
  idle:      '🏠',
  listening: '👂',
  thinking:  '🧠',
  speaking:  '💬',
};

interface AvatarProps {
  state: AvatarState;
  transcript?: string;
}

export function Avatar({ state, transcript }: AvatarProps) {
  const color = STATE_COLORS[state];

  const orbClass = useMemo(() => {
    switch (state) {
      case 'idle':      return 'orb-idle';
      case 'listening': return 'orb-listening';
      case 'thinking':  return 'orb-thinking';
      case 'speaking':  return 'orb-speaking';
    }
  }, [state]);

  return (
    <div className="flex flex-col items-center justify-center gap-6 select-none">
      {/* Outer pulse rings */}
      <div className="relative flex items-center justify-center" style={{ width: 260, height: 260 }}>

        {/* Pulse rings (listening / speaking only) */}
        {(state === 'listening' || state === 'speaking') && (
          <>
            <div
              className="absolute rounded-full pulse-ring-anim"
              style={{ width: 240, height: 240, border: `2px solid ${color}`, opacity: 0.4 }}
            />
            <div
              className="absolute rounded-full pulse-ring-anim"
              style={{ width: 240, height: 240, border: `2px solid ${color}`, opacity: 0.4, animationDelay: '0.5s' }}
            />
            <div
              className="absolute rounded-full pulse-ring-anim"
              style={{ width: 240, height: 240, border: `2px solid ${color}`, opacity: 0.4, animationDelay: '1s' }}
            />
          </>
        )}

        {/* Thinking ring */}
        {state === 'thinking' && (
          <>
            <svg
              className="absolute ring-spin"
              width={230} height={230}
              viewBox="0 0 230 230"
              style={{ top: 15, left: 15 }}
            >
              <circle cx="115" cy="115" r="110" fill="none" stroke={color} strokeWidth="2"
                strokeDasharray="60 280" strokeLinecap="round" opacity="0.7" />
            </svg>
            <svg
              className="absolute ring-spin-reverse"
              width={210} height={210}
              viewBox="0 0 210 210"
              style={{ top: 25, left: 25 }}
            >
              <circle cx="105" cy="105" r="100" fill="none" stroke={color} strokeWidth="1.5"
                strokeDasharray="30 600" strokeLinecap="round" opacity="0.5" />
            </svg>
          </>
        )}

        {/* Idle slow orbit ring */}
        {state === 'idle' && (
          <svg
            className="absolute ring-spin-slow"
            width={230} height={230}
            viewBox="0 0 230 230"
            style={{ top: 15, left: 15 }}
          >
            <circle cx="115" cy="115" r="110" fill="none" stroke={color} strokeWidth="1"
              strokeDasharray="20 580" strokeLinecap="round" opacity="0.3" />
          </svg>
        )}

        {/* Glow halo */}
        <div
          className="absolute rounded-full"
          style={{
            width: 220,
            height: 220,
            background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
            filter: `blur(20px)`,
            top: 20,
            left: 20,
          }}
        />

        {/* Main orb */}
        <div
          className={`relative rounded-full flex items-center justify-center ${orbClass}`}
          style={{
            width: 200,
            height: 200,
            background: `radial-gradient(circle at 35% 35%, ${color}cc, ${color}55 60%, ${color}22)`,
            boxShadow: `0 0 40px ${color}66, 0 0 80px ${color}33, inset 0 0 30px ${color}22`,
            border: `1px solid ${color}88`,
          }}
        >
          {/* Specular highlight */}
          <div
            className="absolute rounded-full"
            style={{
              width: 60,
              height: 60,
              background: 'radial-gradient(circle, rgba(255,255,255,0.25), transparent)',
              top: 30,
              right: 35,
            }}
          />
          <span style={{ fontSize: 56 }}>{STATE_ICONS[state]}</span>
        </div>
      </div>

      {/* State label */}
      <div className="flex flex-col items-center gap-1">
        <span
          className="text-2xl font-medium tracking-widest"
          style={{ color, textShadow: `0 0 12px ${color}99` }}
        >
          {STATE_LABELS[state]}
        </span>

        {/* Live transcript */}
        {transcript && (
          <p className="text-sm text-white/60 text-center max-w-xs leading-relaxed px-4">
            {transcript}
          </p>
        )}
      </div>
    </div>
  );
}
