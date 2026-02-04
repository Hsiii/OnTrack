import { useState } from 'react';
import { MapPin } from 'lucide-react';

import { STRINGS } from '../constants';
import type { Station } from '../types';
import { StationDropdown } from './StationDropdown';

import './Settings.css';

interface SettingsProps {
    stations: Station[];
    autoDetectOrigin: boolean;
    setAutoDetectOrigin: (value: boolean) => void;
    defaultDestId: string;
    setDefaultDestId: (id: string) => void;
}

export function Settings({
    stations,
    autoDetectOrigin,
    setAutoDetectOrigin,
    defaultDestId,
    setDefaultDestId,
}: SettingsProps) {
    const [destSearch, setDestSearch] = useState('');
    const [destDropdownOpen, setDestDropdownOpen] = useState(false);

    const selectedStation = stations.find((s) => s.id === defaultDestId);

    return (
        <div className='settings-section'>
            <div className='settings-item'>
                <span className='settings-item-label'>
                    {STRINGS.SETTINGS_AUTO_DETECT_ORIGIN}
                </span>
                <div className='settings-switch-row'>
                    <MapPin size={20} className='settings-switch-icon' />
                    <input
                        type='checkbox'
                        className='settings-switch'
                        checked={autoDetectOrigin}
                        onChange={(e) => setAutoDetectOrigin(e.target.checked)}
                    />
                </div>
            </div>

            {/* Spacer to match the arrow width in StationSelector */}
            <div className='settings-spacer' />

            <div className='settings-item'>
                <span className='settings-item-label'>
                    {STRINGS.SETTINGS_DEFAULT_DESTINATION}
                </span>
                <StationDropdown
                    stations={stations}
                    searchValue={destSearch}
                    setSearchValue={setDestSearch}
                    isOpen={destDropdownOpen}
                    setIsOpen={setDestDropdownOpen}
                    selectedId={defaultDestId}
                    onSelect={setDefaultDestId}
                    placeholder={STRINGS.SETTINGS_SELECT_STATION}
                    selectedStation={selectedStation}
                />
            </div>
        </div>
    );
}
