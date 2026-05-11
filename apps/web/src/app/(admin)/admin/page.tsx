'use client'

import { useApi } from '@/hooks/useApi'

interface PlatformStatus {
  google: { configured: boolean; redirectUri: string }
  stripe: { configured: boolean }
  tenantCount: number
  activeCount: number
}

export default function AdminOverviewPage() {
  const { data, error, loading } = useApi<PlatformStatus>('/api/admin/platform/status')

  if (loading) return <div>Loading…</div>
  if (error) return <div className="alert-error">{error}</div>
  if (!data) return null

  const checks = [
    { name: 'Google OAuth', ok: data.google.configured, hint: 'Set in Admin → System Settings → Google' },
    { name: 'Stripe', ok: data.stripe.configured, hint: 'Set in Admin → System Settings → Stripe' },
  ]

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>Platform overview</h1>

      <div className="rounded-xl p-5" style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}>
        <h2 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>Tenants</h2>
        <div className="flex gap-8">
          <div>
            <p className="text-3xl font-semibold">{data.tenantCount}</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Total</p>
          </div>
          <div>
            <p className="text-3xl font-semibold">{data.activeCount}</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Active</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl p-5" style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}>
        <h2 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>Integration health</h2>
        <ul className="space-y-2">
          {checks.map((c) => (
            <li key={c.name} className="flex items-center gap-3 text-sm">
              <span style={{ color: c.ok ? 'oklch(72% 0.18 145)' : 'oklch(70% 0.18 25)' }}>{c.ok ? '●' : '○'}</span>
              <span className="font-medium">{c.name}</span>
              <span style={{ color: 'var(--text-tertiary)' }}>{c.ok ? 'Configured' : c.hint}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
