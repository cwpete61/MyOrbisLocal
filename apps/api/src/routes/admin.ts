import { Router, type IRouter } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/authenticate.js'
import { requirePlatformAdmin, requirePlatformSuperAdmin, requirePlatformSupport } from '../middleware/rbac.js'
import * as adminService from '../services/admin.service.js'
import { AppError } from '@myorbislocal/shared'
import { getEnv } from '@myorbislocal/config'
import { prisma } from '../lib/prisma.js'
import * as systemConfig from '../services/system-config.service.js'
import { writeAuditLogFromRequest } from '../lib/audit.js'

const router: IRouter = Router()
// File-level guard is the WEAKEST platform-staff role (Support). Read-only
// routes inherit this guard and need nothing more. Routes that perform
// privileged writes get an extra `requirePlatformAdmin` middleware in
// their definition below; credential-edit routes get an even stricter
// `requirePlatformSuperAdmin`. Three tiers, enforced server-side.
router.use(authenticate, requirePlatformSupport)

router.get('/platform/status', async (_req, res, next) => {
  try {
    const env = getEnv()
    const [tenantCount, activeCount] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { status: 'ACTIVE' } }),
    ])
    res.json({
      data: {
        google: {
          configured: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
          redirectUri: env.GOOGLE_OAUTH_REDIRECT_URI ?? `${env.APP_BASE_URL?.replace('3000', '4000') ?? 'http://localhost:4000'}/api/integrations/google/callback`,
        },
        stripe: {
          configured: !!(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET),
        },
        tenantCount,
        activeCount,
      },
    })
  } catch (err) { next(err) }
})

function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const fields: Record<string, string[]> = {}
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || 'root'
      fields[key] = [...(fields[key] ?? []), issue.message]
    }
    throw new AppError('VALIDATION_ERROR', 'Invalid input', 422, fields)
  }
  return result.data
}

const listQuerySchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
})

// ── Tenant management ──────────────────────────────────────────────────────

router.get('/tenants', async (req, res, next) => {
  try {
    const params = validate(listQuerySchema, req.query)
    const result = await adminService.listTenants(params)
    res.json({ data: { items: result.tenants, total: result.total, limit: result.limit, offset: result.offset } })
  } catch (err) { next(err) }
})

router.get('/tenants/:tenantId', async (req, res, next) => {
  try {
    const tenant = await adminService.getTenantDetail(req.params['tenantId']!)
    res.json({ data: tenant })
  } catch (err) { next(err) }
})

router.patch('/tenants/:tenantId', requirePlatformAdmin, async (req, res, next) => {
  try {
    const data = validate(adminService.adminUpdateTenantSchema, req.body)
    const tenant = await adminService.adminUpdateTenant(req.params['tenantId']!, req.user!.id, data)
    res.json({ data: tenant })
  } catch (err) { next(err) }
})

router.post('/tenants/:tenantId/suspend', requirePlatformAdmin, async (req, res, next) => {
  try {
    const tenant = await adminService.suspendTenant(req.params['tenantId']!, req.user!.id)
    res.json({ data: tenant })
  } catch (err) { next(err) }
})

router.post('/tenants/:tenantId/restore', requirePlatformAdmin, async (req, res, next) => {
  try {
    const tenant = await adminService.restoreTenant(req.params['tenantId']!, req.user!.id)
    res.json({ data: tenant })
  } catch (err) { next(err) }
})

// Admin grant-plan — bypasses Stripe entirely. Used for internal testing of
// tier-gated features without creating real Stripe subscriptions or processing
// payments. Audit-logged so it is never invisible.
router.post('/tenants/:tenantId/grant-plan', requirePlatformAdmin, async (req, res, next) => {
  try {
    const tenantId = req.params['tenantId']!
    const { planCode } = req.body as { planCode?: string }
    if (!planCode) throw new AppError('VALIDATION_ERROR', 'planCode is required', 422)

    const plan = await prisma.plan.findFirst({ where: { code: planCode, isActive: true } })
    if (!plan) throw new AppError('NOT_FOUND', `Plan '${planCode}' not found or inactive`, 404)

    await prisma.subscription.updateMany({
      where: { tenantId, stripeSubscriptionId: null, status: 'ACTIVE' },
      data: { status: 'CANCELED', canceledAt: new Date() },
    })

    const sub = await prisma.subscription.create({
      data: {
        tenantId,
        planId: plan.id,
        stripeSubscriptionId: null,
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: null,
      },
    })

    const { syncEntitlementsFromPlan } = await import('../services/entitlement.service.js')
    await syncEntitlementsFromPlan(tenantId, plan.id)

    writeAuditLogFromRequest(req, {
      actorType: 'USER',
      actorUserId: req.user!.id,
      action: 'admin.plan_granted',
      tenantId,
      targetType: 'Subscription',
      targetId: sub.id,
      metadataJson: { planCode, planName: plan.name, granted_by: req.user!.email },
    }).catch((e) => console.error('[audit]', e))

    res.json({ data: { subscription: sub, plan: { code: plan.code, name: plan.name } } })
  } catch (err) { next(err) }
})

router.post('/tenants/:tenantId/revoke-plan', requirePlatformAdmin, async (req, res, next) => {
  try {
    const tenantId = req.params['tenantId']!

    const canceled = await prisma.subscription.updateMany({
      where: { tenantId, stripeSubscriptionId: null, status: 'ACTIVE' },
      data: { status: 'CANCELED', canceledAt: new Date() },
    })

    const freePlan = await prisma.plan.findFirst({ where: { code: 'free', isActive: true } })
    if (freePlan) {
      const { syncEntitlementsFromPlan } = await import('../services/entitlement.service.js')
      await syncEntitlementsFromPlan(tenantId, freePlan.id)
    }

    writeAuditLogFromRequest(req, {
      actorType: 'USER',
      actorUserId: req.user!.id,
      action: 'admin.plan_revoked',
      tenantId,
      metadataJson: { canceledCount: canceled.count, reset_to: 'free', revoked_by: req.user!.email },
    }).catch((e) => console.error('[audit]', e))

    res.json({ data: { canceled: canceled.count, reset_to: 'free' } })
  } catch (err) { next(err) }
})

// ── System Settings ────────────────────────────────────────────────────────

router.get('/system-settings', async (req, res, next) => {
  try {
    const settings = await systemConfig.getSystemSettings()
    const isSuper = req.user?.roleKey === 'platform_super_admin'
    const accountEmails = isSuper ? await systemConfig.getAccountEmails() : null
    res.json({ data: { ...settings, accountEmails } })
  } catch (err) { next(err) }
})

const accountEmailField = z.string().email().optional().or(z.literal(''))

const googleSettingsSchema = z.object({
  clientId: z.string().min(1).optional(),
  clientSecret: z.string().min(1).optional(),
  redirectUri: z.string().url().optional(),
  accountEmail: accountEmailField,
})

router.patch('/system-settings/google', requirePlatformSuperAdmin, async (req, res, next) => {
  try {
    const parsed = googleSettingsSchema.safeParse(req.body)
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Invalid input', 422)
    const { clientId, clientSecret, redirectUri, accountEmail } = parsed.data
    const userId = req.user!.id

    if (clientId) await systemConfig.setConfigValue('google_client_id', clientId, false, userId)
    if (clientSecret) await systemConfig.setConfigValue('google_client_secret', clientSecret, true, userId)
    if (redirectUri) await systemConfig.setConfigValue('google_oauth_redirect_uri', redirectUri, false, userId)
    if (accountEmail !== undefined) await systemConfig.setAccountEmail('google', accountEmail, userId)

    await writeAuditLogFromRequest(req, {
      actorType: 'USER',
      actorUserId: userId,
      action: 'system_settings.google.updated',
      targetType: 'SystemConfig',
      metadataJson: { fields: Object.keys(parsed.data) },
    })

    const settings = await systemConfig.getSystemSettings()
    res.json({ data: settings })
  } catch (err) { next(err) }
})

const stripeSecretKey = z.string().regex(
  /^(sk|rk)_(live|test)_[A-Za-z0-9]+$/,
  'Stripe secret keys start with sk_live_, sk_test_, rk_live_, or rk_test_.',
)
const stripePublishableKey = z.string().regex(
  /^pk_(live|test)_[A-Za-z0-9]+$/,
  'Stripe publishable keys start with pk_live_ or pk_test_.',
)
const stripeWebhookSecret = z.string().regex(
  /^whsec_[A-Za-z0-9_-]+$/,
  'Stripe webhook signing secrets start with whsec_.',
)

const stripeSettingsSchema = z.object({
  secretKey: stripeSecretKey.optional(),
  publishableKey: stripePublishableKey.optional(),
  webhookSecret: stripeWebhookSecret.optional(),
  webhookSecretConnect: stripeWebhookSecret.optional(),
  accountEmail: accountEmailField,
})

router.patch('/system-settings/stripe', requirePlatformSuperAdmin, async (req, res, next) => {
  try {
    const parsed = stripeSettingsSchema.safeParse(req.body)
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.') || 'root'
        fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message]
      }
      throw new AppError('VALIDATION_ERROR', 'Invalid Stripe key format', 422, fieldErrors)
    }
    const { secretKey, publishableKey, webhookSecret, webhookSecretConnect, accountEmail } = parsed.data
    const userId = req.user!.id

    if (secretKey) await systemConfig.setConfigValue('stripe_secret_key', secretKey, true, userId)
    if (publishableKey) await systemConfig.setConfigValue('stripe_publishable_key', publishableKey, false, userId)
    if (webhookSecret) await systemConfig.setConfigValue('stripe_webhook_secret', webhookSecret, true, userId)
    if (webhookSecretConnect) await systemConfig.setConfigValue('stripe_webhook_secret_connect', webhookSecretConnect, true, userId)
    if (accountEmail !== undefined) await systemConfig.setAccountEmail('stripe', accountEmail, userId)

    const { bootStripeFromConfig } = await import('../lib/stripe.js')
    await bootStripeFromConfig().catch(() => null)

    await writeAuditLogFromRequest(req, {
      actorType: 'USER', actorUserId: userId,
      action: 'system_settings.stripe.updated',
      targetType: 'SystemConfig',
      metadataJson: { fields: Object.keys(parsed.data) },
    })

    const settings = await systemConfig.getSystemSettings()
    res.json({ data: settings })
  } catch (err) { next(err) }
})

const socialUrl = z.string().url().or(z.literal(''))
const socialSettingsSchema = z.object({
  youtube: socialUrl.optional(),
  linkedin: socialUrl.optional(),
  tiktok: socialUrl.optional(),
  instagram: socialUrl.optional(),
  pinterest: socialUrl.optional(),
  x: socialUrl.optional(),
})

router.patch('/system-settings/social', requirePlatformSuperAdmin, async (req, res, next) => {
  try {
    const parsed = socialSettingsSchema.safeParse(req.body)
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.') || 'root'
        fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message]
      }
      throw new AppError('VALIDATION_ERROR', 'Invalid social media URL', 422, fieldErrors)
    }
    const userId = req.user!.id
    const map: Record<string, string> = {
      youtube: 'social_youtube_url',
      linkedin: 'social_linkedin_url',
      tiktok: 'social_tiktok_url',
      instagram: 'social_instagram_url',
      pinterest: 'social_pinterest_url',
      x: 'social_x_url',
    }
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value === undefined) continue
      const dbKey = map[key]
      if (!dbKey) continue
      await systemConfig.setConfigValue(dbKey, value, false, userId)
    }
    await writeAuditLogFromRequest(req, {
      actorType: 'USER', actorUserId: userId,
      action: 'system_settings.social.updated',
      targetType: 'SystemConfig',
      metadataJson: { fields: Object.keys(parsed.data) },
    })
    const settings = await systemConfig.getSystemSettings()
    res.json({ data: settings })
  } catch (err) { next(err) }
})

const openaiSettingsSchema = z.object({
  apiKey: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  accountEmail: accountEmailField,
})

router.patch('/system-settings/openai', requirePlatformSuperAdmin, async (req, res, next) => {
  try {
    const parsed = openaiSettingsSchema.safeParse(req.body)
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Invalid input', 422)
    const { apiKey, model, accountEmail } = parsed.data
    const userId = req.user!.id

    if (apiKey) await systemConfig.setConfigValue('openai_api_key', apiKey, true, userId)
    if (model) await systemConfig.setConfigValue('openai_model', model, false, userId)
    if (accountEmail !== undefined) await systemConfig.setAccountEmail('openai', accountEmail, userId)

    await writeAuditLogFromRequest(req, {
      actorType: 'USER', actorUserId: userId,
      action: 'system_settings.openai.updated',
      targetType: 'SystemConfig',
      metadataJson: { fields: Object.keys(parsed.data) },
    })

    const settings = await systemConfig.getSystemSettings()
    res.json({ data: settings })
  } catch (err) { next(err) }
})

const smtpSettingsSchema = z.object({
  host: z.string().min(1).optional(),
  port: z.union([z.number(), z.string()]).transform((v) => parseInt(String(v), 10)).pipe(z.number().int().min(1).max(65535)).optional(),
  user: z.string().min(1).optional(),
  password: z.string().min(1).optional(),
  from: z.string().min(1).optional(),
  accountEmail: accountEmailField,
})

router.patch('/system-settings/smtp', requirePlatformSuperAdmin, async (req, res, next) => {
  try {
    const parsed = smtpSettingsSchema.safeParse(req.body)
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Invalid input', 422)
    const { host, port, user, password, from, accountEmail } = parsed.data
    const userId = req.user!.id

    if (host) await systemConfig.setConfigValue('smtp_host', host, false, userId)
    if (port) await systemConfig.setConfigValue('smtp_port', String(port), false, userId)
    if (user) await systemConfig.setConfigValue('smtp_user', user, false, userId)
    if (password) await systemConfig.setConfigValue('smtp_password', password, true, userId)
    if (from) await systemConfig.setConfigValue('smtp_from', from, false, userId)
    if (accountEmail !== undefined) await systemConfig.setAccountEmail('smtp', accountEmail, userId)

    await writeAuditLogFromRequest(req, {
      actorType: 'USER', actorUserId: userId,
      action: 'system_settings.smtp.updated',
      targetType: 'SystemConfig',
      metadataJson: { fields: Object.keys(parsed.data) },
    })

    const settings = await systemConfig.getSystemSettings()
    res.json({ data: settings })
  } catch (err) { next(err) }
})

// ── Plans & entitlements ───────────────────────────────────────────────────

router.get('/plans', async (_req, res, next) => {
  try {
    const plans = await prisma.plan.findMany({
      include: { entitlements: { orderBy: { key: 'asc' } } },
      orderBy: { name: 'asc' },
    })
    res.json({ data: plans })
  } catch (err) { next(err) }
})

const updateEntitlementSchema = z.object({
  updates: z.array(z.object({
    key: z.string(),
    booleanValue: z.boolean().nullable().optional(),
    integerValue: z.number().int().nullable().optional(),
    stringValue: z.string().nullable().optional(),
  })),
})

router.patch('/plans/:planId/entitlements', requirePlatformAdmin, async (req, res, next) => {
  try {
    const { planId } = req.params as { planId: string }
    const { updates } = validate(updateEntitlementSchema, req.body)
    const userId = req.user!.id

    for (const u of updates) {
      await prisma.planEntitlement.updateMany({
        where: { planId, key: u.key },
        data: {
          ...(u.booleanValue !== undefined ? { booleanValue: u.booleanValue } : {}),
          ...(u.integerValue !== undefined ? { integerValue: u.integerValue } : {}),
          ...(u.stringValue !== undefined ? { stringValue: u.stringValue } : {}),
        },
      })
    }

    await writeAuditLogFromRequest(req, {
      actorType: 'USER', actorUserId: userId,
      action: 'admin.plan.entitlements_updated',
      targetType: 'Plan', targetId: planId,
      metadataJson: { keys: updates.map((u) => u.key) },
    })

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      include: { entitlements: { orderBy: { key: 'asc' } } },
    })
    res.json({ data: plan })
  } catch (err) { next(err) }
})

// ── Impersonation ──────────────────────────────────────────────────────────

router.post('/tenants/:tenantId/impersonate', async (req, res, next) => {
  try {
    const { tenantId } = req.params as { tenantId: string }
    const adminUserId = req.user!.id

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { members: { where: { isOwner: true }, include: { user: true }, take: 1 } },
    })
    if (!tenant) throw new AppError('NOT_FOUND', 'Tenant not found', 404)

    const session = await prisma.impersonationSession.create({
      data: { adminUserId, tenantId, assumedRoleKey: 'tenant_owner' },
    })

    await writeAuditLogFromRequest(req, {
      actorType: 'ADMIN',
      actorUserId: adminUserId,
      action: 'impersonation.started',
      targetType: 'Tenant',
      targetId: tenantId,
      metadataJson: { impersonationSessionId: session.id },
    })

    const ownerUser = tenant.members[0]?.user
    const { signAccessToken } = await import('../lib/jwt.js')
    const token = signAccessToken({
      sub: ownerUser?.id ?? adminUserId,
      email: ownerUser?.email ?? req.user!.email,
      tenantId,
      roleKey: 'tenant_owner',
      isPlatformRole: false,
      impersonatedBy: adminUserId,
      impersonationSessionId: session.id,
    })

    res.json({ data: { token, sessionId: session.id, tenantName: tenant.displayName } })
  } catch (err) { next(err) }
})

router.post('/impersonation/:sessionId/end', async (req, res, next) => {
  try {
    const { sessionId } = req.params as { sessionId: string }
    const adminUserId = req.user!.id

    const session = await prisma.impersonationSession.findUnique({ where: { id: sessionId } })
    if (!session) throw new AppError('NOT_FOUND', 'Session not found', 404)

    await prisma.impersonationSession.update({
      where: { id: sessionId },
      data: { endedAt: new Date() },
    })

    await writeAuditLogFromRequest(req, {
      actorType: 'ADMIN',
      actorUserId: adminUserId,
      action: 'impersonation.ended',
      targetType: 'Tenant',
      targetId: session.tenantId,
      metadataJson: { impersonationSessionId: sessionId },
    })

    res.json({ data: { ended: true } })
  } catch (err) { next(err) }
})

// ── Errors / audit ─────────────────────────────────────────────────────────

router.get('/errors', async (_req, res, next) => {
  try {
    const errors = await prisma.auditLog.findMany({
      where: { action: { startsWith: 'system.error.' } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    res.json({ data: { items: errors, total: errors.length } })
  } catch (err) { next(err) }
})

// ── Disposable test-tenant cleanup ─────────────────────────────────────────
// Smoke tests can create tenants with a reserved test-only email domain.
// This endpoint deletes every tenant whose registration email matches that
// domain. Cascade-deletes wipe all related rows. Audit-logs the count.
router.delete('/test-tenants', requirePlatformAdmin, async (req, res, next) => {
  try {
    const TEST_DOMAIN = '@example.test'
    const before = await prisma.tenant.findMany({
      where: { registrationEmail: { endsWith: TEST_DOMAIN } },
      select: { id: true, registrationEmail: true },
    })
    const result = await prisma.tenant.deleteMany({
      where: { registrationEmail: { endsWith: TEST_DOMAIN } },
    })
    const userResult = await prisma.user.deleteMany({
      where: { email: { endsWith: TEST_DOMAIN } },
    })

    await writeAuditLogFromRequest(req, {
      actorType: 'ADMIN',
      actorUserId: req.user!.id,
      action: 'admin.test_tenants_cleaned',
      metadataJson: {
        deletedTenantCount: result.count,
        deletedUserCount: userResult.count,
        tenantEmails: before.map((t) => t.registrationEmail),
      },
    })

    res.json({ data: { deletedTenantCount: result.count, deletedUserCount: userResult.count } })
  } catch (err) { next(err) }
})

// ── Platform team management ───────────────────────────────────────────────
// Super-admin-only endpoints for granting/revoking platform-staff roles
// (platform_admin, platform_support). Roles are assigned via a TenantMember
// row on the platform-tenant (slug `platform`).

const PLATFORM_TENANT_SLUG = 'platform'
const ASSIGNABLE_ROLES = ['platform_super_admin', 'platform_admin', 'platform_support'] as const

async function getPlatformTenantId(): Promise<string> {
  const tenant = await prisma.tenant.findUnique({ where: { slug: PLATFORM_TENANT_SLUG } })
  if (!tenant) throw new AppError('INTERNAL_ERROR', 'Platform tenant not found — seed may not have run', 500)
  return tenant.id
}

/** Hard rule: Super Admin accounts are immutable from the team-management UI.
 *  No edit, no role change, no disable, no revoke — even by another Super Admin.
 *  The only admin action permitted on a Super Admin is `password-reset`.
 *  Removing a Super Admin requires direct DB access. */
async function assertNotSuperAdmin(userId: string): Promise<void> {
  const platformTenantId = await getPlatformTenantId()
  const member = await prisma.tenantMember.findFirst({
    where: { userId, tenantId: platformTenantId },
    include: { roleDefinition: { select: { key: true } } },
  })
  if (member?.roleDefinition.key === 'platform_super_admin') {
    throw new AppError(
      'FORBIDDEN',
      'Super Admin accounts cannot be modified from the team page. Only password reset is permitted.',
      403,
    )
  }
}

router.get('/platform-staff', requirePlatformSuperAdmin, async (_req, res, next) => {
  try {
    const platformTenantId = await getPlatformTenantId()
    const memberships = await prisma.tenantMember.findMany({
      where: { tenantId: platformTenantId, roleDefinition: { isPlatformRole: true } },
      include: {
        user: { select: { id: true, email: true, username: true, firstName: true, lastName: true, status: true, lastLoginAt: true, createdAt: true } },
        roleDefinition: { select: { key: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
    const data = memberships.map((m) => ({
      userId: m.user.id,
      email: m.user.email,
      username: m.user.username,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      status: m.user.status,
      roleKey: m.roleDefinition.key,
      roleName: m.roleDefinition.name,
      lastLoginAt: m.user.lastLoginAt?.toISOString() ?? null,
      grantedAt: m.createdAt.toISOString(),
    }))
    res.json({ data })
  } catch (err) { next(err) }
})

const grantRoleSchema = z.object({
  email: z.string().email(),
  roleKey: z.enum(ASSIGNABLE_ROLES),
})

router.post('/platform-staff/grant', requirePlatformSuperAdmin, async (req, res, next) => {
  try {
    const parsed = grantRoleSchema.safeParse(req.body)
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Invalid input — email and roleKey required', 422)
    const { email, roleKey } = parsed.data

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (!user) throw new AppError('NOT_FOUND', `No user with email ${email} exists. They must sign up first, then a Super Admin can grant the role.`, 404)

    const role = await prisma.roleDefinition.findUnique({ where: { key: roleKey } })
    if (!role) throw new AppError('INTERNAL_ERROR', 'Role not found in seed', 500)

    const platformTenantId = await getPlatformTenantId()
    const existing = await prisma.tenantMember.findFirst({
      where: { userId: user.id, tenantId: platformTenantId },
      include: { roleDefinition: { select: { key: true } } },
    })
    if (existing) {
      if (existing.roleDefinition.key === 'platform_super_admin' && roleKey !== 'platform_super_admin') {
        throw new AppError('FORBIDDEN', 'Super Admin role cannot be changed once granted. To remove a Super Admin, use direct DB access.', 403)
      }
      await prisma.tenantMember.update({ where: { id: existing.id }, data: { roleDefinitionId: role.id } })
    } else {
      await prisma.tenantMember.create({
        data: { userId: user.id, tenantId: platformTenantId, roleDefinitionId: role.id },
      })
    }

    await writeAuditLogFromRequest(req, {
      actorType: 'ADMIN',
      actorUserId: req.user!.id,
      action: existing ? 'admin.platform_staff.role_changed' : 'admin.platform_staff.granted',
      targetType: 'User',
      targetId: user.id,
      metadataJson: { email: user.email, roleKey, previousRole: existing ? 'unknown' : null },
    })
    res.status(201).json({ data: { userId: user.id, email: user.email, roleKey } })
  } catch (err) { next(err) }
})

const updatePlatformStaffSchema = z.object({
  firstName: z.string().min(1).max(80).optional().or(z.literal('')),
  lastName: z.string().min(1).max(80).optional().or(z.literal('')),
  username: z.string().min(3).max(40).regex(/^[a-zA-Z0-9_.-]+$/).optional().or(z.literal('')),
  email: z.string().email().optional(),
  status: z.enum(['ACTIVE', 'INVITED', 'SUSPENDED', 'DISABLED']).optional(),
})

router.patch('/platform-staff/:userId', requirePlatformSuperAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params as { userId: string }
    const parsed = updatePlatformStaffSchema.safeParse(req.body)
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Invalid input', 422)

    const platformTenantId = await getPlatformTenantId()
    const member = await prisma.tenantMember.findFirst({
      where: { userId, tenantId: platformTenantId },
      include: { user: { select: { id: true, email: true } } },
    })
    if (!member) throw new AppError('NOT_FOUND', 'User is not a platform-staff member', 404)
    await assertNotSuperAdmin(userId)

    const data: Record<string, unknown> = {}
    const { firstName, lastName, username, email, status } = parsed.data
    if (firstName !== undefined) data['firstName'] = firstName === '' ? null : firstName
    if (lastName !== undefined) data['lastName'] = lastName === '' ? null : lastName
    if (username !== undefined) data['username'] = username === '' ? null : username
    if (email !== undefined) data['email'] = email.toLowerCase().trim()
    if (status !== undefined) data['status'] = status

    if (Object.keys(data).length === 0) {
      res.json({ data: { ok: true, noChanges: true } })
      return
    }

    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data,
        select: { id: true, email: true, username: true, firstName: true, lastName: true, status: true },
      })
      await writeAuditLogFromRequest(req, {
        actorType: 'ADMIN',
        actorUserId: req.user!.id,
        action: 'admin.platform_staff.updated',
        targetType: 'User',
        targetId: userId,
        metadataJson: { fields: Object.keys(data), email: updated.email, status: updated.status },
      })
      res.json({ data: updated })
    } catch (e: unknown) {
      const err = e as { code?: string; meta?: { target?: string[] } }
      if (err.code === 'P2002' && err.meta?.target?.includes('email')) {
        throw new AppError('CONFLICT', 'Another user already uses that email', 409)
      }
      if (err.code === 'P2002' && err.meta?.target?.includes('username')) {
        throw new AppError('CONFLICT', 'Another user already uses that username', 409)
      }
      throw e
    }
  } catch (err) { next(err) }
})

router.post('/platform-staff/:userId/password-reset', requirePlatformSuperAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params as { userId: string }
    const platformTenantId = await getPlatformTenantId()
    const member = await prisma.tenantMember.findFirst({
      where: { userId, tenantId: platformTenantId },
      include: { user: { select: { email: true, firstName: true, status: true } } },
    })
    if (!member) throw new AppError('NOT_FOUND', 'User is not a platform-staff member', 404)
    if (member.user.status === 'DISABLED' || member.user.status === 'SUSPENDED') {
      throw new AppError('CONFLICT', 'User account is disabled or suspended; restore it before sending a reset email.', 409)
    }

    const authService = await import('../services/auth.service.js')
    const result = await authService.startPasswordReset(member.user.email)
    if (!result) throw new AppError('NOT_FOUND', 'Could not start password reset for this user', 404)

    const { sendPasswordResetEmail } = await import('../services/email.service.js')
    const { getEnv } = await import('@myorbislocal/config')
    const appBase = getEnv().APP_BASE_URL
    const resetUrl = `${appBase}/reset-password?token=${encodeURIComponent(result.rawToken)}`
    sendPasswordResetEmail({
      to: result.email,
      firstName: result.firstName,
      resetUrl,
      expiresInMinutes: 15,
    }).catch((e) => console.error('[admin][password-reset] email send failed:', e?.message ?? e))

    await writeAuditLogFromRequest(req, {
      actorType: 'ADMIN',
      actorUserId: req.user!.id,
      action: 'admin.platform_staff.password_reset_sent',
      targetType: 'User',
      targetId: userId,
      metadataJson: { email: result.email },
    })
    res.json({ data: { ok: true, sentTo: result.email } })
  } catch (err) { next(err) }
})

router.delete('/platform-staff/:userId', requirePlatformSuperAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params as { userId: string }
    const requesterId = req.user!.id

    const platformTenantId = await getPlatformTenantId()
    const member = await prisma.tenantMember.findFirst({
      where: { userId, tenantId: platformTenantId },
      include: { user: { select: { email: true } }, roleDefinition: { select: { key: true } } },
    })
    if (!member) throw new AppError('NOT_FOUND', 'User is not a platform-staff member', 404)
    await assertNotSuperAdmin(userId)

    await prisma.tenantMember.delete({ where: { id: member.id } })

    await writeAuditLogFromRequest(req, {
      actorType: 'ADMIN',
      actorUserId: requesterId,
      action: 'admin.platform_staff.revoked',
      targetType: 'User',
      targetId: userId,
      metadataJson: { email: member.user.email, roleKey: member.roleDefinition.key },
    })
    res.json({ data: { ok: true } })
  } catch (err) { next(err) }
})

export default router
