import {
    startTransition,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import { api } from '../api/client';
import { STRINGS } from '../constants';
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
    const [hasData, setHasData] = useState(false);
    const lastFetchTimeRef = useRef<number | null>(null);
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
            lastFetchTimeRef.current &&
            Date.now() - lastFetchTimeRef.current < 3000
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
                lastFetchTimeRef.current = Date.now();
                setHasData(true);

                if (recommendedTrain) {
                    onSelect(recommendedTrain);
                }
            })
            .catch((err) => {
                console.error(err);
                setError(STRINGS.FAILED_TO_LOAD_SCHEDULE);
                setLoading(false);
            });
    }, [originId, destId, onSelect]);

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
    // Show loading only if we don't have any data yet
    const shouldShowLoading = loading && !hasData;

    if (error)
        return (
            <div className='card-panel train-list-error'>
                <div className='train-list-error-message'>{error}</div>
                <button
                    onClick={fetchSchedule}
                    className='btn-primary train-list-error-button'
                >
                    {STRINGS.RETRY}
                </button>
            </div>
        );

    // Show skeleton if loading and no data yet
    if (shouldShowLoading && trains.length === 0) {
        return <TrainListSkeleton />;
    }

    if (!shouldShowLoading && trains.length === 0)
        return (
            <div className='train-list-empty'>
                {STRINGS.NO_TRAINS_AVAILABLE}
            </div>
        );

    // Compute current time and next train index once (outside the map loop)
    const now = new Date();
    const currentTimeStr = now.toLocaleTimeString('en-CA', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Taipei',
    });
    const nextTrainNo = trains.find(
        (t) => t.departureTime >= currentTimeStr
    )?.trainNo;

    return (
        <div>
            <span className='label-dim'>{STRINGS.SELECT_TRAIN}</span>

            <div className='train-list-container'>
                {(shouldShowLoading ? [1, 2, 3] : trains).map((train, idx) => {
                    if (shouldShowLoading) {
                        // Render skeleton cards
                        return (
                            <div
                                key={idx}
                                className='card-panel train-card skeleton-card'
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
                    const isNext = trainData.trainNo === nextTrainNo;

                    return (
                        <div
                            key={trainData.trainNo}
                            className={`card-panel clickable-item train-card ${isSelected ? 'selected' : ''}`}
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
                                            {STRINGS.NEXT_TRAIN}
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
                                        ? STRINGS.DELAY_MINUTES(trainData.delay)
                                        : STRINGS.ON_TIME}
                                </Badge>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
