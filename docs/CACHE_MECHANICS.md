# 🗄️ Cache Mechanics Documentation

This document lists all caching mechanisms used in OnTrack to reduce API calls between:

1. **TDX → Vercel** (Serverless functions)
2. **Vercel → Client** (HTTP headers + client-side)

> ⚠️ **Important Note**: Vercel serverless functions are stateless. In-memory caches may not persist between invocations due to cold starts. The caches documented below are best-effort optimizations that work when the function instance is warm.

---

## 📊 Cache Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                               │
│  ┌─────────────────────┐   ┌───────────────────────────────────────────┐   │
│  │ localStorage        │   │ Client-side Memory Cache                  │   │
│  │ • User preferences  │   │ • stationsCache (1 hour TTL)              │   │
│  │ • origin/dest       │   │ • inflightRequests (deduplication)        │   │
│  │ • message template  │   │                                           │   │
│  └─────────────────────┘   └───────────────────────────────────────────┘   │
└────────────────────────────────────────┬────────────────────────────────────┘
                                         │
                    HTTP (Cache-Control headers)
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      VERCEL EDGE / CDN LAYER                                │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ HTTP Cache-Control (CDN/Edge)                                         │  │
│  │ • /api/stations:  s-maxage=3600, stale-while-revalidate=86400        │  │
│  │ • /api/schedule:  s-maxage=60, stale-while-revalidate=300            │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────┬────────────────────────────────────┘
                                         │
                           Serverless Function Invocation
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     VERCEL SERVERLESS FUNCTIONS                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ In-Memory Caches (best-effort, lost on cold start)                    │  │
│  │ • stationsCache (1 hour TTL) - api/stations.ts                        │  │
│  │ • timetableCache (5 min TTL) - api/schedule.ts                        │  │
│  │ • cachedToken (OAuth2 token) - api/_utils/tdx.ts                      │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────┬────────────────────────────────────┘
                                         │
                            OAuth2 + HTTP Requests
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          TDX TRANSPORT API                                  │
│                    (Taiwan Railway Administration)                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Layer 1: TDX → Vercel (Serverless Functions)

### 1.1 OAuth2 Token Cache

**File:** `api/_utils/tdx.ts`

**Purpose:** Cache the TDX OAuth2 access token to avoid re-authenticating on every API call.

**Implementation:**
```typescript
let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

async function getAccessToken(): Promise<string | null> {
    const now = Date.now();
    if (cachedToken && now < tokenExpiresAt) {
        return cachedToken;  // Return cached token
    }
    // ... fetch new token ...
    cachedToken = data.access_token;
    tokenExpiresAt = now + data.expires_in * 1000 - 60000;  // Refresh 1 min early
}
```

| Property | Value |
|----------|-------|
| **TTL** | Token `expires_in` - 60 seconds (early refresh buffer) |
| **Scope** | Single serverless function instance |
| **Cold Start Impact** | Token re-fetched on cold start |

---

### 1.2 Stations Data Cache

**File:** `api/stations.ts`

**Purpose:** Cache the station list since stations rarely change.

**Implementation:**
```typescript
let stationsCache: { data: TDXStation[]; expires: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// In handler:
if (stationsCache && stationsCache.expires > now) {
    data = stationsCache.data;
    console.log('Using cached stations data');
} else {
    data = await fetchTDX('v3/Rail/TRA/Station', { ... });
    stationsCache = { data, expires: now + CACHE_TTL };
}
```

| Property | Value |
|----------|-------|
| **TTL** | 1 hour |
| **Scope** | Single serverless function instance |
| **Cold Start Impact** | Stations re-fetched on cold start |

---

### 1.3 Timetable Data Cache

**File:** `api/schedule.ts`

**Purpose:** Cache daily train timetables to reduce TDX API calls for the same schedule queries.

**Implementation:**
```typescript
const timetableCache = new Map<string, { data: TDXFullTimetable[]; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// In handler:
const cacheKey = `${scheduleUrl}`;
const cached = timetableCache.get(cacheKey);
if (cached && cached.expires > now) {
    allTrains = cached.data;
    console.log('Using cached timetable data');
} else {
    allTrains = await fetchTDX(scheduleUrl, { tier: 'basic' });
    timetableCache.set(cacheKey, { data: allTrains, expires: now + CACHE_TTL });
}
```

| Property | Value |
|----------|-------|
| **TTL** | 5 minutes |
| **Key Format** | API endpoint path (e.g., `v3/Rail/TRA/DailyTrainTimetable/Today`) |
| **Scope** | Single serverless function instance |
| **Cold Start Impact** | Timetable re-fetched on cold start |

---

## Layer 2: Vercel → Client

### 2.1 HTTP Cache-Control Headers (CDN/Edge Caching)

**Purpose:** Enable Vercel's CDN to cache API responses at the edge, serving cached content to clients without invoking serverless functions.

#### `/api/stations` Response Headers

**File:** `api/stations.ts`

```typescript
res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
```

| Directive | Value | Meaning |
|-----------|-------|---------|
| `s-maxage` | 3600 (1 hour) | CDN caches for 1 hour |
| `stale-while-revalidate` | 86400 (24 hours) | Serve stale while revalidating in background |

#### `/api/schedule` Response Headers

**File:** `api/schedule.ts`

```typescript
res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
```

| Directive | Value | Meaning |
|-----------|-------|---------|
| `s-maxage` | 60 (1 minute) | CDN caches for 1 minute |
| `stale-while-revalidate` | 300 (5 minutes) | Serve stale while revalidating in background |

> **Note:** `vercel.json` sets `Cache-Control: no-store` for `/api/*` routes, but this is overridden by the programmatic headers set in the serverless functions themselves.

---

### 2.2 Client-Side Stations Cache

**File:** `src/api/client.ts`

**Purpose:** Cache station data in browser memory to avoid re-fetching on every page load.

**Implementation:**
```typescript
let stationsCache: { data: Station[]; expires: number } | null = null;
const STATIONS_CACHE_TTL = 60 * 60 * 1000; // 1 hour

export const api = {
    getStations: async (): Promise<Station[]> => {
        const now = Date.now();
        if (stationsCache && stationsCache.expires > now) {
            return stationsCache.data;  // Return cached data
        }
        const data = await fetchJson<Station[]>('/api/stations');
        stationsCache = { data, expires: now + STATIONS_CACHE_TTL };
        return data;
    },
    // ...
};
```

| Property | Value |
|----------|-------|
| **TTL** | 1 hour |
| **Scope** | Browser tab/session |
| **Persistence** | Lost on page refresh |

---

### 2.3 In-Flight Request Deduplication

**File:** `src/api/client.ts`

**Purpose:** Prevent duplicate simultaneous API requests. If multiple components request the same URL at the same time, only one fetch is made.

**Implementation:**
```typescript
const inflightRequests = new Map<string, Promise<unknown>>();

async function fetchJson<T>(url: string, retryCount = 0): Promise<T> {
    const cacheKey = `${url}-${retryCount}`;
    if (inflightRequests.has(cacheKey)) {
        console.log('Reusing in-flight request for:', url);
        return inflightRequests.get(cacheKey) as Promise<T>;
    }

    const requestPromise = (async () => {
        try {
            const response = await fetch(url);
            // ... handle response ...
        } finally {
            inflightRequests.delete(cacheKey);
        }
    })();

    inflightRequests.set(cacheKey, requestPromise);
    return requestPromise;
}
```

| Property | Value |
|----------|-------|
| **TTL** | Duration of the request (auto-cleared on completion) |
| **Scope** | Browser tab/session |
| **Use Case** | Prevents race conditions from React's StrictMode double-mounting |

---

### 2.4 Rate Limit Retry with Exponential Backoff

**File:** `src/api/client.ts`

**Purpose:** Handle HTTP 429 (Too Many Requests) responses gracefully with automatic retry.

**Implementation:**
```typescript
if (response.status === 429 && retryCount < 3) {
    const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
    console.warn(`Rate limited (429). Retrying in ${delay}ms (attempt ${retryCount + 1}/3)`);
    await new Promise(resolve => setTimeout(resolve, delay));
    inflightRequests.delete(cacheKey);
    return fetchJson<T>(url, retryCount + 1);
}
```

| Property | Value |
|----------|-------|
| **Max Retries** | 3 |
| **Delay Pattern** | Exponential: 1s → 2s → 4s |

---

### 2.5 localStorage Persistence (User Preferences)

**File:** `src/hooks/usePersistence.ts`

**Purpose:** Persist user preferences across sessions to avoid re-entering data.

**Implementation:**
```typescript
const STORAGE_KEYS = {
    ORIGIN: 'ontrack_origin',
    DEST: 'ontrack_dest',
    TEMPLATE: 'ontrack_template',
    AUTO_DETECT_ORIGIN: 'ontrack_auto_detect_origin',
    DEFAULT_DEST: 'ontrack_default_dest',
};

// On load:
const [originId, setOriginId] = useState<string>(
    () => getValidatedStationId(STORAGE_KEYS.ORIGIN)
);

// On save:
const saveOrigin = (id: string) => {
    setOriginId(id);
    localStorage.setItem(STORAGE_KEYS.ORIGIN, id);
};
```

| Key | Purpose | TTL |
|-----|---------|-----|
| `ontrack_origin` | Last selected origin station | Permanent |
| `ontrack_dest` | Last selected destination station | Permanent |
| `ontrack_template` | Custom message template | Permanent |
| `ontrack_auto_detect_origin` | Auto-detect origin preference | Permanent |
| `ontrack_default_dest` | Default destination station | Permanent |

---

## 📈 Cache Effectiveness Summary

| Cache | Location | TTL | Cold Start Safe | Primary Benefit |
|-------|----------|-----|-----------------|-----------------|
| OAuth2 Token | Serverless | ~1 hour | ❌ | Reduces auth calls |
| Stations (Server) | Serverless | 1 hour | ❌ | Reduces TDX calls |
| Timetable | Serverless | 5 min | ❌ | Reduces TDX calls |
| Stations (CDN) | Edge | 1 hour | ✅ | Reduces function invocations |
| Schedule (CDN) | Edge | 1 min | ✅ | Reduces function invocations |
| Stations (Client) | Browser | 1 hour | ✅ | Reduces network requests |
| In-Flight Dedup | Browser | Request duration | ✅ | Prevents duplicate requests |
| localStorage | Browser | Permanent | ✅ | Preserves user preferences |

---

## 🔄 Serverless Cold Start Considerations

Since Vercel serverless functions are stateless, in-memory caches (`cachedToken`, `stationsCache`, `timetableCache`) are **not guaranteed to persist** between invocations.

### When Caches Are Lost:
- Function scaled to zero after idle period (~15-30 min)
- New function instance deployed
- High traffic causes multiple concurrent instances (each with its own memory)

### Mitigation Strategies in Use:
1. **CDN/Edge Caching** (`Cache-Control` headers) - persists across cold starts
2. **Client-Side Caching** - reduces need for API calls
3. **stale-while-revalidate** - serves stale data while refreshing in background

### Potential Future Improvements:
- Use Vercel KV or Redis for persistent server-side caching
- Implement Edge Functions for lower latency
- Add Service Worker caching (PWA) for offline support

---

## 🧪 Testing Cache Behavior

### Verify CDN Caching:
```bash
# First request - cache MISS
curl -I https://your-app.vercel.app/api/stations
# Look for: x-vercel-cache: MISS

# Second request (within TTL) - cache HIT
curl -I https://your-app.vercel.app/api/stations
# Look for: x-vercel-cache: HIT
```

### Verify Client-Side Caching:
1. Open DevTools → Network tab
2. Call `api.getStations()` twice
3. Second call should not show a network request

### Verify In-Flight Deduplication:
1. Open DevTools → Console
2. Trigger multiple simultaneous API calls
3. Look for: `"Reusing in-flight request for: /api/stations"`

---

**Last Updated:** 2024
