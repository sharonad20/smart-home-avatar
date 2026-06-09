import { Device, type DeviceType } from './devices';

export type ActionType = 'toggle_device' | 'set_temperature' | 'none';

export interface Action {
  type: ActionType;
  deviceId?: string;
  state?: boolean;
  value?: number;
}

export interface CommandResponse {
  responseText: string;
  actions: Action[];
}

// ── Session ID (stable per browser tab) ────────────────────────────────────
function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  let id = sessionStorage.getItem('albert_session_id');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('albert_session_id', id);
  }
  return id;
}

// ── Backend API call ────────────────────────────────────────────────────────
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

interface BackendAction {
  type: ActionType;
  device_id?: string;
  state?: boolean;
  value?: number;
}

interface BackendResponse {
  response_text: string;
  actions: BackendAction[];
  intent?: string;
}

async function callBackend(
  transcript: string,
  devices: Device[],
): Promise<CommandResponse> {
  const url = `${BACKEND_URL}/command`;
  const body = {
    transcript,
    session_id: getSessionId(),
    devices: devices.map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      state: d.isOn,
    })),
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Backend returned ${res.status}`);

  const data: BackendResponse = await res.json();
  return {
    responseText: data.response_text,
    actions: data.actions.map((a) => ({
      type: a.type,
      deviceId: a.device_id,
      state: a.state,
      value: a.value,
    })),
  };
}

// ── Mock fallback (used when NEXT_PUBLIC_BACKEND_URL is not set) ────────────
const MOCK_RULES: Array<{
  keywords: string[];
  response: string;
  actions: Action[];
}> = [
  {
    keywords: ['הדלק אור', 'הדלק את האור', 'תדליק אור'],
    response: 'הדלקתי את האור בסלון',
    actions: [{ type: 'toggle_device', deviceId: 'light-living', state: true }],
  },
  {
    keywords: ['כבה אור', 'כבה את האור', 'תכבה אור'],
    response: 'כיביתי את האור',
    actions: [{ type: 'toggle_device', deviceId: 'light-living', state: false }],
  },
  {
    keywords: ['הפעל מזגן', 'הדלק מזגן', 'תפעיל מזגן'],
    response: 'הפעלתי את המזגן על עשרים וארבע מעלות',
    actions: [
      { type: 'toggle_device', deviceId: 'ac-main', state: true },
      { type: 'set_temperature', value: 24 },
    ],
  },
  {
    keywords: ['כבה מזגן', 'כיבוי מזגן'],
    response: 'כיביתי את המזגן',
    actions: [{ type: 'toggle_device', deviceId: 'ac-main', state: false }],
  },
  {
    keywords: ['מה הטמפרטורה', 'כמה חם', 'כמה קר'],
    response: 'הטמפרטורה בחוץ שלושים ואחת מעלות, המזגן מכוון לעשרים וארבע',
    actions: [],
  },
  {
    keywords: ['סגור תריסים', 'סגור את התריסים', 'הורד תריסים'],
    response: 'סוגר תריסים',
    actions: [{ type: 'toggle_device', deviceId: 'shutter-living', state: false }],
  },
  {
    keywords: ['פתח תריסים', 'הרם תריסים', 'פתח את התריסים'],
    response: 'פותח תריסים',
    actions: [{ type: 'toggle_device', deviceId: 'shutter-living', state: true }],
  },
  {
    keywords: ['הדלק טלוויזיה', 'הפעל טלוויזיה', 'תדליק טלוויזיה'],
    response: 'מפעיל טלוויזיה',
    actions: [{ type: 'toggle_device', deviceId: 'tv-living', state: true }],
  },
  {
    keywords: ['כבה טלוויזיה', 'כיבוי טלוויזיה'],
    response: 'מכבה טלוויזיה',
    actions: [{ type: 'toggle_device', deviceId: 'tv-living', state: false }],
  },
  {
    keywords: ['שלום', 'היי', 'הי', 'בוקר טוב', 'ערב טוב'],
    response: 'שלום! אני אלברט, מוכן לעזור',
    actions: [],
  },
  {
    keywords: ['מי אתה', 'מה שמך'],
    response: 'אני אלברט, עוזר הבית החכם שלך',
    actions: [],
  },
];

function mockCommand(transcript: string): CommandResponse {
  const normalized = transcript.trim().toLowerCase();
  for (const rule of MOCK_RULES) {
    if (rule.keywords.some((kw) => normalized.includes(kw.toLowerCase()))) {
      return { responseText: rule.response, actions: rule.actions };
    }
  }
  return { responseText: 'הבנתי את הבקשה. בגרסה המלאה אחבר ל-Home Assistant', actions: [] };
}

// ── Device fetch ────────────────────────────────────────────────────────────

interface BackendDevice {
  entity_id: string;
  state: string;
  attributes: { friendly_name?: string; [key: string]: unknown };
}

const _DOMAIN_TYPE: Record<string, DeviceType> = {
  light: 'light', switch: 'light', cover: 'shutter', climate: 'ac', fan: 'light',
};
const _DOMAIN_ICON: Record<string, string> = {
  light: '💡', switch: '💡', cover: '🪟', climate: '❄️', fan: '🌀',
};
const _DOMAIN_LABEL: Record<string, string> = {
  light: 'תאורה', switch: 'מתג', cover: 'תריס', climate: 'מיזוג', fan: 'מאוורר',
};

function entityToDevice(e: BackendDevice): Device {
  const domain = e.entity_id.split('.')[0];
  return {
    id:   e.entity_id,
    name: e.attributes.friendly_name ?? e.entity_id,
    icon: _DOMAIN_ICON[domain]  ?? '🏠',
    type: _DOMAIN_TYPE[domain]  ?? 'light',
    room: _DOMAIN_LABEL[domain] ?? '',
    isOn: ['on', 'open'].includes(e.state.toLowerCase()),
  };
}

export async function toggleDevice(entityId: string, state: boolean): Promise<void> {
  if (!BACKEND_URL) { console.warn('[toggle] BACKEND_URL not set'); return; }
  console.log('[toggle] →', entityId, state);
  try {
    const res = await fetch(`${BACKEND_URL}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_id: entityId, state }),
    });
    const data = await res.json();
    console.log('[toggle] ←', data);
  } catch (err) {
    console.error('[toggle] fetch failed:', err);
  }
}

export async function fetchDevices(): Promise<Device[]> {
  if (!BACKEND_URL) return [];
  try {
    const res = await fetch(`${BACKEND_URL}/devices`);
    if (!res.ok) return [];
    const data: { devices: BackendDevice[] } = await res.json();
    return (data.devices ?? []).map(entityToDevice);
  } catch {
    return [];
  }
}

// ── Public API ──────────────────────────────────────────────────────────────
export async function processCommand(
  transcript: string,
  devices: Device[] = [],
): Promise<CommandResponse> {
  if (BACKEND_URL) {
    try {
      return await callBackend(transcript, devices);
    } catch (err) {
      console.warn('Backend unavailable, using mock:', err);
    }
  }
  // Mock path: simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 550 + Math.random() * 450));
  return mockCommand(transcript);
}
