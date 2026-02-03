import {
    startTransition,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import { api } from '../api/client';
import type { TrainInfo } from '../types';

import './TrainList.css';

interface TrainListProps {
    originId: string;
    destId: string;
    onSelect: (train: TrainInfo) => void;
    selectedTrainNo: string | null;
}

export function TrainList({
    originId,
    destId,
    onSelect,
    selectedTrainNo,
}: TrainListProps) {
    const [trains, setTrains] = useState<TrainInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);
    const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
        undefined
    );
    const lastFetchParamsRef = useRef<string>('');
    const isFirstMountRef = useRef(true);

    const fetchSchedule = useCallback(() => {
        if (!originId || !destId) return;

        // Prevent duplicate requests
        const currentParams = `${originId}-${destId}`;
        if (
            lastFetchParamsRef.current === currentParams &&
            lastFetchTime &&
            Date.now() - lastFetchTime < 3000
        ) {
            console.log('Skipping duplicate request within 3 seconds');
            return;
        }

        lastFetchParamsRef.current = currentParams;
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
                        displayTrains.find(
                            (t) => t.departureTime >= currentTimeStr
                        ) || displayTrains[0];
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
    }, [originId, destId, onSelect, lastFetchTime]);

    useEffect(() => {
        // Clear any pending debounced fetch
        if (fetchTimeoutRef.current) {
            clearTimeout(fetchTimeoutRef.current);
        }

        // Debounce initial fetch (500ms) to allow rapid selection changes
        // Skip debounce on first mount to avoid initial delay
        const delay = isFirstMountRef.current ? 0 : 500;
        isFirstMountRef.current = false;

        fetchTimeoutRef.current = setTimeout(() => {
            startTransition(() => {
                fetchSchedule();
            });
        }, delay);

        // Poll every minute
        const interval = setInterval(() => {
            startTransition(() => {
                fetchSchedule();
            });
        }, 60000);

        return () => {
            clearInterval(interval);
            if (fetchTimeoutRef.current) {
                clearTimeout(fetchTimeoutRef.current);
            }
        };
    }, [fetchSchedule]);

    if (!originId || !destId) return null;
    const date = new Date();
    // Show loading only if no recent data (older than 2 minutes or no data)
    const hasRecentData =
        lastFetchTime &&
        date !== null &&
        date.getTime() - lastFetchTime < 120000;
    const shouldShowLoading = loading && !hasRecentData;

    if (shouldShowLoading)
        return (
            <div className='glass-panel train-list-loading'>
                <div className='spinner train-list-loading-spinner'></div>
                Loading schedule...
            </div>
        );

    if (error)
        return (
            <div className='glass-panel train-list-error'>
                <div className='train-list-error-message'>{error}</div>
                <button
                    onClick={fetchSchedule}
                    className='btn-primary train-list-error-button'
                >
                    Retry
                </button>
            </div>
        );

    if (trains.length === 0)
        return <div className='train-list-empty'>No trains found.</div>;

    return (
        <div className='train-list-container'>
            <span className='label-dim'>Upcoming Trains</span>

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
                        className={`glass-panel clickable-item train-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => onSelect(train)}
                    >
                        <div className='train-card-left'>
                            <div className='train-card-time-row'>
                                <span className='train-card-departure-time'>
                                    {train.departureTime}
                                </span>
                                {isNext && (
                                    <span className='badge badge-success train-card-next-badge'>
                                        Next
                                    </span>
                                )}
                            </div>
                            <div className='train-card-details'>
                                ➔ {train.arrivalTime} • {train.trainType}{' '}
                                {train.trainNo}
                            </div>
                        </div>
                        <div className='train-card-right'>
                            <div
                                className={`badge ${train.status === 'delayed' ? 'badge-danger' : 'badge-success'}`}
                            >
                                {train.delay && train.delay > 0
                                    ? `+${train.delay} min`
                                    : 'On Time'}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
