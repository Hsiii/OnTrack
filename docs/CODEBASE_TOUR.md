# 🗺️ Codebase Tour: OnTrack

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Directory Structure](#directory-structure)
- [Core Components](#core-components)
- [API Layer](#api-layer)
- [State Management](#state-management)
- [Styling](#styling)
- [Build & Deploy](#build--deploy)

---

## 🎯 Project Overview

**OnTrack** is a Progressive Web App (PWA) that helps users check Taiwan Railway (TRA) train schedules and share arrival times with family. It integrates with the TDX (Transport Data eXchange) API to provide real-time train schedules and delays.

### Tech Stack

- **Frontend:** React 19 + TypeScript + Vite
- **Styling:** Custom CSS with glassmorphism design
- **API:** Serverless functions (Vercel)
- **Data Source:** TDX Taiwan Railway API
- **PWA:** Vite Plugin PWA (service worker, offline support)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│          React Frontend (Vite)          │
│  ┌─────────────────────────────────┐   │
│  │     App.tsx (Main Container)    │   │
│  │  ┌──────────────────────────┐   │   │
│  │  │  StationSelector         │   │   │
│  │  │  TrainList               │   │   │
│  │  │  ShareCard               │   │   │
│  │  └──────────────────────────┘   │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
                    ↕ HTTP
┌─────────────────────────────────────────┐
│       Serverless API Functions          │
│  ┌─────────────┐   ┌───────────────┐   │
│  │ /api/       │   │ /api/         │   │
│  │ stations    │   │ schedule      │   │
│  └─────────────┘   └───────────────┘   │
└─────────────────────────────────────────┘
                    ↕ OAuth2 + HTTP
┌─────────────────────────────────────────┐
│         TDX Transport Data API          │
│    (Taiwan Railway Administration)      │
└─────────────────────────────────────────┘
```

---

## 📁 Directory Structure

```
OnTrack/
├── 📂 api/                    # Serverless API functions (Vercel)
│   ├── _utils/
│   │   └── tdx.ts            # TDX API client with OAuth2
│   ├── schedule.ts           # Train schedule endpoint
│   └── stations.ts           # Station list endpoint
│
├── 📂 src/                    # React application source
│   ├── 📂 api/
│   │   └── client.ts         # Frontend API client wrapper
│   ├── 📂 components/
│   │   ├── StationSelector.tsx   # Station picker with search
│   │   ├── TrainList.tsx         # Train schedule display
│   │   └── ShareCard.tsx         # Message template & share
│   ├── 📂 hooks/
│   │   └── usePersistence.ts     # localStorage hook
│   ├── 📂 assets/            # Images, icons, etc.
│   ├── App.tsx               # Main app container
│   ├── App.css              # Component-specific styles
│   ├── index.css            # Global styles
│   ├── main.tsx             # React entry point
│   └── types.ts             # TypeScript interfaces
│
├── 📂 docs/                   # Documentation
│   ├── TDX_RAIL_API.md       # API reference
│   └── CODEBASE_TOUR.md      # This file
│
├── 📂 public/                 # Static assets
│
├── vite.config.ts            # Vite + PWA configuration
├── tsconfig.json             # TypeScript configuration
├── eslint.config.js          # ESLint rules
├── package.json              # Dependencies & scripts
└── README.md                 # Project readme
```

---

## 🧩 Core Components

### 1. **App.tsx** (Main Container)

**Location:** `src/App.tsx`

The root component that orchestrates the entire application.

**Key Responsibilities:**

- Manages global state via `usePersistence` hook
- Fetches station list on mount
- Coordinates data flow between components
- Handles station selection → train list → share card flow

**State Flow:**

```tsx
usePersistence() // localStorage wrapper
    ↓
stations (fetched from API)
    ↓
StationSelector (user picks origin/dest)
    ↓
TrainList (auto-fetches schedule)
    ↓
ShareCard (generates shareable message)
```

---

### 2. **StationSelector**

**Location:** `src/components/StationSelector.tsx`

**Features:**

- Dual station pickers (origin & destination)
- Real-time search filtering (by Chinese name or English)
- Swap button to reverse origin/destination
- Glassmorphism UI design

**Props:**

```typescript
{
  stations: Station[];        // All available stations
  originId: string;          // Selected origin ID
  setOriginId: (id: string) => void;
  destId: string;           // Selected destination ID
  setDestId: (id: string) => void;
}
```

**Search Logic:**

```typescript
filteredOrigin = stations.filter(
    (s) =>
        s.name.includes(originSearch) ||
        s.nameEn.toLowerCase().includes(originSearch.toLowerCase())
);
```

---

### 3. **TrainList**

**Location:** `src/components/TrainList.tsx`

**Features:**

- Auto-fetches schedule when origin/dest changes
- Displays next 3 trains centered around current time
- Shows train status (on-time, delayed, cancelled)
- Auto-selects recommended train (next departure)
- Click to select different train

**Smart Train Selection:**

```typescript
// Find next train departing after current time
const nextTrainIndex = trains.findIndex(
    (t) => t.departureTime >= currentTimeStr
);

// Show context: 1 previous + 2 upcoming trains
const displayTrains = trains.slice(
    Math.max(0, nextTrainIndex - 1),
    nextTrainIndex + 2
);
```

**Props:**

```typescript
{
  originId: string;
  destId: string;
  onSelect: (train: TrainInfo) => void;
  selectedTrainNo: string | null;
}
```

---

### 4. **ShareCard**

**Location:** `src/components/ShareCard.tsx`

**Features:**

- Editable message template with placeholders
- Live preview of final message
- Share via Web Share API (mobile) or copy to clipboard (desktop)
- Persists custom template to localStorage

**Template Variables:**

- `{train_type}` → e.g., "自強號"
- `{train_no}` → e.g., "145"
- `{direction}` → "Clockwise" or "Counter-clockwise"
- `{origin}` → Origin station name
- `{dest}` → Destination station name
- `{time}` → Arrival time (HH:mm)
- `{status}` → "On Time" or "Delayed Xm"

**Default Template:**

```
Hi Mom! I'm taking the {train_type} {train_no} ({direction}).
Arriving at {dest} at {time}. Status: {status}.
```

---

## 🌐 API Layer

### Frontend Client (`src/api/client.ts`)

Simple wrapper around fetch with error handling:

```typescript
export const api = {
    getStations: () => fetchJson<Station[]>('/api/stations'),

    getSchedule: (origin: string, dest: string, date?: string) =>
        fetchJson<ScheduleResponse>(`/api/schedule?${params}`),
};
```

---

### Backend API Functions

#### 1. **stations.ts** (`/api/stations`)

**Endpoint:** `GET /api/stations`

**Purpose:** Returns list of all TRA stations

**Data Source:** TDX API → `/v3/Rail/TRA/Station`

**Response:**

```typescript
Station[] = [
  { id: "1000", name: "臺北", nameEn: "Taipei" },
  { id: "1008", name: "新竹", nameEn: "Hsinchu" },
  // ...
]
```

**Caching:** Stations rarely change, consider caching response

---

#### 2. **schedule.ts** (`/api/schedule`)

**Endpoint:** `GET /api/schedule?origin={id}&dest={id}&date={yyyy-MM-dd}`

**Purpose:** Returns train schedule between two stations with live delay data

**Query Params:**

- `origin` (required): Origin station ID
- `dest` (required): Destination station ID
- `date` (optional): Defaults to today in Taiwan timezone

**Data Flow:**

1. Fetch daily timetable from TDX
2. Fetch live delay data for all trains
3. Merge delay info into timetable
4. Map status based on delay time
5. Return enriched train list

**TDX API Calls:**

```typescript
// 1. Schedule
const scheduleUrl = `v3/Rail/TRA/DailyTrainTimetable/OD/${origin}/to/${dest}/${date}`;

// 2. Live Delays
const delayUrl = 'v3/Rail/TRA/LiveTrainDelay';
```

**Status Mapping:**

```typescript
const getStatus = (delay?: number) => {
    if (delay === undefined) return 'unknown';
    if (delay === 0) return 'on-time';
    if (delay > 0) return 'delayed';
    return 'cancelled'; // delay < 0
};
```

---

### TDX API Client (`api/_utils/tdx.ts`)

**Core Utility:** Handles OAuth2 authentication and API requests to TDX

**Features:**

- Token caching with expiration tracking
- Auto-refresh before expiry (60s buffer)
- Fallback to visitor mode if credentials missing
- Supports both authenticated and guest access

**Flow:**

```typescript
1. Check token cache
   ↓ (expired or missing)
2. Request new token via OAuth2
   ↓
3. Cache token (expires_in - 60s)
   ↓
4. Make authenticated API call
   ↓
5. Return JSON response
```

**Environment Variables Required:**

```bash
TDX_CLIENT_ID=your_client_id
TDX_CLIENT_SECRET=your_client_secret
```

**Visitor Mode:**

- If credentials missing, API calls work but limited to 20 requests/day/IP
- Useful for development without API keys

---

## 💾 State Management

### usePersistence Hook (`src/hooks/usePersistence.ts`)

**Purpose:** Wrapper around localStorage for persistent user preferences

**Persisted Data:**

- `ontrack_origin`: Last selected origin station
- `ontrack_dest`: Last selected destination station
- `ontrack_template`: Custom message template

**Usage:**

```typescript
const {
    originId,
    setOriginId,
    destId,
    setDestId,
    template,
    setTemplate,
    resetTemplate,
} = usePersistence();

// Auto-saves to localStorage on every update
setOriginId('1000'); // Saves immediately
```

**Why localStorage?**

- No backend user accounts needed
- Instant load on revisit
- Works offline (PWA)
- Simple implementation

---

## 🎨 Styling

### Design System

- **Theme:** Dark mode with glassmorphism
- **Colors:** Navy blue gradient background
- **Effects:** Backdrop blur, subtle shadows
- **Responsive:** Mobile-first design

### Global Styles (`src/index.css`)

- CSS Variables for theme colors
- Base typography
- Background gradient animation
- Responsive utilities

### Component Styles (`src/App.css`)

- `.glass-panel`: Glassmorphic cards
- `.train-card`: Interactive train selection cards
- `.search-input`: Styled input fields
- Animations & transitions

**Key CSS Classes:**

```css
.glass-panel {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
}

.train-card {
    cursor: pointer;
    transition: all 0.2s;
}

.train-card:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
}
```

---

## 🛠️ Build & Deploy

### Development

```bash
npm run dev         # Start Vite dev server (http://localhost:5173)
```

### Production Build

```bash
npm run build      # TypeScript compile + Vite build
npm run preview    # Preview production build locally
```

### Code Quality

```bash
npm run lint       # ESLint check
npm run format     # Prettier format
```

---

## 📱 Progressive Web App (PWA)

**Configuration:** `vite.config.ts`

**Features:**

- **Service Worker:** Auto-generated by `vite-plugin-pwa`
- **Offline Support:** Caches static assets
- **Install Prompt:** Add to home screen on mobile
- **Auto-Update:** New versions deploy seamlessly

**Manifest:**

```json
{
    "name": "OnTrack",
    "short_name": "OnTrack",
    "theme_color": "#0f172a",
    "icons": ["192x192.png", "512x512.png"]
}
```

**Testing PWA:**

1. Run `npm run build && npm run preview`
2. Open Chrome DevTools → Application → Service Workers
3. Check "Offline" and reload page

---

## 🔑 Key TypeScript Interfaces

### Station

```typescript
interface Station {
    id: string; // Station ID (e.g., "1000")
    name: string; // Chinese name (e.g., "臺北")
    nameEn: string; // English name (e.g., "Taipei")
}
```

### TrainInfo

```typescript
interface TrainInfo {
    trainNo: string; // Train number (e.g., "145")
    trainType: string; // Type (e.g., "自強號")
    direction: 0 | 1; // 0: Clockwise, 1: Counter-clockwise
    originStation: string; // Starting station
    destinationStation: string; // Final destination
    departureTime: string; // HH:mm format
    arrivalTime: string; // HH:mm format
    delay?: number; // Minutes delayed (undefined = unknown)
    status: 'on-time' | 'delayed' | 'cancelled' | 'unknown';
}
```

---

## 🚀 Deployment (Vercel)

The project is configured for Vercel deployment:

1. **API Routes:** `/api/*` automatically deployed as serverless functions
2. **Frontend:** Static SPA served from `dist/`
3. **Environment:** Set `TDX_CLIENT_ID` and `TDX_CLIENT_SECRET` in Vercel dashboard
4. **Auto-Deploy:** Push to `main` branch triggers deployment

**Vercel Config:**

- Framework: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

---

## 🔍 Data Flow Example

**User Journey: "I want to go from Taipei to Hsinchu"**

```
1. User lands on app
   → App.tsx loads
   → usePersistence() restores last selections from localStorage
   → Fetches stations from /api/stations

2. User selects "Taipei" (1000) and "Hsinchu" (1008)
   → StationSelector updates state via setOriginId/setDestId
   → Values saved to localStorage automatically

3. TrainList detects origin/dest change
   → Triggers useEffect
   → Calls api.getSchedule('1000', '1008')
   → Backend fetches from TDX + merges delays
   → Returns 3 relevant trains
   → Auto-selects next departure

4. User clicks a different train
   → onSelect(train) callback updates App state
   → selectedTrain propagates to ShareCard

5. ShareCard generates message
   → Replaces template variables with train data
   → Shows live preview
   → User edits template (auto-saves to localStorage)

6. User clicks "Share"
   → navigator.share() on mobile (system share sheet)
   → navigator.clipboard.writeText() on desktop
   → Message shared! 🎉
```

---

## 🧪 Testing Checklist

- [ ] Station search (Chinese & English)
- [ ] Swap origin/destination button
- [ ] Train auto-selection (next departure)
- [ ] Manual train selection
- [ ] Live delay data accuracy
- [ ] Template customization & persistence
- [ ] Share on mobile (Web Share API)
- [ ] Copy to clipboard on desktop
- [ ] localStorage persistence across sessions
- [ ] PWA install prompt on mobile
- [ ] Offline mode (cached static assets)
- [ ] Edge cases: No trains found, API errors

---

## 📚 Further Reading

- [TDX Rail API Documentation](./TDX_RAIL_API.md)
- [Cache Mechanics](./CACHE_MECHANICS.md) - All caching strategies used to reduce API calls
- [Vite Documentation](https://vite.dev/)
- [React 19 Docs](https://react.dev/)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API)

---

## 🤝 Contributing

When adding features:

1. Update TypeScript interfaces in `src/types.ts`
2. Follow existing component patterns
3. Maintain glassmorphism design language
4. Test on mobile (PWA features)
5. Update this tour if architecture changes

---

**Happy Coding! 🚂💨**
