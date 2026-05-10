'use client'

/**
 * Pricing entitlements admin page (template stub).
 *
 * In your project: list every PlanEntitlement key your product cares about,
 * fetch them via GET /api/admin/plans, and let admins edit values via
 * PATCH /api/admin/plans/:planId/entitlements. The shape is in admin.ts.
 */
export default function AdminPricingPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold tracking-tight mb-2" style={{ color: 'var(--text-primary)' }}>Pricing &amp; entitlements</h1>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Wire this up to your product&apos;s entitlement keys. The API supports per-plan booleans, integers, and strings.
      </p>
    </div>
  )
}
