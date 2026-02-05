import type { VercelRequest, VercelResponse } from '@vercel/node';

import type { TrainInfo as AppTrainInfo } from '../src/types.js';
import { fetchTDX, fetchTDXWithCache } from './_utils/tdx.js';

// Simple in-memory cache for timetable data
// DailyTrainTimetable is static for the day, safe to cache for 1 hour
const timetableCache = new Map<
    string,
    { data: TDXFullTimetable[]; expires: number }
>();
const TIMETABLE_CACHE_TTL = 60 * 60 * 1000; // 1 hour (static schedule data)

// Cache for real-time delay data with Last-Modified support
// TDX updates TrainLiveBoard when trains leave stations (event-driven)
// We use a minimum TTL to avoid excessive API calls, combined with If-Modified-Since
let delayCache: {
    data: Map<string, number>;
    lastModified: string | null;
    expires: number;
} | null = null;
const DELAY_CACHE_MIN_TTL = 5 * 60 * 1000; // 5 minutes minimum between TDX calls

interface TDXStopTime {
    StationID: string;
    StationName: { Zh_tw: string };
    DepartureTime: string;
    ArrivalTime: string;
}

interface TDXFullTimetable {
    TrainInfo: {
        TrainNo: string;
        TrainTypeName: { Zh_tw: string };
        Direction: number;
    };
    StopTimes: TDXStopTime[];
}

// Validate station ID format (alphanumeric with optional dash)
function isValidStationId(id: unknown): id is string {
    return (
        typeof id === 'string' && /^[A-Z0-9-]+$/i.test(id) && id.length <= 10
    );
}

// Validate date format (YYYY-MM-DD)
function isValidDate(date: unknown): date is string {
    return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { origin, dest, date } = req.query;

    if (!origin || !dest) {
        return res
            .status(400)
            .json({ error: 'Missing origin or dest parameters' });
    }

    if (!isValidStationId(origin) || !isValidStationId(dest)) {
        return res.status(400).json({ error: 'Invalid station ID format' });
    }

    if (date && !isValidDate(date)) {
        return res
            .status(400)
            .json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const queryDate =
        (date as string) ||
        new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });

    const isToday =
        queryDate ===
        new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });

    try {
        // 1. Fetch full day schedule with caching
        const scheduleUrl = isToday
            ? `v3/Rail/TRA/DailyTrainTimetable/Today`
            : `v3/Rail/TRA/DailyTrainTimetable/TrainDate/${queryDate}`;

        const cacheKey = `${scheduleUrl}`;
        const now = Date.now();
        let allTrains;

        // Check cache first
        const cached = timetableCache.get(cacheKey);
        if (cached && cached.expires > now) {
            allTrains = cached.data;
            console.log('Using cached timetable data');
        } else {
            allTrains = await fetchTDX(scheduleUrl, { tier: 'basic' });
            timetableCache.set(cacheKey, {
                data: allTrains,
                expires: now + TIMETABLE_CACHE_TTL,
            });
        }

        // 2. Fetch real-time delay data from TrainLiveBoard
        // Uses minimum TTL + If-Modified-Since for optimal caching:
        // - Within TTL: Return cached data immediately (no API call)
        // - After TTL: Make conditional request, TDX returns 304 if unchanged
        let delayMap: Map<string, number>;

        // Check if cache is still within minimum TTL
        if (delayCache && delayCache.expires > now) {
            delayMap = delayCache.data;
            console.log('Using cached delay data (within TTL)');
        } else {
            // Cache expired or doesn't exist, make conditional request
            try {
                const response = await fetchTDXWithCache<{
                    TrainLiveBoards?: { TrainNo: string; DelayTime?: number }[];
                    TrainLiveBoardList?: {
                        TrainNo: string;
                        DelayTime?: number;
                    }[];
                }>('v3/Rail/TRA/TrainLiveBoard', {
                    tier: 'basic',
                    ifModifiedSince: delayCache?.lastModified || undefined,
                });

                if (response.notModified && delayCache) {
                    // Data hasn't changed, reuse cached data and extend TTL
                    delayMap = delayCache.data;
                    delayCache.expires = now + DELAY_CACHE_MIN_TTL;
                    console.log(
                        'TrainLiveBoard not modified (304), extending cache TTL'
                    );
                } else if (response.data) {
                    // New data received, update cache
                    delayMap = new Map<string, number>();
                    const liveData =
                        response.data.TrainLiveBoards ||
                        response.data.TrainLiveBoardList ||
                        [];
                    liveData.forEach(
                        (d: { TrainNo: string; DelayTime?: number }) => {
                            const delay = d.DelayTime ?? 0;
                            delayMap.set(d.TrainNo, delay);
                        }
                    );
                    delayCache = {
                        data: delayMap,
                        lastModified: response.lastModified,
                        expires: now + DELAY_CACHE_MIN_TTL,
                    };
                    console.log(
                        'TrainLiveBoard updated, lastModified:',
                        response.lastModified
                    );
                } else {
                    // Fallback to cached or empty
                    delayMap = delayCache?.data || new Map<string, number>();
                }
            } catch (err) {
                console.warn(
                    'Failed to fetch delay data, continuing without it:',
                    err
                );
                delayMap = delayCache?.data || new Map<string, number>();
            }
        }

        // Cache schedule for 2 minutes on CDN, allow stale for 5 minutes while revalidating
        // This reduces load on TDX API while still providing reasonably fresh data
        res.setHeader(
            'Cache-Control',
            's-maxage=60, stale-while-revalidate=300'
        );

        // 3. Filter and Transform trains that stop at both stations in correct order
        const trains: AppTrainInfo[] = (allTrains.TrainTimetables || [])
            .map((t: TDXFullTimetable) => {
                const stops = t.StopTimes || [];
                const originStop = stops.find(
                    (s: TDXStopTime) => s.StationID === origin
                );
                const destStop = stops.find(
                    (s: TDXStopTime) => s.StationID === dest
                );

                // Skip if train doesn't stop at both stations
                if (!originStop || !destStop) return null;

                // Skip if dest comes before origin (wrong direction)
                const originIdx = stops.indexOf(originStop);
                const destIdx = stops.indexOf(destStop);
                if (destIdx <= originIdx) return null;

                const trainNo = t.TrainInfo.TrainNo;
                const delay = delayMap.get(trainNo);

                let status: 'on-time' | 'delayed' | 'cancelled' | 'unknown' =
                    'unknown';
                if (delay !== undefined) {
                    status = delay > 0 ? 'delayed' : 'on-time';
                }

                return {
                    trainNo,
                    trainType: t.TrainInfo.TrainTypeName.Zh_tw,
                    direction: t.TrainInfo.Direction,
                    originStation: originStop.StationName.Zh_tw,
                    destinationStation: destStop.StationName.Zh_tw,
                    departureTime: originStop.DepartureTime,
                    arrivalTime: destStop.ArrivalTime,
                    delay: delay || 0,
                    status,
                };
            })
            .filter((t: AppTrainInfo | null): t is AppTrainInfo => t !== null);

        // Sort by Departure Time (just in case)
        trains.sort((a, b) => a.departureTime.localeCompare(b.departureTime));

        res.status(200).json({
            date: queryDate,
            origin: { id: origin, name: origin },
            destination: { id: dest, name: dest },
            trains,
        });
    } catch (error: unknown) {
        console.error('Error fetching schedule:', error);
        // Return generic error message to avoid information disclosure
        const message =
            process.env.NODE_ENV === 'development' && error instanceof Error
                ? error.message
                : 'Failed to fetch schedule. Please try again.';
        res.status(500).json({ error: message });
    }
}
