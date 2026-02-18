import { useState } from 'react'
import { useMsal } from '@azure/msal-react'
import { PktAlert, PktButton } from '@oslokommune/punkt-react'
import { loginRequest } from '../services/authConfig'

export function Login() {
  const { instance } = useMsal()
  const [errorMessage, setErrorMessage] = useState<string | null>(() => {
    const stored = window.sessionStorage.getItem('auth_error')
    if (!stored) return null
    window.sessionStorage.removeItem('auth_error')
    return stored
  })

  const handleLogin = () => {
    void instance.loginRedirect(loginRequest).catch((error) => {
      const message = error instanceof Error ? error.message : String(error)
      setErrorMessage(message)
    })
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <img
          src="https://www.klimaoslo.no/wp-content/uploads/sites/2/2025/02/Oslo-logo-sort-RGB.png"
          alt="Oslo kommune"
          className="login-logo"
        />
        <h1>KlimaOslo Kartadmin</h1>
        <p>Logg inn med din Oslo kommune-konto for a administrere kartinstanser.</p>
        {errorMessage && (
          <PktAlert skin="error" style={{ marginBottom: 'var(--pkt-spacing-16)' }}>
            Innlogging feilet. {errorMessage}
          </PktAlert>
        )}
        <PktButton onClick={handleLogin} skin="primary" size="large">
          Logg inn med Microsoft
        </PktButton>
      </div>
    </div>
  )
}
