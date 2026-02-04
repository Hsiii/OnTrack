import { useEffect, useState } from 'react';

import './App.css';

import { TrainFront } from 'lucide-react';

import { api } from './api/client';
import { InitialLoadingScreen } from './components/InitialLoadingScreen';
import { ShareCard } from './components/ShareCard';
import { StationSelector } from './components/StationSelector';
import { TrainList } from './components/TrainList';
import { usePersistence } from './hooks/usePersistence';
import type { Station, TrainInfo } from './types';

function App() {
    const { originId, setOriginId, destId, setDestId } = usePersistence();

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
            <header className='app-header'>
                <TrainFront
                    className='app-header-icon'
                    size={64}
                    strokeWidth={2}
                />
                <h1 className='app-header-title'>OnTrack</h1>
            </header>
            <div className='app-container'>
                <main className='app-main'>
                    <div>
                        <span className='label-dim'>選擇路線</span>
                        <StationSelector
                            stations={stations}
                            originId={originId}
                            setOriginId={setOriginId}
                            destId={destId}
                            setDestId={setDestId}
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
                            Select both stations to see upcoming trains.
                        </div>
                    )}
                </main>
            </div>
        </>
    );
}

export default App;
