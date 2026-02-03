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

    const filteredStations = searchValue
        ? stations.filter(
              (s) =>
                  s.name.includes(searchValue) ||
                  s.nameEn.toLowerCase().includes(searchValue.toLowerCase())
          )
        : stations;

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
                    setSearchValue(e.target.value);
                    setIsOpen(true);
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
                            onClick={() => handleSelect(s.id)}
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
