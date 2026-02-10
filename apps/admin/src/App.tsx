import { Routes, Route, Navigate } from 'react-router-dom'
import { useIsAuthenticated } from '@azure/msal-react'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { KartinstansEditor } from './pages/KartinstansEditor'
import { TipsOversikt } from './pages/TipsOversikt'
import { Login } from './pages/Login'

const skipAuth = import.meta.env.VITE_SKIP_AUTH === 'true'

function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useIsAuthenticated()
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
