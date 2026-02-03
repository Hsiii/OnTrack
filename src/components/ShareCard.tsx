import { useEffect, useMemo, useState } from 'react';
import { Copy, Share2 } from 'lucide-react';

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
        ? `${adjustedTime}到${destName}`
        : '好像沒車搭了';

    const [message, setMessage] = useState(defaultMessage);

    // Reset message when defaultMessage changes (train selection or delay update)
    useEffect(() => {
        setMessage(defaultMessage);
    }, [defaultMessage]);

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Mom, Come Pick Me Up!',
                    text: message,
                });
            } catch (err) {
                console.log('Share canceled', err);
            }
        } else {
            // Fallback: Copy to clipboard
            navigator.clipboard.writeText(message);
            alert('訊息已複製到剪貼簿！');
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(message);
            alert('訊息已複製到剪貼簿！');
        } catch (err) {
            console.error('Copy failed', err);
            alert('複製失敗，請手動複製訊息。');
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

            <IconButton onClick={handleShare} className='share-card-button'>
                <Share2 size={20} />
            </IconButton>
            <IconButton onClick={handleCopy} className='share-card-button'>
                <Copy size={20} />
            </IconButton>
        </div>
    );
}
