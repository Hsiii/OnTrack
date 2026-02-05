import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';

import { STRINGS } from '../constants';
import type { Station } from '../types';
import { StationDropdown } from './StationDropdown';

import './StationSelector.css';

interface StationSelectorProps {
    stations: Station[];
    originId: string;
    setOriginId: (id: string) => void;
    destId: string;
    setDestId: (id: string) => void;
    defaultDestId?: string;
    autoDetectOrigin: boolean;
}

const CACHED_ORIGIN_KEY = 'ontrack_cached_origin';

export function StationSelector({
    stations,
    originId,
    setOriginId,
    destId,
    setDestId,
    defaultDestId,
    autoDetectOrigin,
}: StationSelectorProps) {
    const [originSearch, setOriginSearch] = useState('');
    const [destSearch, setDestSearch] = useState('');
    const [originDropdownOpen, setOriginDropdownOpen] = useState(false);
    const [destDropdownOpen, setDestDropdownOpen] = useState(false);
    const hasAutoSelected = useRef(false);
    const hasAutoFilledDest = useRef(false);

    // Auto-select nearest station when autoDetectOrigin is enabled
    useEffect(() => {
        if (stations.length === 0) return;

        // If auto-detect is disabled, use cached origin or first station (only on initial load)
        if (!autoDetectOrigin) {
            if (!hasAutoSelected.current && !originId) {
                hasAutoSelected.current = true;
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
                // Fallback on error: try cached origin first
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
        );
    }, [stations, setOriginId, autoDetectOrigin, originId]);

    // Auto-fill destination with default destination (takes priority over cache)
    useEffect(() => {
        if (
            stations.length === 0 ||
            hasAutoFilledDest.current ||
            !defaultDestId
        )
            return;

        hasAutoFilledDest.current = true;

        // Default destination takes priority - always set it if valid
        if (stations.find((s) => s.id === defaultDestId)) {
            setDestId(defaultDestId);
        }
    }, [stations, defaultDestId, destId, setDestId]);

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
                placeholder={STRINGS.SEARCH_STATION}
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
                placeholder={STRINGS.SEARCH_STATION}
                selectedStation={destStation}
            />
        </div>
    );
}
