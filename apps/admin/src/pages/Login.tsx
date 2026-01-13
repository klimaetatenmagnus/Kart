import { useMsal } from '@azure/msal-react'
import { PktButton } from '@oslokommune/punkt-react'
import { loginRequest } from '../services/authConfig'

export function Login() {
  const { instance } = useMsal()

  const handleLogin = () => {
    instance.loginRedirect(loginRequest)
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
        <PktButton onClick={handleLogin} skin="primary" size="large">
          Logg inn med Microsoft
        </PktButton>
      </div>
    </div>
  )
}
