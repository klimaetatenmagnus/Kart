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
  scopes: ['User.Read'],
}

export const graphConfig = {
  graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me',
}
