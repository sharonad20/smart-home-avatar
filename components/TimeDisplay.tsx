'use client';

import { useState, useEffect } from 'react';

const HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function formatDate(date: Date): string {
  const dayName = HEBREW_DAYS[date.getDay()];
  const day = date.getDate();
  const month = HEBREW_MONTHS[date.getMonth()];
  return `יום ${dayName}, ${day} ב${month}`;
}

export function TimeDisplay() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(timer);
  }, []);

  if (!now) return <div className="w-40 h-16" />;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-5xl font-light text-white/90 tabular-nums leading-none">
        {formatTime(now)}
      </span>
      <span className="text-sm text-white/50 leading-none">
        {formatDate(now)}
      </span>
    </div>
  );
}
