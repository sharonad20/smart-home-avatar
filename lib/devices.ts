export type DeviceType = 'light' | 'ac' | 'shutter' | 'tv';

export interface Device {
  id: string;
  name: string;
  icon: string;
  type: DeviceType;
  room: string;
  isOn: boolean;
}

export const initialDevices: Device[] = [
  { id: 'light-living',   name: 'תאורה — סלון',   icon: '💡', type: 'light',   room: 'סלון',  isOn: true  },
  { id: 'light-bedroom',  name: 'תאורה — חדר שינה', icon: '💡', type: 'light',   room: 'חדר שינה', isOn: false },
  { id: 'light-kitchen',  name: 'תאורה — מטבח',    icon: '💡', type: 'light',   room: 'מטבח', isOn: true  },
  { id: 'ac-main',        name: 'מזגן — סלון',      icon: '❄️', type: 'ac',      room: 'סלון',  isOn: false },
  { id: 'shutter-living', name: 'תריסים — סלון',   icon: '🪟', type: 'shutter', room: 'סלון',  isOn: true  },
  { id: 'tv-living',      name: 'טלוויזיה',         icon: '📺', type: 'tv',      room: 'סלון',  isOn: false },
];
