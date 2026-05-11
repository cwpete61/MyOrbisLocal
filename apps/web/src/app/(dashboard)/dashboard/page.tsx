'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/hooks/useApi'
import { useT } from '@/lib/i18n/I18nProvider'

interface DashboardStats {
  subscription: { planName: string; planCode: string; status: string; currentPeriodEnd: string | null } | null
  memberCount: number
}

export default function DashboardPage() {
  const t = useT()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiFetch<DashboardStats>('/api/dashboard/stats')
      .then(setStats)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
  }, [])

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
        {t('dashboard.title')}
      </h1>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <h2 className="text-sm font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>
              {t('dashboard.subscription')}
            </h2>
            {stats.subscription ? (
              <>
                <p className="text-lg font-semibold">{stats.subscription.planName}</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{stats.subscription.status}</p>
              </>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('dashboard.noSubscription')}</p>
            )}
          </div>

          <div className="rounded-lg border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <h2 className="text-sm font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>
              {t('dashboard.members')}
            </h2>
            <p className="text-3xl font-bold">{stats.memberCount}</p>
          </div>
        </div>
      )}
    </div>
  )
}
