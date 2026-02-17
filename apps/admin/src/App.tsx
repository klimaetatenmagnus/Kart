import { Routes, Route, Navigate } from 'react-router-dom'
import { useIsAuthenticated, useMsal } from '@azure/msal-react'
import { InteractionStatus } from '@azure/msal-browser'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { KartinstansEditor } from './pages/KartinstansEditor'
import { TipsOversikt } from './pages/TipsOversikt'
import { Login } from './pages/Login'

const skipAuth = import.meta.env.VITE_SKIP_AUTH === 'true'

function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useIsAuthenticated()
  const { inProgress } = useMsal()

  // Vent til MSAL er ferdig med å prosessere redirect-callback
  if (inProgress !== InteractionStatus.None) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Logger inn...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (skipAuth) {
    return <>{children}</>
  }
  return <AuthGuard>{children}</AuthGuard>
}

function App() {
  return (
    <Routes>
      {!skipAuth && <Route path="/login" element={<Login />} />}
      {!skipAuth && <Route path="/auth/callback" element={<AuthCallback />} />}
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

/** Håndterer redirect tilbake fra Microsoft etter innlogging */
function AuthCallback() {
  const isAuthenticated = useIsAuthenticated()
  const { inProgress } = useMsal()

  if (inProgress !== InteractionStatus.None) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Logger inn...</div>
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <Navigate to="/login" replace />
}

export default App
