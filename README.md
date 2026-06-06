# בית חכם — Smart Home Hebrew Voice Avatar (Stage 1)

Full-screen PWA tablet UI for a Hebrew-speaking smart home assistant. Runs entirely in the browser — no backend required for Stage 1.

## Features

- **Hebrew STT** via Web Speech API (`lang: he-IL`) — continuous listening with "היי בית" wake word
- **Hebrew TTS** via Web Speech Synthesis — auto-selects best available Hebrew voice
- **Animated orb avatar** with 4 states: `idle / listening / thinking / speaking`
- **32-bar radial audio visualizer** in SVG
- **Floating particle background**
- **Hebrew clock + date** in the top-left
- **Quick command buttons** for demo / touch use
- **Mock device panel** (living room light, bedroom light, kitchen light, AC, shutters, TV)
- **PWA** — installable on tablet home screen, runs full-screen in landscape kiosk mode

## Tech Stack

- Next.js 14 (App Router) · TypeScript · Tailwind CSS
- next-pwa (Workbox service worker)
- Web Speech API only — no third-party voice libraries

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in Chrome / Edge on a tablet.

## Deployment (Vercel)

```bash
# First deploy
npx vercel

# Production deploy
npx vercel --prod
```

Environment variable (leave empty for Stage 1):

```
NEXT_PUBLIC_BACKEND_URL=
```

Copy `.env.local.example` → `.env.local` before running locally.

## PWA / Tablet Setup

1. Open the deployed URL in Chrome on your tablet
2. Tap **⋮ → Add to Home Screen**
3. Launch from the home screen — browser chrome hides automatically (standalone mode)

For iOS:
1. Open in Safari
2. Share → Add to Home Screen

## Wake Word

Say **"היי בית"** or **"הי בית"** to start a command.  
You can also tap the orb directly, or use the quick command buttons at the bottom.

## Mock Responses (Stage 1)

| Input keyword | Response |
|---|---|
| הדלק אור | הדלקתי את האור בסלון |
| כבה אור | כיביתי את האור |
| הפעל מזגן | הפעלתי את המזגן על 24 מעלות |
| מה הטמפרטורה | הטמפרטורה בחוץ 31 מעלות... |
| סגור תריסים | סוגר תריסים |
| הדלק טלוויזיה | מפעיל את הטלוויזיה |
| _default_ | הבנתי את הבקשה. בגרסה המלאה אחבר ל-Home Assistant |

## Stage Roadmap

| Stage | What | Where |
|---|---|---|
| **1 (this)** | PWA frontend + Hebrew voice I/O | Vercel |
| 2 | Python NLU backend + Claude API | Railway |
| 3 | Home Assistant integration | Railway → HA |

## File Structure

```
app/
  layout.tsx          — RTL, dark theme, PWA meta
  page.tsx            — Main orchestrator (state machine)
  globals.css         — Keyframes + global styles

components/
  Avatar.tsx          — Animated orb with icons per state
  AudioVisualizer.tsx — 32-bar radial SVG ring
  DevicePanel.tsx     — Mock device grid with toggles
  QuickCommands.tsx   — Bottom shortcut row
  TimeDisplay.tsx     — Hebrew clock + date
  ParticleBackground.tsx — 30 floating dots

hooks/
  useAvatarState.ts   — idle/listening/thinking/speaking state machine
  useSpeechRecognition.ts — Web Speech API STT + wake word
  useSpeechSynthesis.ts   — Web Speech Synthesis TTS

lib/
  avatar-api.ts       — Command processor (mock; swapped for backend in Stage 2)
  speech.ts           — Wake word helpers + TTS utilities
  devices.ts          — Mock device definitions

types/
  speech.d.ts         — Web Speech API type declarations
```
