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

export async function processCommand(transcript: string): Promise<CommandResponse> {
  await new Promise((resolve) => setTimeout(resolve, 550 + Math.random() * 450));

  const normalized = transcript.trim().toLowerCase();

  for (const rule of MOCK_RULES) {
    if (rule.keywords.some((kw) => normalized.includes(kw.toLowerCase()))) {
      return { responseText: rule.response, actions: rule.actions };
    }
  }

  return {
    responseText: 'הבנתי את הבקשה. בגרסה המלאה אחבר ל-Home Assistant',
    actions: [],
  };
}
