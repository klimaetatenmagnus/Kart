import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { KartinstansEditor } from './pages/KartinstansEditor'
import { TipsOversikt } from './pages/TipsOversikt'
import { Login } from './pages/Login'

// Sjekk om vi er i utviklingsmodus
const skipAuth = import.meta.env.VITE_SKIP_AUTH === 'true'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // I utviklingsmodus: alltid tillatt
  if (skipAuth) {
    return <>{children}</>
  }

  // I produksjon: sjekk Azure AD-innlogging
  // Dette krever at useIsAuthenticated er tilgjengelig via MsalProvider
  try {
    const { useIsAuthenticated } = require('@azure/msal-react')
    const isAuthenticated = useIsAuthenticated()
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />
    }
  } catch {
    // Hvis MSAL ikke er lastet, tillat tilgang (development fallback)
  }

  return <>{children}</>
}

function App() {
  return (
    <Routes>
      {!skipAuth && <Route path="/login" element={<Login />} />}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="kart/ny" element={<KartinstansEditor />} />
        <Route path="kart/:slug" element={<KartinstansEditor />} />
        <Route path="tips" element={<TipsOversikt />} />
      </Route>
    </Routes>
  )
}

export default App
