import { useEffect, useState } from 'react';

import './App.css';

import { Settings as SettingsIcon, TrainFront } from 'lucide-react';

import { api } from './api/client';
import { InitialLoadingScreen } from './components/InitialLoadingScreen';
import { IOSInstallPrompt } from './components/IOSInstallPrompt';
import { Settings } from './components/Settings';
import { ShareCard } from './components/ShareCard';
import { StationSelector } from './components/StationSelector';
import { TrainList } from './components/TrainList';
import { STRINGS } from './constants';
import { usePersistence } from './hooks/usePersistence';
import type { Station, TrainInfo } from './types';

function App() {
    const {
        originId,
        setOriginId,
        destId,
        setDestId,
        autoDetectOrigin,
        setAutoDetectOrigin,
        defaultDestId,
        setDefaultDestId,
    } = usePersistence();

    const [stations, setStations] = useState<Station[]>([]);
    const [selectedTrain, setSelectedTrain] = useState<TrainInfo | null>(null);
    const [stationsLoaded, setStationsLoaded] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);

    // Fetch stations at App level to provide names to ShareCard
    useEffect(() => {
        api.getStations()
            .then(setStations)
            .catch(console.error)
            .finally(() => setStationsLoaded(true));
    }, []);

    const originStation = stations.find((s) => s.id === originId);
    const destStation = stations.find((s) => s.id === destId);

    const originName = originStation?.name || originId;
    const destName = destStation?.name || destId;

    // Show loading screen only until stations are loaded
    const isInitialLoading = !stationsLoaded;

    return (
        <>
            {isInitialLoading && <InitialLoadingScreen />}
            <IOSInstallPrompt />
            <header className='app-header'>
                <div className='app-header-left'>
                    <TrainFront
                        className='app-header-icon'
                        size={64}
                        strokeWidth={2}
                    />
                    <h1 className='app-header-title'>{STRINGS.APP_TITLE}</h1>
                </div>
                <div className='app-header-actions'>
                    <button
                        className={`settings-button ${settingsOpen ? 'active' : ''}`}
                        onClick={() => setSettingsOpen(!settingsOpen)}
                        aria-label='Settings'
                    >
                        <SettingsIcon size={22} />
                    </button>
                </div>
            </header>
            <div className='app-container'>
                <div
                    className={`app-settings-panel ${settingsOpen ? 'open' : ''}`}
                >
                    <Settings
                        stations={stations}
                        autoDetectOrigin={autoDetectOrigin}
                        setAutoDetectOrigin={setAutoDetectOrigin}
                        defaultDestId={defaultDestId}
                        setDefaultDestId={setDefaultDestId}
                    />
                </div>
                <main className='app-main'>
                    <div>
                        <span className='label-dim'>
                            {STRINGS.SELECT_ROUTE}
                        </span>
                        <StationSelector
                            stations={stations}
                            originId={originId}
                            setOriginId={setOriginId}
                            destId={destId}
                            setDestId={setDestId}
                            defaultDestId={defaultDestId}
                            autoDetectOrigin={autoDetectOrigin}
                        />
                    </div>

                    {originId && destId && (
                        <TrainList
                            originId={originId}
                            destId={destId}
                            onSelect={setSelectedTrain}
                            selectedTrainNo={selectedTrain?.trainNo || null}
                        />
                    )}

                    <ShareCard
                        train={selectedTrain}
                        originName={originName}
                        destName={destName}
                    />

                    {(!originId || !destId) && (
                        <div className='app-placeholder'>
                            {STRINGS.SELECT_STATIONS_PROMPT}
                        </div>
                    )}
                </main>
            </div>
        </>
    );
}

export default App;
