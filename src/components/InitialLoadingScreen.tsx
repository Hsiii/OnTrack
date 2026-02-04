import { TrainFront } from 'lucide-react';

import './InitialLoadingScreen.css';

export function InitialLoadingScreen() {
    return (
        <div className='initial-loading-screen'>
            <TrainFront
                className='initial-loading-icon'
                size={100}
                strokeWidth={2}
            />
        </div>
    );
}
