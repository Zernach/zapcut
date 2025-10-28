import React from 'react';
import ReactDOM from 'react-dom/client';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import App from './App';
import './index.css';

// Ensure the window is ready before mounting React
const appWindow = getCurrentWebviewWindow();
appWindow.show().then(() => {
    ReactDOM.createRoot(document.getElementById('root')!).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}).catch(err => {
    console.error('Failed to show window:', err);
    // Fallback in case appWindow.show() fails
    ReactDOM.createRoot(document.getElementById('root')!).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
});

