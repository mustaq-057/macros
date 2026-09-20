import React from 'react'
import ReactDOM from 'react-dom/client'
import JazzMacrosApp from '../NutriPulse.jsx'

import { requestNotificationPermission } from './utils/notifications.js'

// Request native Android + web notification permissions on app startup
requestNotificationPermission();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <JazzMacrosApp />
  </React.StrictMode>,
)
