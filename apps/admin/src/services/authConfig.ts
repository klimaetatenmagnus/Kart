import { Configuration, LogLevel } from '@azure/msal-browser'

/**
 * Microsoft Entra ID (Azure AD) konfigurasjon
 *
 * Disse verdiene må oppdateres med riktige verdier fra Azure-portalen
 * når appen er registrert i Oslo kommune sin tenant.
 */

// TODO: Oppdater med riktige verdier fra Azure-portalen
const AZURE_CLIENT_ID = import.meta.env.VITE_AZURE_CLIENT_ID || 'your-client-id'
const AZURE_TENANT_ID = import.meta.env.VITE_AZURE_TENANT_ID || 'your-tenant-id'
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI || 'http://localhost:3000'
const DEFAULT_SCOPE = 'User.Read'
const rawApiScope = (import.meta.env.VITE_AZURE_API_SCOPE || '').trim()

function isCustomApiScope(scope: string): boolean {
  return scope.startsWith('api://') || scope.startsWith('https://')
}

function isValidCustomApiScope(scope: string): boolean {
  if (!isCustomApiScope(scope)) return false

  // Krever komplett scope, f.eks. api://<app-id>/access_as_user
  // (ikke bare api://<app-id>)
  const match = scope.match(/^(api:\/\/|https:\/\/)([^/\s]+)\/([^\s]+)$/)
  return Boolean(match)
}

const hasCustomScope = isCustomApiScope(rawApiScope)
const hasValidCustomScope = isValidCustomApiScope(rawApiScope)

if (hasCustomScope && !hasValidCustomScope) {
  console.warn(
    'Ugyldig VITE_AZURE_API_SCOPE. Forventer fullt scope (f.eks. api://<app-id>/access_as_user). Faller tilbake til User.Read.'
  )
}

export const apiScope =
  rawApiScope && (!hasCustomScope || hasValidCustomScope)
    ? rawApiScope
    : DEFAULT_SCOPE
export const usesCustomApiScope = isValidCustomApiScope(apiScope)

export const msalConfig: Configuration = {
  auth: {
    clientId: AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${AZURE_TENANT_ID}`,
    redirectUri: REDIRECT_URI,
    postLogoutRedirectUri: REDIRECT_URI,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return
        switch (level) {
          case LogLevel.Error:
            console.error(message)
            return
          case LogLevel.Warning:
            console.warn(message)
            return
          default:
            return
        }
      },
    },
  },
}

export const loginRequest = {
  scopes: [apiScope],
}

export const graphConfig = {
  graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me',
}
