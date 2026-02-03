import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchTDX } from './_utils/tdx.js';

// Simple in-memory cache for stations data
let stationsCache: { data: TDXStation[]; expires: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour (stations rarely change)

interface TDXStation {
    StationID: string;
    StationName: {
        Zh_tw: string;
        En: string;
    };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        const now = Date.now();
        let data;

        // Check cache first
        if (stationsCache && stationsCache.expires > now) {
            data = stationsCache.data;
            console.log('Using cached stations data');
        } else {
            // Fetch Simplified Station List from TRA using basic tier
            // Filter by fields to reduce size: StationID, StationName
            data = await fetchTDX('v3/Rail/TRA/Station', {
                searchParams: {
                    $select: 'StationID,StationName',
                },
                tier: 'basic',
            });
            stationsCache = { data, expires: now + CACHE_TTL };
        }

        // The response is a direct array, not wrapped in a Stations property
        // Transform to our Station type
        const stations = (Array.isArray(data) ? data : data.Stations || []).map(
            (s: TDXStation) => ({
                id: s.StationID,
                name: s.StationName.Zh_tw,
                nameEn: s.StationName.En,
            })
        );

        res.status(200).json(stations);
    } catch (error: unknown) {
        console.error('Error fetching stations:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: message });
    }
}
