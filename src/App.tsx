import { useEffect, useState } from 'react';

import './App.css';

import { TrainFront } from 'lucide-react';

import { api } from './api/client';
import { InitialLoadingScreen } from './components/InitialLoadingScreen';
import { IOSInstallPrompt } from './components/IOSInstallPrompt';
import { LanguageDropdown } from './components/LanguageDropdown';
import { ShareCard } from './components/ShareCard';
import { StationSelector } from './components/StationSelector';
import { TrainList } from './components/TrainList';
import { usePersistence } from './hooks/usePersistence';
import { useI18n } from './i18n';
import type { Station, TrainInfo } from './types';

function App() {
    const { t } = useI18n();
    const {
        originId,
        setOriginId,
        destId,
        setDestId,
        defaultDestId,
        setDefaultDestId,
        autoDetectOrigin,
        setAutoDetectOrigin,
    } = usePersistence();

    const [stations, setStations] = useState<Station[]>([]);
    const [selectedTrain, setSelectedTrain] = useState<TrainInfo | null>(null);
    const [stationsLoaded, setStationsLoaded] = useState(false);

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
                    <h1 className='app-header-title'>{t('app.title')}</h1>
                </div>
                <div className='app-header-actions'>
                    <LanguageDropdown />
                </div>
            </header>
            <div className='app-container'>
                <main className='app-main'>
                    <div>
                        <span className='label-dim'>
                            {t('app.selectRoute')}
                        </span>
                        <StationSelector
                            stations={stations}
                            originId={originId}
                            setOriginId={setOriginId}
                            destId={destId}
                            setDestId={setDestId}
                            autoDetectOrigin={autoDetectOrigin}
                            setAutoDetectOrigin={setAutoDetectOrigin}
                            defaultDestId={defaultDestId}
                            setDefaultDestId={setDefaultDestId}
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
                </main>
            </div>
        </>
    );
}

export default App;
