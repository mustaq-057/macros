import React from 'react'
import ReactDOM from 'react-dom/client'
import JazzMacrosApp from '../NutriPulse.jsx'

// Request Android permissions on startup via Capacitor
async function requestAppPermissions() {
  try {
    // Web Notifications API (works on web + Android via Capacitor)
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    }
  } catch (e) {
    console.warn('Permission request error:', e);
  }
}

requestAppPermissions();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <JazzMacrosApp />
  </React.StrictMode>,
)
