import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { configureAuth } from './auth'
import { loadConfig } from './config'

const root = createRoot(document.getElementById('root')!)

// Config first (it may be fetched from /config.json), then Amplify, then the UI
loadConfig()
  .then(() => {
    configureAuth()
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
  .catch((error: unknown) => {
    root.render(<p>Configuration error: {String(error)}</p>)
  })
