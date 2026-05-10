'use client'

import { useApi } from '@/hooks/useApi'

interface PlatformStatus {
  google: { configured: boolean }
  stripe: { configured: boolean }
}

export default function AdminPlatformSettingsPage() {
  const { data, error, isLoading } = useApi<PlatformStatus>('/api/admin/platform/status')

  if (isLoading) return <div>Loading…</div>
  if (error) return <div className="alert-error">{(error as Error).message}</div>
  if (!data) return null

  const checks = [
    { title: 'Google OAuth', ok: data.google.configured },
    { title: 'Stripe', ok: data.stripe.configured },
  ]

  return (
    <div className="max-w-3xl space-y-3">
      <h1 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>Platform status</h1>

      {checks.map((c) => (
        <div key={c.title} className="rounded-xl p-4 flex items-center justify-between" style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}>
          <span className="font-medium">{c.title}</span>
          <span style={{ color: c.ok ? 'oklch(72% 0.18 145)' : 'oklch(70% 0.18 25)' }}>{c.ok ? 'Configured' : 'Not configured'}</span>
        </div>
      ))}
    </div>
  )
}
