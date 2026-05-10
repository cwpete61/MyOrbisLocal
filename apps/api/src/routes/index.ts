import { Router, type IRouter } from 'express'
import healthRouter from './health.js'
import authRouter from './auth.js'
import authGoogleRouter from './auth-google.js'
import tenantRouter from './tenant.js'
import adminRouter from './admin.js'
import { billingRouter } from './billing.js'
import integrationsRouter from './integrations.js'
import affiliateRouter from './affiliate.js'
import notificationsRouter from './notifications.js'
import dashboardRouter from './dashboard.js'
import pushRouter from './push.js'
import publicRouter from './public.js'

const router: IRouter = Router()

router.use('/', healthRouter)
router.use('/api/auth', authRouter)
// Google Sign-In (anonymous OAuth, distinct from /api/integrations/google/* which
// connects an authenticated tenant's Google account).
router.use('/api', authGoogleRouter)
// Public routes — no auth. Must precede auth-gated routers.
router.use('/api', publicRouter)
router.use('/api', billingRouter)         // contains public /billing/plans
router.use('/api', pushRouter)            // contains public /push/vapid-public-key
router.use('/api', integrationsRouter)    // contains public /integrations/google/callback
router.use('/', affiliateRouter)          // contains public /api/public/track/click + user-scoped routes
router.use('/api', tenantRouter)
router.use('/api/admin', adminRouter)
router.use('/api', notificationsRouter)
router.use('/api', dashboardRouter)

export default router
