'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/hooks/useApi'
import { useT } from '@/lib/i18n/I18nProvider'

interface IntegrationsState {
  google: {
    status: string
    email: string | null
    lastVerifiedAt: string | null
    calendarCount: number
  }
}

export default function IntegrationsPage() {
  const t = useT()
  const [data, setData] = useState<IntegrationsState | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    try {
      const r = await apiFetch<IntegrationsState>('/api/integrations')
      setData(r)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    }
  }

  useEffect(() => { load() }, [])

  async function connect() {
    setBusy(true)
    setError(null)
    try {
      const r = await apiFetch<{ url: string }>('/api/integrations/google/start', { method: 'POST' })
      window.location.href = r.url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start')
      setBusy(false)
    }
  }

  async function disconnect() {
    if (!confirm(t('integrations.confirmDisconnect'))) return
    setBusy(true)
    setError(null)
    try {
      await apiFetch('/api/integrations/google', { method: 'DELETE' })
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
        {t('integrations.title')}
      </h1>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <div className="rounded-lg border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">Google</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {data?.google.status === 'CONNECTED'
                ? `${t('integrations.connectedAs')} ${data.google.email}`
                : t('integrations.notConnected')}
            </p>
          </div>
          {data?.google.status === 'CONNECTED' ? (
            <button onClick={disconnect} disabled={busy}
              className="px-3 py-1.5 rounded text-sm border"
              style={{ borderColor: 'var(--border)' }}>
              {t('integrations.disconnect')}
            </button>
          ) : (
            <button onClick={connect} disabled={busy}
              className="px-3 py-1.5 rounded text-sm font-medium"
              style={{ background: 'var(--accent)', color: 'white' }}>
              {t('integrations.connect')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
