'use client';

interface QuickCommand {
  label: string;
  icon: string;
  transcript: string;
}

const COMMANDS: QuickCommand[] = [
  { icon: '💡', label: 'הדלק אור',        transcript: 'הדלק אור' },
  { icon: '❄️', label: 'הפעל מזגן',       transcript: 'הפעל מזגן' },
  { icon: '🪟', label: 'סגור תריסים',     transcript: 'סגור תריסים' },
  { icon: '🌡️', label: 'מה הטמפרטורה?', transcript: 'מה הטמפרטורה' },
  { icon: '📺', label: 'הדלק טלוויזיה',  transcript: 'הדלק טלוויזיה' },
  { icon: '💡', label: 'כבה אור',         transcript: 'כבה אור' },
];

interface QuickCommandsProps {
  onCommand: (transcript: string) => void;
  disabled?: boolean;
}

export function QuickCommands({ onCommand, disabled }: QuickCommandsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-3 px-6 pb-4">
      {COMMANDS.map((cmd) => (
        <button
          key={cmd.transcript}
          onClick={() => !disabled && onCommand(cmd.transcript)}
          disabled={disabled}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
            bg-white/5 border border-white/10 text-white/70
            hover:bg-white/10 hover:border-white/20 hover:text-white
            active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed
            transition-all duration-150"
          style={{ direction: 'rtl' }}
        >
          <span>{cmd.icon}</span>
          <span>{cmd.label}</span>
        </button>
      ))}
    </div>
  );
}
