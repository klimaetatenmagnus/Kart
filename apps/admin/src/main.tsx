import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles/main.scss'

// I utviklingsmodus hopper vi over Azure AD
const skipAuth = import.meta.env.VITE_SKIP_AUTH === 'true'

if (skipAuth) {
  // Kjor uten MSAL i development
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>
  )
} else {
  // Produksjon: bruk MSAL
  Promise.all([
    import('@azure/msal-react'),
    import('@azure/msal-browser'),
    import('./services/authConfig'),
    import('./services/api'),
  ]).then(async ([{ MsalProvider }, { PublicClientApplication }, { msalConfig }, { setMsalInstance }]) => {
    const msalInstance = new PublicClientApplication(msalConfig)
    await msalInstance.initialize()
    setMsalInstance(msalInstance)
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <MsalProvider instance={msalInstance}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </MsalProvider>
      </StrictMode>
    )
  })
}
