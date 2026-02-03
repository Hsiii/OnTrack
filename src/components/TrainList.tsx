import { useEffect, useState, useCallback, startTransition } from 'react';
import { api } from '../api/client';
import type { TrainInfo } from '../types';

interface TrainListProps {
    originId: string;
    destId: string;
    onSelect: (train: TrainInfo) => void;
    selectedTrainNo: string | null;
}

export function TrainList({ originId, destId, onSelect, selectedTrainNo }: TrainListProps) {
    const [trains, setTrains] = useState<TrainInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);

    const fetchSchedule = useCallback(() => {
        if (!originId || !destId) return;
        setLoading(true);
        setError(null);

        api.getSchedule(originId, destId)
            .then((res) => {
                const now = new Date();
                const currentTimeStr = now.toLocaleTimeString('en-CA', {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Asia/Taipei',
                });

                const nextTrainIndex = res.trains.findIndex(
                    (t) => t.departureTime >= currentTimeStr
                );

                let displayTrains: TrainInfo[] = [];
                let recommendedTrain: TrainInfo | null = null;

                if (nextTrainIndex === -1) {
                    displayTrains = res.trains.slice(-3);
                    recommendedTrain = displayTrains[displayTrains.length - 1];
                } else {
                    const start = Math.max(0, nextTrainIndex - 1);
                    const end = start + 3;
                    displayTrains = res.trains.slice(start, end);
                    recommendedTrain =
                        displayTrains.find((t) => t.departureTime >= currentTimeStr) ||
                        displayTrains[0];
                }

                setTrains(displayTrains);
                setLoading(false);
                setLastFetchTime(Date.now());

                if (recommendedTrain) {
                    onSelect(recommendedTrain);
                }
            })
            .catch((err) => {
                console.error(err);
                setError('Failed to load schedule');
                setLoading(false);
            });
    }, [originId, destId, onSelect]);

    useEffect(() => {
        startTransition(() => {
            fetchSchedule();
        });

        // Poll every minute
        const interval = setInterval(() => {
            startTransition(() => {
                fetchSchedule();
            });
        }, 60000);

        return () => clearInterval(interval);
    }, [fetchSchedule]);

    if (!originId || !destId) return null;
    const date = new Date();
    // Show loading only if no recent data (older than 2 minutes or no data)
    const hasRecentData = lastFetchTime && date !== null && date.getTime() - lastFetchTime < 120000;
    const shouldShowLoading = loading && !hasRecentData;

    if (shouldShowLoading)
        return (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                <div className="spinner" style={{ marginBottom: '1rem' }}></div>
                Loading schedule...
            </div>
        );

    if (error)
        return (
            <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                <div style={{ color: 'var(--color-danger)', marginBottom: '1rem' }}>{error}</div>
                <button onClick={fetchSchedule} className="btn-primary" style={{ width: 'auto' }}>
                    Retry
                </button>
            </div>
        );

    if (trains.length === 0)
        return <div style={{ textAlign: 'center', opacity: 0.7 }}>No trains found.</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <span className="label-dim">Upcoming Trains</span>

            {trains.map((train) => {
                const isSelected = train.trainNo === selectedTrainNo;
                const now = new Date();
                const currentTimeStr = now.toLocaleTimeString('en-CA', {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Asia/Taipei',
                });
                const isNext =
                    train.departureTime >= currentTimeStr &&
                    !trains.some(
                        (t) =>
                            t.departureTime >= currentTimeStr &&
                            t.departureTime < train.departureTime
                    );

                return (
                    <div
                        key={train.trainNo}
                        className="glass-panel clickable-item"
                        onClick={() => onSelect(train)}
                        style={{
                            padding: '1rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            border: isSelected
                                ? '2px solid var(--color-primary)'
                                : '1px solid transparent',
                            background: isSelected
                                ? 'rgba(56, 189, 248, 0.1)'
                                : 'var(--color-card-bg)',
                        }}
                    >
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                                    {train.departureTime}
                                </span>
                                {isNext && (
                                    <span
                                        className="badge badge-success"
                                        style={{
                                            background: 'var(--color-primary)',
                                            color: '#000',
                                        }}
                                    >
                                        Next
                                    </span>
                                )}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                                ➔ {train.arrivalTime} • {train.trainType} {train.trainNo}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div
                                className={`badge ${train.status === 'delayed' ? 'badge-danger' : 'badge-success'}`}
                            >
                                {train.delay && train.delay > 0 ? `+${train.delay} min` : 'On Time'}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
