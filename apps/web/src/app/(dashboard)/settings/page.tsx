'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/hooks/useApi'
import { useT } from '@/lib/i18n/I18nProvider'

interface TenantData {
  displayName: string
  legalName: string | null
  timezone: string
  publicEmail: string | null
  publicPhone: string | null
  website: string | null
}

export default function SettingsPage() {
  const t = useT()
  const [data, setData] = useState<TenantData | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    apiFetch<TenantData>('/api/tenant')
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!data) return
    setSaving(true)
    setError(null)
    try {
      await apiFetch('/api/tenant', { method: 'PATCH', body: JSON.stringify(data) })
      setSavedAt(Date.now())
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (!data) return <div className="p-6">{error ?? t('common.loading')}</div>

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
        {t('settings.title')}
      </h1>

      <form onSubmit={save} className="space-y-4">
        <Field label={t('settings.displayName')} value={data.displayName}
          onChange={(v) => setData({ ...data, displayName: v })} />
        <Field label={t('settings.legalName')} value={data.legalName ?? ''}
          onChange={(v) => setData({ ...data, legalName: v || null })} />
        <Field label={t('settings.publicEmail')} value={data.publicEmail ?? ''} type="email"
          onChange={(v) => setData({ ...data, publicEmail: v || null })} />
        <Field label={t('settings.publicPhone')} value={data.publicPhone ?? ''}
          onChange={(v) => setData({ ...data, publicPhone: v || null })} />
        <Field label={t('settings.website')} value={data.website ?? ''} type="url"
          onChange={(v) => setData({ ...data, website: v || null })} />

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button type="submit" disabled={saving} className="px-4 py-2 rounded font-medium"
          style={{ background: 'var(--accent)', color: 'white' }}>
          {saving ? t('common.saving') : t('common.save')}
        </button>
        {savedAt && <span className="ml-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{t('common.saved')}</span>}
      </form>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded border"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }} />
    </label>
  )
}
