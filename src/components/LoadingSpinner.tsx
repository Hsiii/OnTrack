import './LoadingSpinner.css';

interface LoadingSpinnerProps {
    message?: string;
}

export function LoadingSpinner({ message }: LoadingSpinnerProps) {
    return (
        <div className='card-panel loading-spinner-container'>
            <div className='spinner loading-spinner'></div>
            {message && (
                <div className='loading-spinner-message'>{message}</div>
            )}
        </div>
    );
}
