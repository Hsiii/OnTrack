import { useState, useEffect } from 'react';
import './App.css';
import { usePersistence } from './hooks/usePersistence';
import { StationSelector } from './components/StationSelector';
import { TrainList } from './components/TrainList';
import { ShareCard } from './components/ShareCard';
import type { TrainInfo, Station } from './types';
import { api } from './api/client';

function App() {
    const { originId, setOriginId, destId, setDestId } = usePersistence();

    const [stations, setStations] = useState<Station[]>([]);
    const [selectedTrain, setSelectedTrain] = useState<TrainInfo | null>(null);

    // Fetch stations at App level to provide names to ShareCard
    useEffect(() => {
        api.getStations().then(setStations).catch(console.error);
    }, []);

    const originStation = stations.find((s) => s.id === originId);
    const destStation = stations.find((s) => s.id === destId);

    const originName = originStation?.name || originId;
    const destName = destStation?.name || destId;

    return (
        <div className="app-container">
            <main style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <StationSelector
                    stations={stations}
                    originId={originId}
                    setOriginId={setOriginId}
                    destId={destId}
                    setDestId={setDestId}
                />

                {originId && destId && (
                    <TrainList
                        originId={originId}
                        destId={destId}
                        onSelect={setSelectedTrain}
                        selectedTrainNo={selectedTrain?.trainNo || null}
                    />
                )}

                {selectedTrain && (
                    <ShareCard train={selectedTrain} originName={originName} destName={destName} />
                )}

                {(!originId || !destId) && (
                    <div style={{ textAlign: 'center', opacity: 0.5, marginTop: '2rem' }}>
                        Select both stations to see upcoming trains.
                    </div>
                )}
            </main>
        </div>
    );
}

export default App;
