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
    // Prosesser redirect-respons FØR React rendres
    const response = await msalInstance.handleRedirectPromise()
    if (response?.account) {
      msalInstance.setActiveAccount(response.account)
      // Naviger bort fra /auth/callback før React rendres
      window.history.replaceState({}, '', '/')
    } else {
      // Sett aktiv konto fra cache hvis bruker allerede er innlogget
      const accounts = msalInstance.getAllAccounts()
      if (accounts.length > 0) {
        msalInstance.setActiveAccount(accounts[0])
      }
    }
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
