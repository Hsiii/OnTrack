# Caching Architecture

This document describes the multi-layer caching strategy used in OnTrack to optimize performance, reduce API costs, and improve user experience.

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Data Flow                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   TDX API ──► Serverless Function ──► Vercel CDN ──► Browser ──► UI         │
│      │              │                     │             │                    │
│      │         [In-Memory]           [Edge Cache]  [localStorage]            │
│      │         - Token: ~1hr         - Stations:   - User prefs             │
│      │         - Timetable: 5min       1hr+24hr   - Station IDs             │
│      │         - Stations: 1hr       - Schedule:                            │
│      │                                 1min+5min                             │
│      │                                     │                                 │
│      │                                     ▼                                 │
│      │                              [JS Memory]                              │
│      │                              - Stations: 1hr                          │
│      │                              - In-flight dedup                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Layer 1: TDX (Transport Data eXchange) API

**Source:** Taiwan's official transportation data platform

### OAuth Token Caching

| Property | Value                                      |
| -------- | ------------------------------------------ |
| Location | Serverless function memory                 |
| TTL      | Token expiry minus 60 seconds (~1 hour)    |
| File     | [api/\_utils/tdx.ts](../api/_utils/tdx.ts) |

```typescript
let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

// Token is reused until 60 seconds before expiry
tokenExpiresAt = now + data.expires_in * 1000 - 60000;
```

**Why:** Avoids unnecessary token requests for each API call. The 60-second buffer prevents using expired tokens.

**Limitations:** In serverless environments, memory is not shared across instances. Cold starts will require new tokens.

---

## Layer 2: Vercel Serverless Functions

**Location:** `/api/*.ts`

### 2a. Timetable Cache (Schedule API)

| Property | Value                                                            |
| -------- | ---------------------------------------------------------------- |
| Location | In-memory `Map`                                                  |
| TTL      | 1 hour                                                           |
| Key      | API endpoint URL (e.g., `v3/Rail/TRA/DailyTrainTimetable/Today`) |
| File     | [api/schedule.ts](../api/schedule.ts)                            |

```typescript
const timetableCache = new Map<
    string,
    { data: TDXFullTimetable[]; expires: number }
>();
const TIMETABLE_CACHE_TTL = 60 * 60 * 1000; // 1 hour
```

**Why:** DailyTrainTimetable is static data for the day. It only changes at midnight or when there are schedule modifications. 1-hour cache is safe and reduces TDX API calls significantly.

### 2b. Stations Cache (Stations API)

| Property | Value                                 |
| -------- | ------------------------------------- |
| Location | Module-level variable                 |
| TTL      | 24 hours                              |
| File     | [api/stations.ts](../api/stations.ts) |

```typescript
let stationsCache: { data: TDXStation[]; expires: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
```

**Why:** Station data changes extremely rarely (only when new stations open). 1-hour cache is conservative.

### 2c. Real-Time Delay Data (TrainLiveBoard)

| Property | Value                                                                       |
| -------- | --------------------------------------------------------------------------- |
| Location | Module-level variable                                                       |
| Strategy | **Minimum TTL (5min) + Conditional requests** (`If-Modified-Since` / `304`) |
| Source   | `v3/Rail/TRA/TrainLiveBoard`                                                |
| File     | [api/schedule.ts](../api/schedule.ts)                                       |

```typescript
let delayCache: {
    data: Map<string, number>;
    lastModified: string | null;
    expires: number;
} | null = null;
const DELAY_CACHE_MIN_TTL = 5 * 60 * 1000; // 5 minutes minimum between TDX calls

// Within TTL: Return cached data (no API call)
if (delayCache && delayCache.expires > now) {
    delayMap = delayCache.data;
}
// After TTL: Make conditional request
else {
    const response = await fetchTDXWithCache('v3/Rail/TRA/TrainLiveBoard', {
        ifModifiedSince: delayCache?.lastModified || undefined,
    });
}
```

**How it works:**

1. **Within 5min TTL**: Return cached data immediately (no TDX API call)
2. **After 5min TTL**: Make conditional request with `If-Modified-Since`
3. **304 Not Modified**: Reuse cached data, extend TTL by 5min
4. **200 OK**: Update cache with new data

**Why this hybrid approach:**

- TDX updates TrainLiveBoard when trains leave stations (~2-5 min intervals)
- 5min minimum TTL limits API calls to ~170/day (fits within 3,000/month budget)
- `If-Modified-Since` ensures we get fresh data when TDX actually updates
- Supports ~500 users/month with 1-3 uses each

---

## Layer 3: Vercel Edge (CDN) Cache

**Location:** Vercel's global CDN edge nodes

### Cache-Control Headers

| Endpoint        | `s-maxage` | `stale-while-revalidate` | Total Freshness |
| --------------- | ---------- | ------------------------ | --------------- |
| `/api/stations` | 24 hours   | 7 days                   | Up to 8 days    |
| `/api/schedule` | 1 minute   | 5 minutes                | Up to 6 minutes |

#### Stations API

```typescript
res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
```

- **`s-maxage=86400`**: CDN serves cached response for 24 hours
- **`stale-while-revalidate=604800`**: For the next 7 days, serve stale while fetching fresh data in background

#### Schedule API

```typescript
res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
```

- **`s-maxage=60`**: CDN serves cached response for 1 minute
- **`stale-while-revalidate=300`**: For the next 5 minutes, serve stale while revalidating

### How `stale-while-revalidate` Works

```
Time 0:00 - Request → Cache MISS → Fetch from origin → Return fresh data
Time 0:30 - Request → Cache HIT → Return fresh data (within s-maxage)
Time 1:30 - Request → Cache STALE → Return stale immediately + background revalidation
Time 2:00 - Request → Cache HIT → Return fresh data (background revalidation completed)
```

**Benefits:**

- Users never wait for slow origin fetches after initial load
- Fresh data is always being prepared in the background
- Reduces load on serverless functions

---

## Layer 4: Browser/Client-Side Cache

**Location:** User's browser

### 4a. JavaScript Memory Cache (Stations)

| Property | Value                                     |
| -------- | ----------------------------------------- |
| Location | Module-level variable in `client.ts`      |
| TTL      | 24 hours                                  |
| File     | [src/api/client.ts](../src/api/client.ts) |

```typescript
let stationsCache: { data: Station[]; expires: number } | null = null;
const STATIONS_CACHE_TTL = 60 * 60 * 1000; // 1 hour

export const api = {
    getStations: async (): Promise<Station[]> => {
        const now = Date.now();
        if (stationsCache && stationsCache.expires > now) {
            return stationsCache.data;
        }
        // Fetch fresh data...
    },
};
```

**Why:** Prevents redundant network requests when user navigates within the app. Stations data is loaded once per session.

### 4b. In-Flight Request Deduplication

| Property | Value                                   |
| -------- | --------------------------------------- |
| Location | `Map` in `client.ts`                    |
| Purpose  | Prevent duplicate simultaneous requests |

```typescript
const inflightRequests = new Map<string, Promise<unknown>>();

// If same URL is already being fetched, reuse that promise
if (inflightRequests.has(cacheKey)) {
    return inflightRequests.get(cacheKey) as Promise<T>;
}
```

**Why:** When React re-renders rapidly, multiple components might request the same data simultaneously. This ensures only one actual HTTP request is made.

### 4c. LocalStorage (User Preferences)

| Property | Value                                                         |
| -------- | ------------------------------------------------------------- |
| Location | `localStorage`                                                |
| TTL      | Permanent (until cleared)                                     |
| File     | [src/hooks/usePersistence.ts](../src/hooks/usePersistence.ts) |

**Stored Data:**
| Key | Description |
|-----|-------------|
| `ontrack_origin` | Last selected origin station ID |
| `ontrack_dest` | Last selected destination station ID |
| `ontrack_template` | Custom share message template |
| `ontrack_auto_detect_origin` | Whether to auto-detect origin by location |
| `ontrack_default_dest` | Default destination station ID |

```typescript
const STORAGE_KEYS = {
    ORIGIN: 'ontrack_origin',
    DEST: 'ontrack_dest',
    TEMPLATE: 'ontrack_template',
    AUTO_DETECT_ORIGIN: 'ontrack_auto_detect_origin',
    DEFAULT_DEST: 'ontrack_default_dest',
};
```

**Why:** Remembers user preferences across sessions without requiring authentication.

---

## Layer 5: Data Shown to Users

### What Gets Cached vs. Always Fresh

| Data Type        | Caching   | Max Staleness       | Rationale                                    |
| ---------------- | --------- | ------------------- | -------------------------------------------- |
| Station list     | Heavy     | ~8 days             | Stations rarely change                       |
| Train schedule   | Heavy     | ~1 hour             | Static daily data, changes at midnight       |
| Delay times      | Hybrid    | 5min + event-driven | Min TTL + `If-Modified-Since` for efficiency |
| User preferences | Permanent | N/A                 | User-controlled                              |

### Cache Invalidation Strategy

1. **Time-based expiration**: All caches use TTL-based invalidation
2. **No manual invalidation**: Caches naturally expire
3. **Graceful degradation**: `stale-while-revalidate` ensures users always get data

---

## Performance Optimization Summary

### Request Flow: First Visit

```
User → Vercel CDN (MISS) → Serverless (MISS) → TDX API
                ↓                    ↓
         Cache response       Cache in memory
```

### Request Flow: Subsequent Visit (within cache window)

```
User → Vercel CDN (HIT) → Return cached response immediately
       (No serverless invocation, no TDX API call)
```

### Request Flow: After `s-maxage` but within `stale-while-revalidate`

```
User → Vercel CDN (STALE) → Return stale immediately
                    ↓
              Background: Serverless → TDX API → Update CDN cache
```

---

## Cost & Rate Limit Considerations

| Resource               | Without Caching         | With Caching            | Savings |
| ---------------------- | ----------------------- | ----------------------- | ------- |
| TDX API calls          | 1 per user request      | ~1 per 5 min (schedule) | ~99%    |
| Serverless invocations | 1 per user request      | ~1 per CDN cache miss   | ~90%    |
| Data transfer          | Full response each time | CDN-served              | ~80%    |

---

## Debugging Cache Behavior

### Check CDN Cache Status

Look for `x-vercel-cache` header in network responses:

- `HIT` - Served from CDN cache
- `MISS` - Fetched from origin
- `STALE` - Served stale while revalidating

### Force Cache Bypass

Add a unique query parameter:

```
/api/stations?_nocache=1234567890
```

### View Serverless Logs

```bash
vercel logs --follow
```

Look for:

- `"Using cached timetable data"` - In-memory cache hit
- `"Using cached stations data"` - In-memory cache hit
