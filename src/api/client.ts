import type { ScheduleResponse, Station } from '../types';

// In-flight request cache to prevent duplicate simultaneous requests
const inflightRequests = new Map<string, Promise<unknown>>();

// Client-side cache for stations (rarely change, cache for 24 hours)
let stationsCache: { data: Station[]; expires: number } | null = null;
const STATIONS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface GetStationsOptions {
    bypassCache?: boolean;
    minDelayMs?: number;
    forceError?: boolean;
    holdForever?: boolean;
}

interface GetScheduleOptions {
    minDelayMs?: number;
    forceError?: boolean;
    holdForever?: boolean;
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson<T>(url: string, retryCount = 0): Promise<T> {
    // Check if there's already an in-flight request for this URL
    const cacheKey = `${url}-${retryCount}`;
    if (inflightRequests.has(cacheKey)) {
        console.log('Reusing in-flight request for:', url);
        return inflightRequests.get(cacheKey) as Promise<T>;
    }

    // Create new request and cache it
    const requestPromise = (async () => {
        try {
            const response = await fetch(url);

            // Handle 429 Too Many Requests with exponential backoff
            if (response.status === 429 && retryCount < 3) {
                const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
                console.warn(
                    `Rate limited (429). Retrying in ${delay}ms (attempt ${retryCount + 1}/3)`
                );
                await new Promise((resolve) => setTimeout(resolve, delay));
                // Clear cache before retry
                inflightRequests.delete(cacheKey);
                return fetchJson<T>(url, retryCount + 1);
            }

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`API Error ${response.status}: ${errorBody}`);
            }

            return response.json();
        } finally {
            // Clean up cache after request completes (success or failure)
            inflightRequests.delete(cacheKey);
        }
    })();

    inflightRequests.set(cacheKey, requestPromise);
    return requestPromise;
}

export const api = {
    getStations: async (
        options: GetStationsOptions = {}
    ): Promise<Station[]> => {
        const {
            bypassCache = false,
            minDelayMs = 0,
            forceError = false,
            holdForever = false,
        } = options;
        const now = Date.now();

        if (forceError) {
            if (minDelayMs > 0) {
                await sleep(minDelayMs);
            }

            throw new Error('Debug station fetch failure');
        }

        if (holdForever) {
            return new Promise<Station[]>(() => {
                // Intentionally unresolved for debug-only loading state testing.
            });
        }

        // Return cached data if still valid
        if (!bypassCache && stationsCache && stationsCache.expires > now) {
            return stationsCache.data;
        }

        const params = new URLSearchParams();
        if (bypassCache) {
            params.set('_nocache', String(Date.now()));
        }

        const requestUrl = params.size
            ? `/api/stations?${params.toString()}`
            : '/api/stations';

        const startedAt = Date.now();
        // Fetch fresh data
        const data = await fetchJson<Station[]>(requestUrl);

        if (minDelayMs > 0) {
            const elapsed = Date.now() - startedAt;
            if (elapsed < minDelayMs) {
                await sleep(minDelayMs - elapsed);
            }
        }

        stationsCache = { data, expires: now + STATIONS_CACHE_TTL };
        return data;
    },

    getSchedule: async (
        origin: string,
        dest: string,
        date?: string,
        options: GetScheduleOptions = {}
    ) => {
        const {
            minDelayMs = 0,
            forceError = false,
            holdForever = false,
        } = options;
        const params = new URLSearchParams({ origin, dest });
        if (date) params.append('date', date);

        if (forceError) {
            if (minDelayMs > 0) {
                await sleep(minDelayMs);
            }

            throw new Error('Debug schedule fetch failure');
        }

        if (holdForever) {
            return new Promise<ScheduleResponse>(() => {
                // Intentionally unresolved for debug-only loading state testing.
            });
        }

        const startedAt = Date.now();
        const data = await fetchJson<ScheduleResponse>(
            `/api/schedule?${params.toString()}`
        );

        if (minDelayMs > 0) {
            const elapsed = Date.now() - startedAt;
            if (elapsed < minDelayMs) {
                await sleep(minDelayMs - elapsed);
            }
        }

        return data;
    },
};
