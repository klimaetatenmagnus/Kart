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
  import('@azure/msal-react').then(({ MsalProvider }) => {
    import('@azure/msal-browser').then(({ PublicClientApplication }) => {
      Promise.all([
        import('./services/authConfig'),
        import('./services/api'),
      ]).then(([{ msalConfig }, { setMsalInstance }]) => {
        const msalInstance = new PublicClientApplication(msalConfig)
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
    })
  })
}
