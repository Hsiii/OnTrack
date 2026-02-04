import { StrictMode } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { createRoot } from 'react-dom/client';

import './index.css';

import App from './App.tsx';

// Hide native splash screen once React is ready
const nativeSplash = document.getElementById('native-splash');
if (nativeSplash) {
    nativeSplash.style.display = 'none';
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
        <Analytics />
    </StrictMode>
);
