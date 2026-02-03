import { useState, useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import type { Station } from '../types';

interface StationSelectorProps {
    stations: Station[];
    originId: string;
    setOriginId: (id: string) => void;
    destId: string;
    setDestId: (id: string) => void;
}

const CACHED_ORIGIN_KEY = 'mom_app_cached_origin';

export function StationSelector({
    stations,
    originId,
    setOriginId,
    destId,
    setDestId,
}: StationSelectorProps) {
    const [originSearch, setOriginSearch] = useState('');
    const [destSearch, setDestSearch] = useState('');
    const [originDropdownOpen, setOriginDropdownOpen] = useState(false);
    const [destDropdownOpen, setDestDropdownOpen] = useState(false);
    const originRef = useRef<HTMLDivElement>(null);
    const destRef = useRef<HTMLDivElement>(null);
    const hasAutoSelected = useRef(false);

    // Auto-select nearest station on load
    useEffect(() => {
        if (stations.length === 0 || originId || hasAutoSelected.current) return;

        hasAutoSelected.current = true;

        // Try to use cached origin first
        const cachedOriginId = localStorage.getItem(CACHED_ORIGIN_KEY);
        if (cachedOriginId && stations.find((s) => s.id === cachedOriginId)) {
            setOriginId(cachedOriginId);
            return;
        }

        // Try geolocation
        if (!navigator.geolocation) {
            // Fallback: select first station
            if (stations[0]) setOriginId(stations[0].id);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                let nearestStation = stations[0];
                let minDistance = Number.MAX_VALUE;

                stations.forEach((station) => {
                    if (station.lat && station.lon) {
                        const distance = Math.sqrt(
                            Math.pow(station.lat - latitude, 2) +
                                Math.pow(station.lon - longitude, 2)
                        );
                        if (distance < minDistance) {
                            minDistance = distance;
                            nearestStation = station;
                        }
                    }
                });

                if (nearestStation) {
                    setOriginId(nearestStation.id);
                    localStorage.setItem(CACHED_ORIGIN_KEY, nearestStation.id);
                }
            },
            () => {
                // Fallback on error: select first station
                if (stations[0]) {
                    setOriginId(stations[0].id);
                }
            }
        );
    }, [stations, originId, setOriginId]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (originRef.current && !originRef.current.contains(event.target as Node)) {
                setOriginDropdownOpen(false);
            }
            if (destRef.current && !destRef.current.contains(event.target as Node)) {
                setDestDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOrigin = originSearch
        ? stations.filter(
              (s) =>
                  s.name.includes(originSearch) ||
                  s.nameEn.toLowerCase().includes(originSearch.toLowerCase())
          )
        : stations;

    const filteredDest = destSearch
        ? stations.filter(
              (s) =>
                  s.name.includes(destSearch) ||
                  s.nameEn.toLowerCase().includes(destSearch.toLowerCase())
          )
        : stations;

    const originStation = stations.find((s) => s.id === originId);
    const destStation = stations.find((s) => s.id === destId);

    return (
        <div
            className="glass-panel"
            style={{
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
            }}
        >
            {/* Origin Station */}
            <div ref={originRef} style={{ flex: 1, position: 'relative' }}>
                <input
                    type="text"
                    className="search-input"
                    placeholder="From..."
                    value={originSearch || originStation?.name || ''}
                    onChange={(e) => {
                        setOriginSearch(e.target.value);
                        setOriginDropdownOpen(true);
                    }}
                    onFocus={() => {
                        setOriginSearch('');
                        setOriginDropdownOpen(true);
                    }}
                    style={{
                        width: '100%',
                        padding: '0.6rem',
                        fontSize: '0.9rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        color: 'var(--color-text)',
                    }}
                />
                {originDropdownOpen && (
                    <div
                        style={{
                            position: 'absolute',
                            top: 'calc(100% + 0.25rem)',
                            left: 0,
                            right: 0,
                            maxHeight: '300px',
                            overflowY: 'auto',
                            background: 'var(--color-card-bg)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '6px',
                            zIndex: 1000,
                        }}
                    >
                        {filteredOrigin.map((s) => (
                            <div
                                key={s.id}
                                onClick={() => {
                                    setOriginId(s.id);
                                    localStorage.setItem(CACHED_ORIGIN_KEY, s.id);
                                    setOriginSearch('');
                                    setOriginDropdownOpen(false);
                                }}
                                style={{
                                    padding: '0.6rem',
                                    cursor: 'pointer',
                                    background:
                                        s.id === originId
                                            ? 'rgba(56, 189, 248, 0.1)'
                                            : 'transparent',
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                }}
                                onMouseEnter={(e) => {
                                    if (s.id !== originId) {
                                        e.currentTarget.style.background =
                                            'rgba(255, 255, 255, 0.05)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (s.id !== originId) {
                                        e.currentTarget.style.background = 'transparent';
                                    }
                                }}
                            >
                                <div style={{ fontSize: '0.9rem' }}>{s.name}</div>
                                <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                                    {s.nameEn}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Arrow */}
            <div style={{ color: 'var(--color-text-dim)', flexShrink: 0 }}>
                <ArrowRight size={20} />
            </div>

            {/* Destination Station */}
            <div ref={destRef} style={{ flex: 1, position: 'relative' }}>
                <input
                    type="text"
                    className="search-input"
                    placeholder="To..."
                    value={destSearch || destStation?.name || ''}
                    onChange={(e) => {
                        setDestSearch(e.target.value);
                        setDestDropdownOpen(true);
                    }}
                    onFocus={() => {
                        setDestSearch('');
                        setDestDropdownOpen(true);
                    }}
                    style={{
                        width: '100%',
                        padding: '0.6rem',
                        fontSize: '0.9rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        color: 'var(--color-text)',
                    }}
                />
                {destDropdownOpen && (
                    <div
                        style={{
                            position: 'absolute',
                            top: 'calc(100% + 0.25rem)',
                            left: 0,
                            right: 0,
                            maxHeight: '300px',
                            overflowY: 'auto',
                            background: 'var(--color-card-bg)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '6px',
                            zIndex: 1000,
                        }}
                    >
                        {filteredDest.map((s) => (
                            <div
                                key={s.id}
                                onClick={() => {
                                    setDestId(s.id);
                                    setDestSearch('');
                                    setDestDropdownOpen(false);
                                }}
                                style={{
                                    padding: '0.6rem',
                                    cursor: 'pointer',
                                    background:
                                        s.id === destId ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                }}
                                onMouseEnter={(e) => {
                                    if (s.id !== destId) {
                                        e.currentTarget.style.background =
                                            'rgba(255, 255, 255, 0.05)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (s.id !== destId) {
                                        e.currentTarget.style.background = 'transparent';
                                    }
                                }}
                            >
                                <div style={{ fontSize: '0.9rem' }}>{s.name}</div>
                                <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                                    {s.nameEn}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
