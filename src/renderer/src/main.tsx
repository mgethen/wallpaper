import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import Screensaver from './Screensaver'

const isScreensaver = window.location.hash === '#/screensaver'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    {isScreensaver ? <Screensaver /> : <App />}
  </React.StrictMode>
)
