import { Request, Response, NextFunction } from 'express'
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'

// Azure AD konfigurasjon - brukes kun i produksjon
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID || ''
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID || ''
const AZURE_ISSUER =
  process.env.AZURE_TOKEN_ISSUER ||
  `https://login.microsoftonline.com/${AZURE_TENANT_ID}/v2.0`
const AZURE_JWKS_URI =
  process.env.AZURE_JWKS_URI ||
  `https://login.microsoftonline.com/${AZURE_TENANT_ID}/discovery/v2.0/keys`
const AZURE_AUDIENCES = (
  process.env.AZURE_API_AUDIENCES || `${AZURE_CLIENT_ID},api://${AZURE_CLIENT_ID}`
)
  .split(',')
  .map((audience) => audience.trim())
  .filter(Boolean)
const AZURE_ALLOWED_GROUP_IDS = (process.env.AZURE_ALLOWED_GROUP_IDS || '')
  .split(',')
  .map((groupId) => groupId.trim())
  .filter(Boolean)

const jwks = AZURE_TENANT_ID ? createRemoteJWKSet(new URL(AZURE_JWKS_URI)) : null

export interface AuthenticatedRequest extends Request {
  user?: {
    email: string
    name: string
    oid: string
  }
}

function getStringClaim(payload: JWTPayload, claim: string): string | null {
  const value = payload[claim]
  return typeof value === 'string' ? value : null
}

function getStringArrayClaim(payload: JWTPayload, claim: string): string[] {
  const value = payload[claim]
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function isGroupOverageToken(payload: JWTPayload): boolean {
  const hasGroups = payload['hasgroups']
  if (hasGroups === true) return true

  const claimNames = payload['_claim_names']
  if (!claimNames || typeof claimNames !== 'object') return false
  const groupsPointer = (claimNames as Record<string, unknown>)['groups']
  return typeof groupsPointer === 'string' && groupsPointer.length > 0
}

async function verifyToken(token: string): Promise<JWTPayload> {
  if (!jwks) {
    throw new Error('Mangler AZURE_TENANT_ID/AZURE_JWKS_URI')
  }

  let lastError: unknown = null

  for (const audience of AZURE_AUDIENCES) {
    try {
      const { payload } = await jwtVerify(token, jwks, {
        issuer: AZURE_ISSUER,
        audience,
        clockTolerance: '5s',
      })
      return payload
    } catch (error) {
      lastError = error
    }
  }

  throw lastError || new Error('Tokenverifisering feilet')
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  // Skip auth i dev-modus (VIKTIG: Fjern DEV_MODE før produksjon!)
  if (process.env.DEV_MODE === 'true') {
    req.user = {
      email: 'dev@klimaoslo.no',
      name: 'Test Bruker',
      oid: 'dev-oid',
    }
    return next()
  }

  if (!AZURE_TENANT_ID || AZURE_AUDIENCES.length === 0) {
    console.error('Auth config error: mangler AZURE_TENANT_ID/AZURE_API_AUDIENCES')
    return res.status(500).json({
      success: false,
      error: 'Serverkonfigurasjon for autentisering mangler',
    })
  }

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Mangler autorisasjonsheader',
    })
  }

  const token = authHeader.substring(7)

  try {
    const payload = await verifyToken(token)

    const tokenTenantId = getStringClaim(payload, 'tid')
    if (tokenTenantId !== AZURE_TENANT_ID) {
      throw new Error('Ugyldig tenant')
    }

    const email =
      getStringClaim(payload, 'preferred_username') ||
      getStringClaim(payload, 'upn') ||
      getStringClaim(payload, 'email')

    // Sjekk at bruker har oslo.kommune.no domene (inkl. subdomener som kli.oslo.kommune.no)
    if (!email || !email.toLowerCase().endsWith('oslo.kommune.no')) {
      throw new Error('Kun Oslo kommune-brukere har tilgang')
    }

    if (AZURE_ALLOWED_GROUP_IDS.length > 0) {
      const tokenOid = getStringClaim(payload, 'oid') || 'unknown-oid'
      const tokenRoles = getStringArrayClaim(payload, 'roles')

      if (isGroupOverageToken(payload)) {
        console.warn('Auth forbidden: group overage token', {
          oid: tokenOid,
          email,
          roles: tokenRoles,
          allowedGroupIds: AZURE_ALLOWED_GROUP_IDS,
        })
        return res.status(403).json({
          success: false,
          error:
            'Token inneholder ikke gruppeliste (group overage). Bruk app-roller eller Graph-oppslag.',
        })
      }

      const tokenGroups = getStringArrayClaim(payload, 'groups')
      if (tokenGroups.length === 0) {
        console.warn('Auth forbidden: no groups claim in token', {
          oid: tokenOid,
          email,
          roles: tokenRoles,
          allowedGroupIds: AZURE_ALLOWED_GROUP_IDS,
        })
        return res.status(403).json({
          success: false,
          error:
            'Ingen grupper funnet i token. Sjekk Entra Token Configuration for group claims.',
        })
      }

      const isAuthorized = tokenGroups.some((groupId) =>
        AZURE_ALLOWED_GROUP_IDS.includes(groupId)
      )
      if (!isAuthorized) {
        console.warn('Auth forbidden: user not in allowed groups', {
          oid: tokenOid,
          email,
          tokenGroups,
          roles: tokenRoles,
          allowedGroupIds: AZURE_ALLOWED_GROUP_IDS,
        })
        return res.status(403).json({
          success: false,
          error: 'Brukeren mangler nødvendig tilgangsgruppe',
        })
      }
    }

    req.user = {
      email,
      name: getStringClaim(payload, 'name') || email,
      oid: getStringClaim(payload, 'oid') || email,
    }

    return next()
  } catch (err) {
    console.error('Auth error:', err)
    return res.status(401).json({
      success: false,
      error: 'Ugyldig token',
    })
  }
}
