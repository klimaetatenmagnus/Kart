import { Request, Response, NextFunction } from 'express'

// Azure AD konfigurasjon - brukes kun i produksjon
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID || ''
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID || ''

export interface AuthenticatedRequest extends Request {
  user?: {
    email: string
    name: string
    oid: string
  }
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

  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Mangler autorisasjonsheader',
    })
  }

  const token = authHeader.substring(7)

  try {
    // Valider token mot Azure AD
    // I produksjon bor vi bruke jose eller passport-azure-ad for full validering
    // Her er en forenklet versjon som dekoder token
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())

    // Sjekk at token er for riktig tenant og app
    if (payload.tid !== AZURE_TENANT_ID) {
      throw new Error('Ugyldig tenant')
    }

    if (payload.aud !== AZURE_CLIENT_ID && payload.aud !== `api://${AZURE_CLIENT_ID}`) {
      throw new Error('Ugyldig audience')
    }

    // Sjekk at token ikke er utlopt
    if (payload.exp * 1000 < Date.now()) {
      throw new Error('Token er utlopt')
    }

    // Sjekk at bruker har oslo.kommune.no domene (inkl. subdomener som kli.oslo.kommune.no)
    const email = payload.preferred_username || payload.upn || payload.email
    if (!email?.endsWith('oslo.kommune.no')) {
      throw new Error('Kun Oslo kommune-brukere har tilgang')
    }

    req.user = {
      email,
      name: payload.name || email,
      oid: payload.oid,
    }

    next()
  } catch (err) {
    console.error('Auth error:', err)
    return res.status(401).json({
      success: false,
      error: 'Ugyldig token',
    })
  }
}
