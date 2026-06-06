'use client';

import { useMemo } from 'react';
import type { AvatarState } from '@/hooks/useAvatarState';

const BAR_COUNT = 32;
const RADIUS = 150;
const BAR_MIN = 6;
const BAR_MAX = 38;

const STATE_COLORS: Record<AvatarState, string> = {
  idle:      '#6366f1',
  listening: '#06b6d4',
  thinking:  '#f59e0b',
  speaking:  '#10b981',
};

function randomDelay(i: number): string {
  return `${((i * 137.508) % 1000) / 1000}s`;
}

function randomDuration(i: number): string {
  const base = 0.3;
  const jitter = ((i * 73) % 400) / 1000;
  return `${base + jitter}s`;
}

interface AudioVisualizerProps {
  state: AvatarState;
}

export function AudioVisualizer({ state }: AudioVisualizerProps) {
  const color = STATE_COLORS[state];
  const isActive = state === 'listening' || state === 'speaking';

  const bars = useMemo(() => {
    return Array.from({ length: BAR_COUNT }, (_, i) => {
      const angle = (i / BAR_COUNT) * 2 * Math.PI - Math.PI / 2;
      const x = Math.cos(angle);
      const y = Math.sin(angle);
      const innerR = 116;
      const x1 = 160 + x * innerR;
      const y1 = 160 + y * innerR;
      const x2 = 160 + x * (innerR + BAR_MIN);
      const y2 = 160 + y * (innerR + BAR_MIN);
      return { x1, y1, x2, y2, angle, i };
    });
  }, []);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <svg width={320} height={320} viewBox="0 0 320 320" className="absolute">
        {bars.map(({ x1, y1, x2, y2, i }) => {
          const angle = (i / BAR_COUNT) * 2 * Math.PI - Math.PI / 2;
          const innerR = 116;
          const cx = Math.cos(angle);
          const cy = Math.sin(angle);
          const keyframeName = isActive ? 'bar-dance' : 'none';
          const duration = randomDuration(i);
          const delay = randomDelay(i);

          return (
            <line
              key={i}
              x1={160 + cx * innerR}
              y1={160 + cy * innerR}
              x2={160 + cx * (innerR + BAR_MIN)}
              y2={160 + cy * (innerR + BAR_MIN)}
              stroke={color}
              strokeWidth={2.5}
              strokeLinecap="round"
              opacity={isActive ? 0.85 : 0.25}
              style={{
                transformOrigin: `${160 + cx * innerR}px ${160 + cy * innerR}px`,
                transformBox: 'fill-box',
                animation: isActive
                  ? `bar-grow-${i % 4} ${duration} ease-in-out ${delay} infinite alternate`
                  : undefined,
              }}
            >
              {isActive && (
                <animate
                  attributeName="x2"
                  values={`${160 + cx * (innerR + BAR_MIN)};${160 + cx * (innerR + BAR_MIN + BAR_MAX * (0.3 + ((i * 31) % 70) / 100))};${160 + cx * (innerR + BAR_MIN)}`}
                  dur={duration}
                  begin={delay}
                  repeatCount="indefinite"
                />
              )}
              {isActive && (
                <animate
                  attributeName="y2"
                  values={`${160 + cy * (innerR + BAR_MIN)};${160 + cy * (innerR + BAR_MIN + BAR_MAX * (0.3 + ((i * 31) % 70) / 100))};${160 + cy * (innerR + BAR_MIN)}`}
                  dur={duration}
                  begin={delay}
                  repeatCount="indefinite"
                />
              )}
            </line>
          );
        })}
      </svg>
    </div>
  );
}
