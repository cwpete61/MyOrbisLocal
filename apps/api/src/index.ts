import 'dotenv/config'
import express, { type Express } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { getEnv } from '@myorbislocal/config'
import routes from './routes/index.js'
import { webhooksRouter } from './routes/webhooks.js'
import { errorHandler } from './middleware/error-handler.js'
import { startTokenCleanupJob } from './jobs/token-cleanup.js'
import { bootStripeFromConfig } from './lib/stripe.js'

const env = getEnv()
const app: Express = express()
const PORT = 4000

// Trust reverse proxy so rate-limit sees real client IP from X-Forwarded-For.
app.set('trust proxy', 1)

app.use(helmet())

// CORS — allow configured origin(s). Public marketing site can be added here.
const allowedOrigins = [env.APP_BASE_URL].filter(Boolean)
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
      cb(new Error(`CORS: origin ${origin} not allowed`))
    },
    credentials: true,
  }),
)

// Stripe webhook — must receive raw body for signature verification, mounted before express.json().
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }), webhooksRouter)

// Serve uploaded files (logos, etc.) directly.
app.use('/uploads', express.static(process.env['UPLOADS_DIR'] ?? '/app/uploads'))

app.use(express.json({ limit: '4mb' }))
app.use(express.urlencoded({ extended: true }))

const rateLimitResponse = { errors: [{ code: 'RATE_LIMITED', message: 'Too many requests, please slow down' }] }

app.use(
  '/api/auth',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: env.NODE_ENV === 'development' ? 300 : 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: rateLimitResponse,
  }),
)

app.use(
  '/api',
  rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: rateLimitResponse,
    skip: (req) => req.path.startsWith('/auth'),
  }),
)

app.use(
  '/api/webhooks',
  rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: rateLimitResponse,
  }),
)

app.use(routes)

app.use((_req, res) => {
  res.status(404).json({ errors: [{ code: 'NOT_FOUND', message: 'Route not found' }] })
})

app.use(errorHandler)

async function start() {
  await bootStripeFromConfig().catch((err) => {
    console.error('[api] bootStripeFromConfig failed, falling back to env vars:', err?.message ?? err)
  })

  app.listen(PORT, () => {
    console.log(`[api] listening on http://localhost:${PORT}`)
    console.log(`[api] env: ${env.NODE_ENV}`)
    startTokenCleanupJob()
  })
}

void start()

export default app
