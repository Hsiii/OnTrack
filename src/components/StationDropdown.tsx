import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Clock3, Search, X } from 'lucide-react';

import { useI18n } from '../i18n';
import type { Station } from '../types';
import {
    filterStationsBySearch,
    normalizeSearchValue,
    resolvePreferredStationId,
} from './stationSearchUtils';

import './StationDropdown.css';

interface StationDropdownProps {
    stations: Station[];
    searchValue: string;
    setSearchValue: (value: string) => void;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    selectedId: string;
    onSelect: (id: string) => void;
    placeholder: string;
    title: string;
    selectedStation?: Station;
    onCacheSelection?: (id: string) => void;
}

const RECENT_STATIONS_KEY = 'ontrack_recent_stations';
const MAX_RECENT_STATIONS = 6;

function getRecentStationIds(): string[] {
    try {
        const storedValue = localStorage.getItem(RECENT_STATIONS_KEY);
        if (!storedValue) return [];

        const parsedValue = JSON.parse(storedValue);
        return Array.isArray(parsedValue)
            ? parsedValue.filter(
                  (item): item is string => typeof item === 'string'
              )
            : [];
    } catch {
        return [];
    }
}

function persistRecentStationId(stationId: string) {
    const nextIds = [
        stationId,
        ...getRecentStationIds().filter((item) => item !== stationId),
    ].slice(0, MAX_RECENT_STATIONS);

    localStorage.setItem(RECENT_STATIONS_KEY, JSON.stringify(nextIds));
}

export function StationDropdown({
    stations,
    searchValue,
    setSearchValue,
    isOpen,
    setIsOpen,
    selectedId,
    onSelect,
    placeholder,
    title,
    selectedStation,
    onCacheSelection,
}: StationDropdownProps) {
    const { t } = useI18n();
    const inputRef = useRef<HTMLInputElement>(null);

    const focusSearchInput = () => {
        window.requestAnimationFrame(() => {
            inputRef.current?.focus();
        });
    };

    const handleDismiss = useCallback(() => {
        if (searchValue.trim() === '') {
            onSelect('');
        }

        setSearchValue('');
        setIsOpen(false);
    }, [onSelect, searchValue, setIsOpen, setSearchValue]);

    useEffect(() => {
        if (!isOpen) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const frameId = window.requestAnimationFrame(() => {
            inputRef.current?.focus();
        });

        return () => {
            window.cancelAnimationFrame(frameId);
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                handleDismiss();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleDismiss, isOpen]);

    const recentStations = getRecentStationIds()
        .map((id) => stations.find((station) => station.id === id))
        .filter((station): station is Station => Boolean(station));

    const filteredStations = useMemo(() => {
        if (!searchValue.trim()) return [];

        const normalizedSearchValue = normalizeSearchValue(searchValue);
        const lowerCaseSearchValue = searchValue.toLowerCase();

        return filterStationsBySearch(stations, searchValue)
            .map((station, index) => {
                let priority = 2;

                if (station.id === selectedId) {
                    priority = 0;
                } else if (
                    station.name === searchValue ||
                    station.name === normalizedSearchValue ||
                    station.nameEn.toLowerCase() === lowerCaseSearchValue
                ) {
                    priority = 1;
                }

                return { station, priority, index };
            })
            .sort((a, b) => a.priority - b.priority || a.index - b.index)
            .map(({ station }) => station);
    }, [searchValue, selectedId, stations]);

    const handleSelect = (stationId: string) => {
        const preferredStationId = resolvePreferredStationId(
            stationId,
            stations,
            searchValue
        );

        onSelect(preferredStationId);

        if (onCacheSelection) {
            onCacheSelection(preferredStationId);
        }

        persistRecentStationId(preferredStationId);
        setSearchValue('');
        setIsOpen(false);
    };

    const handleOpen = () => {
        setSearchValue(selectedStation?.name ?? '');
        setIsOpen(true);
    };

    const handleInputChange = (value: string) => {
        setSearchValue(value);
    };

    const visibleStations = searchValue.trim()
        ? filteredStations
        : recentStations;

    return (
        <div className='station-input-wrapper'>
            <button
                type='button'
                className={`station-trigger ${selectedStation ? 'has-value' : ''}`}
                onClick={handleOpen}
            >
                <span className='station-trigger-label'>{placeholder}</span>
                <span className='station-trigger-value'>
                    {selectedStation?.name ?? ''}
                </span>
            </button>

            {isOpen && (
                <div className='station-search-overlay'>
                    <div className='station-search-page'>
                        <div className='station-search-header'>
                            <h2 className='station-search-title'>{title}</h2>
                            <button
                                type='button'
                                className='station-search-close'
                                onClick={handleDismiss}
                                aria-label={t('common.close')}
                            >
                                <X size={30} />
                            </button>
                        </div>

                        <div className='station-search-panel'>
                            <div className='station-search-input-shell'>
                                <Search
                                    size={20}
                                    className='station-search-leading-icon'
                                />
                                <div
                                    className={`station-search-input-copy ${searchValue ? 'has-value' : ''}`}
                                    onMouseDown={focusSearchInput}
                                >
                                    <span className='station-search-input-label'>
                                        {placeholder}
                                    </span>
                                    <input
                                        ref={inputRef}
                                        type='text'
                                        className='station-search-input'
                                        value={searchValue}
                                        placeholder={placeholder}
                                        onChange={(event) =>
                                            handleInputChange(
                                                event.target.value
                                            )
                                        }
                                    />
                                </div>

                                {searchValue && (
                                    <button
                                        type='button'
                                        className='station-search-clear'
                                        onClick={() => setSearchValue('')}
                                        aria-label={t('common.clear')}
                                    >
                                        <X size={18} />
                                    </button>
                                )}
                            </div>

                            <div className='station-search-results'>
                                {visibleStations.length > 0 ? (
                                    <div className='station-search-list'>
                                        {visibleStations.map((station) => {
                                            const isRecent =
                                                !searchValue.trim();

                                            return (
                                                <button
                                                    key={station.id}
                                                    type='button'
                                                    className={`station-search-item ${station.id === selectedId ? 'selected' : ''}`}
                                                    onClick={() =>
                                                        handleSelect(station.id)
                                                    }
                                                >
                                                    <span className='station-search-item-icon'>
                                                        {isRecent ? (
                                                            <Clock3 size={20} />
                                                        ) : (
                                                            <Search size={20} />
                                                        )}
                                                    </span>
                                                    <span className='station-search-item-text'>
                                                        {station.name}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className='station-search-empty'>
                                        {searchValue.trim()
                                            ? t('station.noMatches')
                                            : t('station.noRecentSearches')}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
