import { TrainFront } from 'lucide-react';

import './InitialLoadingScreen.css';

export function InitialLoadingScreen() {
    return (
        <div className='initial-loading-screen'>
            <div className='initial-loading-content'>
                <TrainFront
                    className='initial-loading-icon'
                    size={64}
                    strokeWidth={2}
                />
            </div>
        </div>
    );
}
