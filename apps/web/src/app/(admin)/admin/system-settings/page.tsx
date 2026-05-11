'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/hooks/useApi'
import { useT } from '@/lib/i18n/I18nProvider'

interface SystemSettings {
  google?: { clientId?: string; redirectUri?: string }
  stripe?: { publishableKey?: string }
  smtp?: { host?: string; port?: string; user?: string; from?: string }
  openai?: { model?: string }
}

/**
 * System Settings admin page (template stub).
 *
 * Lets a Super Admin view + update credentials for the integrations the
 * template ships with: Google OAuth, Stripe, SMTP, OpenAI. Secrets are
 * write-only (never returned by the API). Add a new card by following the
 * pattern below: a `SettingsCard` calling PATCH /api/admin/system-settings/<provider>.
 */
export default function SystemSettingsPage() {
  const t = useT()
  const [data, setData] = useState<SystemSettings | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiFetch<SystemSettings>('/api/admin/system-settings')
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
  }, [])

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
        {t('systemSettings.title')}
      </h1>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {data && (
        <div className="space-y-4">
          <SettingsCard title="Google" provider="google" current={data.google} />
          <SettingsCard title="Stripe" provider="stripe" current={data.stripe} />
          <SettingsCard title="SMTP" provider="smtp" current={data.smtp} />
          <SettingsCard title="OpenAI" provider="openai" current={data.openai} />
        </div>
      )}
    </div>
  )
}

function SettingsCard({ title, provider, current }: { title: string; provider: string; current: Record<string, unknown> | undefined }) {
  return (
    <div className="rounded-lg border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
        {current && Object.keys(current).length > 0 ? 'Configured' : 'Not configured'}
      </p>
      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
        Configure via PATCH /api/admin/system-settings/{provider}. Secrets are write-only — the API returns only public values for display.
      </p>
    </div>
  )
}
