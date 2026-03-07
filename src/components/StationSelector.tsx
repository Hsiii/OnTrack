import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';

import { useI18n } from '../i18n';
import type { Station } from '../types';
import { StationDropdown } from './StationDropdown';

import './StationSelector.css';

interface StationSelectorProps {
    stations: Station[];
    originId: string;
    setOriginId: (id: string) => void;
    destId: string;
    setDestId: (id: string) => void;
    autoDetectOrigin: boolean;
}

const CACHED_ORIGIN_KEY = 'ontrack_cached_origin';

export function StationSelector({
    stations,
    originId,
    setOriginId,
    destId,
    setDestId,
    autoDetectOrigin,
}: StationSelectorProps) {
    const { t } = useI18n();
    const [originSearch, setOriginSearch] = useState('');
    const [destSearch, setDestSearch] = useState('');
    const [originDropdownOpen, setOriginDropdownOpen] = useState(false);
    const [destDropdownOpen, setDestDropdownOpen] = useState(false);
    const hasAutoSelected = useRef(false);
    const isGeolocationPending = useRef(false);
    const prevAutoDetectOrigin = useRef(autoDetectOrigin);

    // Auto-select nearest station when autoDetectOrigin is enabled
    useEffect(() => {
        const wasAutoDetectOrigin = prevAutoDetectOrigin.current;
        const isToggledOn = !wasAutoDetectOrigin && autoDetectOrigin;
        prevAutoDetectOrigin.current = autoDetectOrigin;

        if (stations.length === 0) return;

        // If auto-detect is disabled, use cached origin or first station (only on initial load)
        if (!autoDetectOrigin) {
            hasAutoSelected.current = false; // Reset so toggling back on will re-trigger geolocation
            if (!originId) {
                const cachedOriginId = localStorage.getItem(CACHED_ORIGIN_KEY);
                if (
                    cachedOriginId &&
                    stations.find((s) => s.id === cachedOriginId)
                ) {
                    setOriginId(cachedOriginId);
                } else if (stations[0]) {
                    setOriginId(stations[0].id);
                }
            }
            return;
        }

        // Auto-detect is enabled - request geolocation
        if (hasAutoSelected.current || isGeolocationPending.current) return;

        if (!navigator.geolocation) {
            // Fallback: select first station
            if (stations[0]) setOriginId(stations[0].id);
            hasAutoSelected.current = true;
            return;
        }

        const fallbackToCached = () => {
            isGeolocationPending.current = false;
            const cachedOriginId = localStorage.getItem(CACHED_ORIGIN_KEY);
            if (
                cachedOriginId &&
                stations.find((s) => s.id === cachedOriginId)
            ) {
                setOriginId(cachedOriginId);
            } else if (stations[0]) {
                setOriginId(stations[0].id);
            }
            hasAutoSelected.current = true;
        };

        const requestGeolocation = () => {
            isGeolocationPending.current = true;
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    isGeolocationPending.current = false;
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
                        localStorage.setItem(
                            CACHED_ORIGIN_KEY,
                            nearestStation.id
                        );
                    }
                    hasAutoSelected.current = true;
                },
                fallbackToCached,
                {
                    enableHighAccuracy: false,
                    timeout: 10000,
                    maximumAge: 300000,
                }
            );
        };

        // If user explicitly toggled this on, always try requesting geolocation again.
        // This allows retrying permission after a prior rejection.
        if (isToggledOn) {
            requestGeolocation();
            return;
        }

        // Check permission state first to avoid showing the browser prompt on every load.
        // Only call getCurrentPosition if permission was already granted.
        if (navigator.permissions) {
            navigator.permissions
                .query({ name: 'geolocation' })
                .then((result) => {
                    if (result.state === 'granted') {
                        // Permission already granted — silently get position
                        requestGeolocation();
                    } else if (result.state === 'prompt') {
                        // Never asked yet — ask once, then respect the answer
                        requestGeolocation();
                    } else {
                        // Denied — fall back to cache
                        fallbackToCached();
                    }
                })
                .catch(() => {
                    // Permissions API failed — just request geolocation directly
                    requestGeolocation();
                });
        } else {
            // Permissions API not supported — request directly
            requestGeolocation();
        }
    }, [stations, setOriginId, autoDetectOrigin, originId]);

    const originStation = stations.find((s) => s.id === originId);
    const destStation = stations.find((s) => s.id === destId);

    const handleOriginSelect = (id: string) => {
        setOriginId(id);
        localStorage.setItem(CACHED_ORIGIN_KEY, id);
    };

    const handleOriginDropdownOpen = (isOpen: boolean) => {
        setOriginDropdownOpen(isOpen);
        if (isOpen) {
            setDestDropdownOpen(false);
        }
    };

    const handleDestDropdownOpen = (isOpen: boolean) => {
        setDestDropdownOpen(isOpen);
        if (isOpen) {
            setOriginDropdownOpen(false);
        }
    };

    return (
        <div className='station-selector-container'>
            {/* Origin Station */}
            <StationDropdown
                stations={stations}
                searchValue={originSearch}
                setSearchValue={setOriginSearch}
                isOpen={originDropdownOpen}
                setIsOpen={handleOriginDropdownOpen}
                selectedId={originId}
                onSelect={handleOriginSelect}
                placeholder={t('app.searchStation')}
                selectedStation={originStation}
                onCacheSelection={(id) =>
                    localStorage.setItem(CACHED_ORIGIN_KEY, id)
                }
            />

            {/* Arrow */}
            <div className='station-arrow'>
                <ArrowRight size={20} />
            </div>

            {/* Destination Station */}
            <StationDropdown
                stations={stations}
                searchValue={destSearch}
                setSearchValue={setDestSearch}
                isOpen={destDropdownOpen}
                setIsOpen={handleDestDropdownOpen}
                selectedId={destId}
                onSelect={setDestId}
                placeholder={t('app.searchStation')}
                selectedStation={destStation}
            />
        </div>
    );
}
