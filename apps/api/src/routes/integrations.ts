import { Router, type IRouter } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { requireTenantContext } from '../middleware/rbac.js'
import * as googleService from '../services/google.service.js'
import { AppError } from '@myorbislocal/shared'
import { getEnv } from '@myorbislocal/config'

const router: IRouter = Router()

// PUBLIC route — registered BEFORE the authenticate middleware below.
// Google redirects the caller's browser here after consent with no auth headers
// attached; OAuth's `state` parameter (validated inside handleGoogleCallback)
// is what authenticates this request.
router.get('/integrations/google/callback', async (req, res, next) => {
  try {
    const env = getEnv()
    const { code, state, error } = req.query as Record<string, string>

    if (error) {
      res.redirect(`${env.APP_BASE_URL}/integrations?google=error&reason=${encodeURIComponent(error)}`)
      return
    }

    if (!code || !state) {
      res.redirect(`${env.APP_BASE_URL}/integrations?google=error&reason=missing_params`)
      return
    }

    const { email } = await googleService.handleGoogleCallback(code, state)
    res.redirect(`${env.APP_BASE_URL}/integrations?google=success&email=${encodeURIComponent(email)}`)
  } catch (err) {
    const env = getEnv()
    const msg = err instanceof AppError ? err.message : 'oauth_failed'
    res.redirect(`${env.APP_BASE_URL}/integrations?google=error&reason=${encodeURIComponent(msg)}`)
    next
  }
})

// All routes below require authentication.
router.use('/integrations', authenticate, requireTenantContext)

router.get('/integrations', async (req, res, next) => {
  try {
    const tenantId = req.user!.currentTenantId!
    const google = await googleService.getGoogleConnection(tenantId)
    res.json({
      data: {
        google: google
          ? {
              status: google.status,
              email: google.email,
              lastVerifiedAt: google.lastVerifiedAt,
              calendarCount: (google.calendarIds as string[]).length,
            }
          : { status: 'NOT_CONNECTED', email: null, lastVerifiedAt: null, calendarCount: 0 },
      },
    })
  } catch (err) {
    next(err)
  }
})

router.post('/integrations/google/start', async (req, res, next) => {
  try {
    const tenantId = req.user!.currentTenantId!
    const userId = req.user!.id
    const { url, state } = await googleService.startGoogleOAuth(tenantId, userId)
    res.json({ data: { url, state } })
  } catch (err) {
    next(err)
  }
})

router.post('/integrations/google/reconnect', async (req, res, next) => {
  try {
    const tenantId = req.user!.currentTenantId!
    const userId = req.user!.id
    const { url, state } = await googleService.startGoogleOAuth(tenantId, userId)
    res.json({ data: { url, state } })
  } catch (err) {
    next(err)
  }
})

router.delete('/integrations/google', async (req, res, next) => {
  try {
    const tenantId = req.user!.currentTenantId!
    const userId = req.user!.id
    await googleService.disconnectGoogle(tenantId, userId)
    res.json({ data: { ok: true } })
  } catch (err) {
    next(err)
  }
})

router.post('/integrations/google/send-email', async (req, res, next) => {
  try {
    const tenantId = req.user!.currentTenantId!
    const { to, subject, body, isHtml } = req.body as { to: string; subject: string; body: string; isHtml?: boolean }
    if (!to || !subject || !body) throw new AppError('VALIDATION_ERROR', 'to, subject, and body are required', 422)
    await googleService.sendGmailEmail(tenantId, { to, subject, body, isHtml })
    res.json({ data: { sent: true } })
  } catch (err) {
    next(err)
  }
})

export default router
