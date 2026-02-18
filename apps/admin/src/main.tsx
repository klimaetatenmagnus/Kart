import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { setMsalInstance } from './services/api'
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
  ]).then(async ([{ MsalProvider }, { PublicClientApplication }, { msalConfig }]) => {
    const rootElement = document.getElementById('root')
    if (!rootElement) {
      throw new Error('Fant ikke root-element')
    }

    const msalInstance = new PublicClientApplication(msalConfig)
    await msalInstance.initialize()

    try {
      // Prosesser redirect-respons FØR React rendres
      const response = await msalInstance.handleRedirectPromise()
      if (response?.account) {
        msalInstance.setActiveAccount(response.account)
        window.history.replaceState({}, '', '/')
      } else {
        const accounts = msalInstance.getAllAccounts()
        if (accounts.length > 0) {
          msalInstance.setActiveAccount(accounts[0])
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('MSAL redirect-feil:', error)
      window.sessionStorage.setItem('auth_error', message)
      if (window.location.pathname.startsWith('/auth/callback')) {
        window.history.replaceState({}, '', '/login')
      }
    }

    // Statisk import sikrer at dette er SAMME modul-instans som komponentene bruker
    setMsalInstance(msalInstance)
    createRoot(rootElement).render(
      <StrictMode>
        <MsalProvider instance={msalInstance}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </MsalProvider>
      </StrictMode>
    )
  }).catch((error) => {
    console.error('MSAL init-feil:', error)
    const rootElement = document.getElementById('root')
    if (!rootElement) return
    createRoot(rootElement).render(
      <StrictMode>
        <div style={{ padding: '24px', fontFamily: 'sans-serif' }}>
          Kunne ikke initialisere innlogging.
        </div>
      </StrictMode>
    )
  })
}
