import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/app.css';
import { checkAndApplyAppUpdate } from './utils/appUpdater';
import { initNativeShell } from './utils/nativeBridge';

initNativeShell();

// Enable instant CSS :active feedback on iOS Safari & Android touch screens
if (typeof document !== 'undefined') {
  document.addEventListener('touchstart', () => {}, { passive: true });
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    let refreshing = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((reg) => {
        if (reg.waiting) {
          reg.waiting.postMessage('SKIP_WAITING');
        }
        reg.addEventListener('updatefound', () => {
          const nextWorker = reg.installing;
          if (!nextWorker) return;
          nextWorker.addEventListener('statechange', () => {
            if (
              nextWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              nextWorker.postMessage('SKIP_WAITING');
            }
          });
        });

        reg.update().catch(() => {});

        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            checkAndApplyAppUpdate().catch(() => {});
          }
        });

        setInterval(() => {
          checkAndApplyAppUpdate().catch(() => {});
        }, 5 * 60 * 1000);
      })
      .catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
