import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { kartinstanserRouter } from './routes/kartinstanser.js'
import { stederRouter } from './routes/steder.js'
import { tipsRouter } from './routes/tips.js'
import { placesRouter } from './routes/places.js'
import { imagesRouter } from './routes/images.js'
import { publicRouter } from './routes/public.js'
import { authMiddleware } from './middleware/auth.js'

if (process.env.NODE_ENV === 'production' && process.env.DEV_MODE === 'true') {
  throw new Error('Ugyldig konfigurasjon: DEV_MODE=true er ikke tillatt i produksjon.')
}

if (process.env.NODE_ENV === 'production' && process.env.DEV_MODE !== 'true') {
  const missingAuthConfig = ['AZURE_TENANT_ID', 'AZURE_CLIENT_ID'].filter(
    (key) => !process.env[key]
  )

  if (missingAuthConfig.length > 0) {
    throw new Error(
      `Mangler nodvendig auth-konfigurasjon: ${missingAuthConfig.join(', ')}`
    )
  }
}

const app = express()
const PORT = process.env.PORT || 8080

// Middleware
app.use(helmet())
app.use(cors({
  origin: [
    'http://localhost:3000', // Admin dev
    'http://localhost:3001', // Widget dev
    'https://admin.kart.klimaoslo.no',
    'https://kart.klimaoslo.no',
    'https://klimaoslo-kart-admin-412468299057.europe-west1.run.app', // Cloud Run admin
    'https://klimaoslo-kart-widget-412468299057.europe-west1.run.app', // Cloud Run widget
  ],
  credentials: true,
}))
app.use(express.json())

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Offentlige endepunkter (ingen auth)
app.use('/api/public', publicRouter)

// Beskyttede endepunkter (krever Azure AD-token)
app.use('/api/kartinstanser', authMiddleware, kartinstanserRouter)
app.use('/api/kartinstanser/:slug/steder', authMiddleware, stederRouter)
app.use('/api/tips', authMiddleware, tipsRouter)
app.use('/api/places', authMiddleware, placesRouter)
app.use('/api/images', authMiddleware, imagesRouter)

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err)
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  })
})

app.listen(PORT, () => {
  console.log(`KlimaOslo Kart API running on port ${PORT}`)
})
