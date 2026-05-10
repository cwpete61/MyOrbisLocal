import { Router, type IRouter } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { requireTenantContext } from '../middleware/rbac.js'
import { asyncHandler } from '../lib/async-handler.js'
import { prisma } from '../lib/prisma.js'

const router: IRouter = Router()
router.use(authenticate, requireTenantContext)

router.get('/dashboard/stats', asyncHandler(async (req, res) => {
  const tenantId = req.user!.currentTenantId!

  const [subscription, memberCount] = await Promise.all([
    prisma.subscription.findFirst({
      where: { tenantId, status: { in: ['ACTIVE', 'TRIALING'] } },
      select: { id: true, status: true, currentPeriodEnd: true, plan: { select: { name: true, code: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.tenantMember.count({ where: { tenantId } }),
  ])

  res.json({
    data: {
      subscription: subscription
        ? {
            planName: subscription.plan.name,
            planCode: subscription.plan.code,
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd,
          }
        : null,
      memberCount,
    },
  })
}))

export default router
