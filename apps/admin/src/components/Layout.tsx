import { useEffect, useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useMsal } from '@azure/msal-react'
import { PktButton } from '@oslokommune/punkt-react'
import { apiFetch } from '../services/api'

const skipAuth = import.meta.env.VITE_SKIP_AUTH === 'true'
const devUserName = import.meta.env.VITE_DEV_USER_NAME || 'Developer'

interface LayoutShellProps {
  onLogout: () => void
  showDevBadge?: boolean
  userName: string
}

export function Layout() {
  if (skipAuth) {
    return (
      <LayoutShell
        userName={devUserName}
        showDevBadge
        onLogout={() => window.location.reload()}
      />
    )
  }

  return <AuthenticatedLayout />
}

function AuthenticatedLayout() {
  const { instance, accounts } = useMsal()
  const userName = accounts[0]?.name || accounts[0]?.username || 'Innlogget bruker'

  const handleLogout = () => {
    void instance.logoutRedirect()
  }

  return <LayoutShell userName={userName} onLogout={handleLogout} />
}

function LayoutShell({ onLogout, showDevBadge = false, userName }: LayoutShellProps) {
  const [nyeTipsCount, setNyeTipsCount] = useState<number>(0)
  const location = useLocation()
  const navigate = useNavigate()

  // Sjekk om vi er på en side med tilbakeknapp
  const isOnEditorPage = location.pathname.startsWith('/kart/')
  const isOnTipsPage = location.pathname === '/tips'
  const showBackButton = isOnEditorPage || isOnTipsPage

  useEffect(() => {
    const fetchNyeTips = async () => {
      try {
        const response = await apiFetch('/api/tips')
        if (response.ok) {
          const data = await response.json()
          const tips = data.data || []
          const nyeCount = tips.filter((t: { status: string }) => t.status === 'ny').length
          setNyeTipsCount(nyeCount)
        }
      } catch {
        // Ignorer feil - vis bare ikke tallet
      }
    }
    void fetchNyeTips()
  }, [])

  return (
    <div className="layout">
      <header className="header">
        <div className="header-left">
          <Link to="/" className="logo">
            <img
              src="https://www.klimaoslo.no/wp-content/uploads/sites/2/2025/02/Oslo-logo-sort-RGB.png"
              alt="Oslo kommune"
              height="80"
            />
          </Link>
          <h1>KlimaOslo kartadmin</h1>
          {showDevBadge && <span className="dev-badge">DEV</span>}
        </div>
        <div className="header-right">
          <span className="user-name">{userName}</span>
          <PktButton onClick={onLogout} skin="secondary" size="small">
            Logg ut
          </PktButton>
        </div>
      </header>

      <nav className="nav">
        <Link to="/" className="nav-link">
          Dashboard
        </Link>
        <Link to="/tips" className="nav-link">
          Tips fra brukere{nyeTipsCount > 0 && ` (${nyeTipsCount})`}
        </Link>
        {showBackButton && (
          <div className="nav-right">
            <PktButton
              skin="secondary"
              size="small"
              variant="icon-left"
              iconName="arrow-return"
              onClick={() => navigate('/')}
            >
              <span>Tilbake</span>
            </PktButton>
          </div>
        )}
      </nav>

      <main className="main">
        <Outlet />
      </main>

      <footer className="footer">
        <p>&copy; {new Date().getFullYear()} Oslo kommune - KlimaOslo</p>
      </footer>
    </div>
  )
}
