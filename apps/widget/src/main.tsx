import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { initAnalytics } from './utils/analytics'
import './styles/main.scss'

// Initialiser Piwik Pro analytics
initAnalytics()

// Rapporter høyde til parent-vindu for auto-resize ved embed
if (window.parent !== window) {
  const reportHeight = () => {
    const height = document.documentElement.scrollHeight
    window.parent.postMessage(
      { type: 'klimaoslo-kart-resize', height },
      '*'
    )
  }

  const observer = new ResizeObserver(reportHeight)
  observer.observe(document.documentElement)
  window.addEventListener('load', reportHeight)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
