const CLIENT_ID = process.env.TDX_CLIENT_ID;
const CLIENT_SECRET = process.env.TDX_CLIENT_SECRET;
const TOKEN_URL =
    'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token';

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

async function getAccessToken(): Promise<string | null> {
    const now = Date.now();
    if (cachedToken && now < tokenExpiresAt) {
        return cachedToken;
    }

    if (!CLIENT_ID || !CLIENT_SECRET) {
        console.warn(
            'TDX_CLIENT_ID or TDX_CLIENT_SECRET missing. Using Visitor Mode (limit 20 req/day).'
        );
        return null;
    }

    // Avoid logging credentials in production
    if (process.env.NODE_ENV === 'development') {
        console.log('Requesting new TDX access token...');
    }

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);

    const response = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.warn(
            `Failed to get token: ${response.status} ${errorText}. Falling back to Visitor Mode.`
        );
        return null;
    }

    const data = await response.json();
    cachedToken = data.access_token;
    // Set expiration slightly before actual expiry (expires_in is in seconds)
    tokenExpiresAt = now + data.expires_in * 1000 - 60000;

    return cachedToken;
}

export type TDXFormat = 'JSON' | 'XML';
export type TDXTier = 'basic' | 'advanced';

export interface TDXOptions {
    /** Query parameters to append to the request */
    searchParams?: Record<string, string>;
    /** API tier: basic or advanced (default: basic) */
    tier?: TDXTier;
    /** Response format: JSON or XML (default: JSON) */
    format?: TDXFormat;
    /** If-Modified-Since header value for conditional requests */
    ifModifiedSince?: string;
}

export interface TDXResponse<T> {
    data: T;
    lastModified: string | null;
    notModified: boolean;
}

/**
 * Fetch data from TDX (Transport Data eXchange) API with conditional request support
 * @param path - API endpoint path (e.g., 'v3/Rail/TRA/Station')
 * @param options - Request options
 * @returns Object with data, lastModified header, and notModified flag
 * @throws Error if the request fails
 */
export async function fetchTDXWithCache<T>(
    path: string,
    options: TDXOptions = {}
): Promise<TDXResponse<T | null>> {
    const {
        searchParams = {},
        tier = 'basic',
        format = 'JSON',
        ifModifiedSince,
    } = options;

    const token = await getAccessToken();
    const url = new URL(`https://tdx.transportdata.tw/api/${tier}/${path}`);

    // Add all search parameters
    Object.entries(searchParams).forEach(([key, value]) =>
        url.searchParams.append(key, value)
    );

    // Add required $format parameter
    url.searchParams.append('$format', format);

    const headers: Record<string, string> = {
        'Accept': 'application/json',
        'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    // Add If-Modified-Since header for conditional requests
    if (ifModifiedSince) {
        headers['If-Modified-Since'] = ifModifiedSince;
    }

    const response = await fetch(url.toString(), { headers });

    // Handle 304 Not Modified - data hasn't changed
    if (response.status === 304) {
        console.log('TDX returned 304 Not Modified for:', path);
        return {
            data: null,
            lastModified: ifModifiedSince || null,
            notModified: true,
        };
    }

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
            `TDX API Error: ${response.status} ${response.statusText} - ${errorBody}`
        );
    }

    const lastModified = response.headers.get('Last-Modified');
    const data = await response.json();

    return {
        data,
        lastModified,
        notModified: false,
    };
}

/**
 * Fetch data from TDX (Transport Data eXchange) API
 * @param path - API endpoint path (e.g., 'v3/Rail/TRA/Station')
 * @param options - Request options
 * @returns Parsed JSON response
 * @throws Error if the request fails
 */
export async function fetchTDX(path: string, options: TDXOptions = {}) {
    const { searchParams = {}, tier = 'basic', format = 'JSON' } = options;

    const token = await getAccessToken();
    const url = new URL(`https://tdx.transportdata.tw/api/${tier}/${path}`);

    // Add all search parameters
    Object.entries(searchParams).forEach(([key, value]) =>
        url.searchParams.append(key, value)
    );

    // Add required $format parameter
    url.searchParams.append('$format', format);

    const headers: Record<string, string> = {
        'Accept': 'application/json',
        'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
        console.log('Using authenticated request to:', url.toString());
    } else {
        console.warn('Making unauthenticated request to:', url.toString());
    }

    const response = await fetch(url.toString(), { headers });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
            `TDX API Error: ${response.status} ${response.statusText} - ${errorBody}`
        );
    }

    return response.json();
}
