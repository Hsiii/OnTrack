import './TrainListSkeleton.css';

export function TrainListSkeleton() {
    return (
        <div>
            <span className='label-dim'>選擇班次</span>

            <div className='train-list-container'>
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className='glass-panel train-card skeleton-card'
                    >
                        <div className='train-card-left'>
                            <div className='train-card-time-row'>
                                <span className='skeleton skeleton-time'></span>
                                <span className='train-card-arrow skeleton-arrow'></span>
                                <span className='skeleton skeleton-time'></span>
                            </div>
                            <div className='skeleton skeleton-details'></div>
                        </div>
                        <div className='train-card-right'>
                            <span className='skeleton skeleton-badge'></span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
