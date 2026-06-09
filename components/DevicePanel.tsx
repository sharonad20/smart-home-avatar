'use client';

import { useState } from 'react';
import type { Device } from '@/lib/devices';

interface DevicePanelProps {
  devices: Device[];
  onToggle: (id: string) => void;
}

export function DevicePanel({ devices, onToggle }: DevicePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const activeCount = devices.filter((d) => d.isOn).length;

  return (
    <div className="relative z-50">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
          bg-white/5 border border-white/10 text-white/70
          hover:bg-white/10 hover:border-white/20 hover:text-white
          transition-all duration-150"
      >
        <span>🏠</span>
        <span>מכשירים</span>
        <span
          className="text-xs px-1.5 py-0.5 rounded-full bg-white/10 text-white/60"
        >
          {activeCount}/{devices.length}
        </span>
        <span className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {/* Panel */}
      {isOpen && (
        <div
          className="device-panel-enter absolute top-full mt-2 left-0 w-80
            rounded-2xl border border-white/10 overflow-hidden
            device-scroll"
          style={{
            background: 'rgba(10,10,20,0.95)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            maxHeight: 320,
            overflowY: 'auto',
          }}
        >
          <div className="px-4 py-3 border-b border-white/5">
            <span className="text-xs text-white/40 tracking-wider uppercase">מכשירי הבית</span>
          </div>
          <div className="grid grid-cols-1 gap-1 p-2">
            {devices.map((device) => (
              <DeviceRow key={device.id} device={device} onToggle={onToggle} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DeviceRow({ device, onToggle }: { device: Device; onToggle: (id: string) => void }) {
  const activeColor = device.type === 'ac' ? '#06b6d4' : device.type === 'tv' ? '#6366f1' : '#f59e0b';

  return (
    <button
      onClick={() => onToggle(device.id)}
      className="flex items-center justify-between px-3 py-2.5 rounded-xl w-full text-right
        hover:bg-white/5 active:bg-white/10 transition-all duration-150"
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">{device.icon}</span>
        <div>
          <p className="text-sm text-white/80 leading-none mb-0.5">{device.name}</p>
          <p className="text-xs text-white/30">{device.room}</p>
        </div>
      </div>

      {/* Toggle pill */}
      <div
        className="relative w-10 h-5 rounded-full transition-all duration-300 flex-shrink-0"
        style={{
          background: device.isOn ? activeColor : 'rgba(255,255,255,0.1)',
          boxShadow: device.isOn ? `0 0 8px ${activeColor}88` : 'none',
        }}
      >
        <div
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-300"
          style={{ right: device.isOn ? '2px' : 'auto', left: device.isOn ? 'auto' : '2px' }}
        />
      </div>
    </button>
  );
}
