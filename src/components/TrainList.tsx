import {
    startTransition,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import { api } from '../api/client';
import type { TrainInfo } from '../types';
import { Badge } from './Badge';
import { TrainListSkeleton } from './TrainListSkeleton';

import './TrainList.css';

/**
 * Parse train type to extract simple term
 * Examples:
 * - "自強(商務專開列車)" → "自強"
 * - "區間" → "區間"
 * - "莒光(跨線列車)" → "莒光"
 */
function parseTrainType(trainType: string): string {
    // Remove content in parentheses and any suffix like "號"
    return trainType.split('(')[0].replace(/號$/, '');
}

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

    // Show skeleton if loading and no data yet
    if (shouldShowLoading && trains.length === 0) {
        return <TrainListSkeleton />;
    }

    if (!shouldShowLoading && trains.length === 0)
        return <div className='train-list-empty'>完了 回不了家了</div>;

    return (
        <div className='train-list-container'>
            <span className='label-dim'>選擇列車</span>

            {(shouldShowLoading ? [1, 2, 3] : trains).map((train, idx) => {
                if (shouldShowLoading) {
                    // Render skeleton cards
                    return (
                        <div
                            key={idx}
                            className='glass-panel train-card skeleton-card'
                        >
                            <div className='train-card-left'>
                                <div className='train-card-time-row'>
                                    <span className='skeleton skeleton-time'></span>
                                    <span className='train-card-arrow skeleton-arrow'>
                                        ➔
                                    </span>
                                    <span className='skeleton skeleton-time'></span>
                                </div>
                                <div className='skeleton skeleton-details'></div>
                            </div>
                            <div className='train-card-right'>
                                <span className='skeleton skeleton-badge'></span>
                            </div>
                        </div>
                    );
                }

                // Render actual train data
                const trainData = train as TrainInfo;
                const isSelected = trainData.trainNo === selectedTrainNo;
                const now = new Date();
                const currentTimeStr = now.toLocaleTimeString('en-CA', {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Asia/Taipei',
                });
                const isNext =
                    trainData.departureTime >= currentTimeStr &&
                    !trains.some(
                        (t) =>
                            (t as TrainInfo).departureTime >= currentTimeStr &&
                            (t as TrainInfo).departureTime <
                                trainData.departureTime
                    );

                return (
                    <div
                        key={trainData.trainNo}
                        className={`glass-panel clickable-item train-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => onSelect(trainData)}
                    >
                        <div className='train-card-left'>
                            <div className='train-card-time-row'>
                                <span className='train-card-departure-time'>
                                    {trainData.departureTime}
                                </span>
                                <span className='train-card-arrow'>➔</span>
                                <span className='train-card-arrival-time'>
                                    {trainData.arrivalTime}
                                </span>
                                {isNext && (
                                    <Badge
                                        variant='success'
                                        className='train-card-next-badge'
                                    >
                                        Next
                                    </Badge>
                                )}
                            </div>
                            <div className='train-card-details'>
                                {parseTrainType(trainData.trainType)}{' '}
                                {trainData.trainNo}
                            </div>
                        </div>
                        <div className='train-card-right'>
                            <Badge
                                variant={
                                    trainData.status === 'delayed'
                                        ? 'danger'
                                        : 'success'
                                }
                            >
                                {trainData.delay && trainData.delay > 0
                                    ? `+${trainData.delay} min`
                                    : 'On Time'}
                            </Badge>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
