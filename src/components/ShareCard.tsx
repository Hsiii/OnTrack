import { useEffect, useMemo, useState } from 'react';
import { Share2 } from 'lucide-react';

import { STRINGS } from '../constants';
import type { TrainInfo } from '../types';
import { IconButton } from './IconButton';

import './ShareCard.css';

interface ShareCardProps {
    train: TrainInfo | null;
    originName: string;
    destName: string;
}

export function ShareCard({ train, destName }: ShareCardProps) {
    // Calculate adjusted arrival time (with delay)
    const adjustedTime = useMemo(() => {
        if (!train) return '';
        if (!train.delay || train.delay === 0) return train.arrivalTime;

        const [hours, minutes] = train.arrivalTime.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes + train.delay;
        const adjustedHours = Math.floor(totalMinutes / 60) % 24;
        const adjustedMinutes = totalMinutes % 60;
        return `${String(adjustedHours).padStart(2, '0')}:${String(adjustedMinutes).padStart(2, '0')}`;
    }, [train]);

    // Simple message: "<time>到<station>" or no train message
    const defaultMessage = train
        ? STRINGS.ARRIVAL_MESSAGE(adjustedTime, destName)
        : STRINGS.NO_TRAIN_MESSAGE;

    const [message, setMessage] = useState(defaultMessage);

    // Reset message when defaultMessage changes (train selection or delay update)
    useEffect(() => {
        setMessage(defaultMessage);
    }, [defaultMessage]);

    const handleShareLine = () => {
        const encodedMessage = encodeURIComponent(message);
        window.location.href = `https://line.me/R/msg/text/?${encodedMessage}`;
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    text: message,
                });
            } catch (err) {
                console.log('Share canceled', err);
            }
        } else {
            // Fallback: Copy to clipboard
            try {
                await navigator.clipboard.writeText(message);
            } catch (err) {
                console.error('Copy failed', err);
            }
        }
    };

    return (
        <div className='message-bar-fixed share-card-container'>
            <input
                type='text'
                className='share-card-input'
                value={message}
                onChange={(e) => setMessage(e.target.value)}
            />

            <IconButton
                onClick={handleShare}
                className='share-card-button share-button'
            >
                <Share2 />
            </IconButton>
            <IconButton
                onClick={handleShareLine}
                className='share-card-button line-button'
            >
                <img src='/line-icon.svg' alt={STRINGS.LINE_ICON_ALT} />
            </IconButton>
        </div>
    );
}
