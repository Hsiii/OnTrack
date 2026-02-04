import { useEffect, useRef, useState } from 'react';

import type { Station } from '../types';

interface StationDropdownProps {
    stations: Station[];
    searchValue: string;
    setSearchValue: (value: string) => void;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    selectedId: string;
    onSelect: (id: string) => void;
    placeholder: string;
    selectedStation?: Station;
    onCacheSelection?: (id: string) => void;
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
    selectedStation,
    onCacheSelection,
}: StationDropdownProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
                setIsFocused(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, [setIsOpen]);

    // Normalize search value to match API's character usage (台 → 臺)
    const normalizeSearchValue = (value: string) => value.replace(/台/g, '臺');

    // Check for exact match and auto-select
    const checkAndAutoSelect = (value: string) => {
        const normalizedSearch = normalizeSearchValue(value);
        const matchingStations = stations.filter(
            (s) =>
                s.name.includes(value) ||
                s.name.includes(normalizedSearch) ||
                s.nameEn.toLowerCase().includes(value.toLowerCase())
        );

        if (matchingStations.length === 1) {
            const station = matchingStations[0];
            if (
                station.name === value ||
                station.name === normalizedSearch ||
                station.nameEn.toLowerCase() === value.toLowerCase()
            ) {
                handleSelect(station.id);
                return true;
            }
        }
        return false;
    };

    const filteredStations = searchValue
        ? stations.filter((s) => {
              const normalizedSearch = normalizeSearchValue(searchValue);
              return (
                  s.name.includes(searchValue) ||
                  s.name.includes(normalizedSearch) ||
                  s.nameEn.toLowerCase().includes(searchValue.toLowerCase())
              );
          })
        : [];

    const handleSelect = (id: string) => {
        onSelect(id);
        if (onCacheSelection) {
            onCacheSelection(id);
        }
        setSearchValue('');
        setIsOpen(false);
        setIsFocused(false);
    };

    // Determine the display value for the input
    const displayValue =
        isFocused || isOpen ? searchValue : selectedStation?.name || '';

    return (
        <div ref={ref} className='station-input-wrapper'>
            <input
                type='text'
                className='search-input station-input'
                placeholder={placeholder}
                value={displayValue}
                onChange={(e) => {
                    const value = e.target.value;
                    if (!checkAndAutoSelect(value)) {
                        setSearchValue(value);
                        setIsOpen(true);
                    }
                }}
                onFocus={() => {
                    setIsFocused(true);
                    setSearchValue('');
                    setIsOpen(true);
                }}
                onBlur={() => {
                    setIsFocused(false);
                }}
            />
            {isOpen && (
                <div className='station-dropdown'>
                    {filteredStations.map((s) => (
                        <div
                            key={s.id}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelect(s.id);
                            }}
                            className={`station-dropdown-item ${s.id === selectedId ? 'selected' : ''}`}
                        >
                            <div className='station-dropdown-item-text'>
                                {s.name}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
