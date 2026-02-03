import { useState, useMemo } from 'react';
import { Share2, Copy } from 'lucide-react';
import type { TrainInfo } from '../types';

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

    // Simple message: "<time>到<station>"
    const defaultMessage = train ? `${adjustedTime}到${destName}` : '';
    
    // Use train number as key to reset message when train changes
    const trainKey = train?.trainNo || '';
    const [message, setMessage] = useState(defaultMessage);
    const [lastTrainKey, setLastTrainKey] = useState(trainKey);

    // Reset message when train changes
    if (trainKey !== lastTrainKey) {
        setMessage(defaultMessage);
        setLastTrainKey(trainKey);
    }

    const handleShare = async () => {
        if (!train) return;

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
        if (!train) return;

        try {
            await navigator.clipboard.writeText(message);
            alert('訊息已複製到剪貼簿！');
        } catch (err) {
            console.error('Copy failed', err);
            alert('複製失敗，請手動複製訊息。');
        }
    };

    if (!train) return null;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input
                type="text"
                style={{
                    flex: 1,
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'var(--color-text)',
                    padding: '0.75rem 1rem',
                    fontFamily: 'inherit',
                    fontSize: '1rem',
                    borderRadius: '20px',
                    textAlign: 'center',
                    outline: 'none',
                }}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
            />

            <button
                onClick={handleShare}
                style={{
                    width: '44px',
                    height: '44px',
                    color: 'var(--color-text)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    flexShrink: 0,
                }}
            >
                <Share2 size={20} />
            </button>
            <button
                onClick={handleCopy}
                style={{
                    width: '44px',
                    height: '44px',
                    color: 'var(--color-text)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    flexShrink: 0,
                }}
            >
                <Copy size={20} />
            </button>
        </div>
    );
}
