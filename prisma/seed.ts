import { PrismaClient, PlanInterval, EntitlementValueType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ROLES = [
  { key: 'platform_super_admin', name: 'Platform Super Admin', isPlatformRole: true,
    description: 'Full access. Only role that can edit credentials and manage other platform staff.' },
  { key: 'platform_admin', name: 'Platform Admin', isPlatformRole: true,
    description: 'Tenant management, plans, audit logs. Cannot edit secrets or grant platform-staff roles.' },
  { key: 'platform_support', name: 'Platform Support', isPlatformRole: true,
    description: 'Read-only platform access plus impersonation (audit-logged).' },
  { key: 'tenant_owner', name: 'Tenant Owner', isPlatformRole: false,
    description: 'Full access within their tenant.' },
  { key: 'tenant_manager', name: 'Tenant Manager', isPlatformRole: false,
    description: 'Manage tenant settings and members.' },
  { key: 'tenant_staff', name: 'Tenant Staff', isPlatformRole: false,
    description: 'Day-to-day tenant user.' },
  { key: 'affiliate_partner', name: 'Affiliate Partner', isPlatformRole: false,
    description: 'Access to the affiliate/partner portal only.' },
];

const PLANS = [
  {
    code: 'free',
    name: 'Free',
    description: 'Starter plan with limited usage.',
    interval: PlanInterval.MONTHLY,
    priceCents: 0,
    entitlements: [
      { key: 'seats', valueType: EntitlementValueType.INTEGER, integerValue: 1 },
      { key: 'feature_basic', valueType: EntitlementValueType.BOOLEAN, booleanValue: true },
    ],
  },
  {
    code: 'pro',
    name: 'Pro',
    description: 'Production usage for growing teams.',
    interval: PlanInterval.MONTHLY,
    priceCents: 4900,
    entitlements: [
      { key: 'seats', valueType: EntitlementValueType.INTEGER, integerValue: 10 },
      { key: 'feature_basic', valueType: EntitlementValueType.BOOLEAN, booleanValue: true },
      { key: 'feature_pro', valueType: EntitlementValueType.BOOLEAN, booleanValue: true },
    ],
  },
  {
    code: 'enterprise',
    name: 'Enterprise',
    description: 'Custom limits and SLA.',
    interval: PlanInterval.MONTHLY,
    priceCents: 49900,
    entitlements: [
      { key: 'seats', valueType: EntitlementValueType.INTEGER, integerValue: 100 },
      { key: 'feature_basic', valueType: EntitlementValueType.BOOLEAN, booleanValue: true },
      { key: 'feature_pro', valueType: EntitlementValueType.BOOLEAN, booleanValue: true },
      { key: 'feature_enterprise', valueType: EntitlementValueType.BOOLEAN, booleanValue: true },
    ],
  },
];

async function main() {
  for (const role of ROLES) {
    await prisma.roleDefinition.upsert({
      where: { key: role.key },
      update: { name: role.name, description: role.description, isPlatformRole: role.isPlatformRole },
      create: role,
    });
  }

  for (const plan of PLANS) {
    const upserted = await prisma.plan.upsert({
      where: { code: plan.code },
      update: { name: plan.name, description: plan.description, interval: plan.interval, priceCents: plan.priceCents },
      create: {
        code: plan.code,
        name: plan.name,
        description: plan.description,
        interval: plan.interval,
        priceCents: plan.priceCents,
      },
    });
    for (const ent of plan.entitlements) {
      await prisma.planEntitlement.upsert({
        where: { planId_key: { planId: upserted.id, key: ent.key } },
        update: {
          valueType: ent.valueType,
          booleanValue: ent.booleanValue ?? null,
          integerValue: ent.integerValue ?? null,
          stringValue: null,
        },
        create: { planId: upserted.id, ...ent },
      });
    }
  }

  await prisma.affiliateSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton' },
  });

  // Platform tenant — owns the platform-staff TenantMember rows.
  // Slug must match PLATFORM_TENANT_SLUG in routes/admin.ts.
  const platformTenant = await prisma.tenant.upsert({
    where: { slug: 'platform' },
    update: {},
    create: {
      slug: 'platform',
      displayName: 'Platform',
      status: 'ACTIVE',
      registrationEmail: 'admin@example.com',
    },
  });

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'changeme123';
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      firstName: 'Platform',
      lastName: 'Admin',
      status: 'ACTIVE',
    },
  });

  // Grant Super Admin via TenantMember row on the platform tenant.
  const superAdminRole = await prisma.roleDefinition.findUnique({ where: { key: 'platform_super_admin' } });
  if (superAdminRole) {
    await prisma.tenantMember.upsert({
      where: { tenantId_userId: { tenantId: platformTenant.id, userId: adminUser.id } },
      update: { roleDefinitionId: superAdminRole.id, isOwner: true },
      create: { tenantId: platformTenant.id, userId: adminUser.id, roleDefinitionId: superAdminRole.id, isOwner: true },
    });
  }

  console.log('Seed complete. Admin: %s (password from SEED_ADMIN_PASSWORD env or "changeme123").', adminEmail);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
