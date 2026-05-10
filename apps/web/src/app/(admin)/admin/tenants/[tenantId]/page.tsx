'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useApi, apiFetch } from '@/hooks/useApi'
import { setTokens } from '@/lib/auth'
import Link from 'next/link'

interface Tenant {
  id: string
  slug: string
  displayName: string
  legalName: string | null
  status: string
  registrationEmail: string
  createdAt: string
  businessProfile: { brandName: string } | null
  members: { id: string; isOwner: boolean; user: { email: string; firstName: string | null; lastName: string | null }; roleDefinition: { name: string } }[]
  integrationConnections: { id: string; provider: string; status: string; label: string }[]
  subscriptions: { status: string; plan: { name: string } }[]
}

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  TRIAL:     { bg: 'oklch(14% 0.04 75)',  text: 'oklch(70% 0.16 75)' },
  ACTIVE:    { bg: 'oklch(19% 0.04 193)', text: 'oklch(72% 0.12 193)' },
  SUSPENDED: { bg: 'oklch(13% 0.04 25)',  text: 'oklch(68% 0.20 25)' },
  PAST_DUE:  { bg: 'oklch(14% 0.04 45)',  text: 'oklch(70% 0.18 45)' },
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}>
      <h2 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>{title}</h2>
      {children}
    </div>
  )
}

export default function TenantDetailPage() {
  const params = useParams<{ tenantId: string }>()
  const tenantId = params.tenantId
  const router = useRouter()
  const { data: tenant, error, isLoading } = useApi<Tenant>(`/api/admin/tenants/${tenantId}`)
  const [impersonating, setImpersonating] = useState(false)

  async function enterAsTenant() {
    setImpersonating(true)
    try {
      const r = await apiFetch<{ token: string; sessionId: string }>(`/api/admin/tenants/${tenantId}/impersonate`, { method: 'POST' })
      setTokens(r.data.token, '')
      router.push('/dashboard')
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setImpersonating(false)
    }
  }

  if (isLoading) return <div className="p-6">Loading…</div>
  if (error) return <div className="alert-error p-6">{(error as Error).message}</div>
  if (!tenant) return null

  const sub = tenant.subscriptions[0]
  const status = STATUS_STYLE[tenant.status] ?? STATUS_STYLE.TRIAL!

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <Link href="/admin/tenants" className="text-sm hover:underline" style={{ color: 'var(--text-tertiary)' }}>← Tenants</Link>
        <div className="flex items-center gap-3 flex-1">
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>{tenant.displayName}</h1>
          <span className="badge" style={{ background: status.bg, color: status.text }}>{tenant.status}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={enterAsTenant}
            disabled={impersonating || tenant.status === 'SUSPENDED'}
            className="btn-ghost text-xs"
          >
            {impersonating ? 'Entering…' : 'Impersonate'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card title="Identity">
          <dl className="space-y-1 text-sm">
            <Row label="Slug" value={tenant.slug} />
            <Row label="Legal name" value={tenant.legalName ?? '—'} />
            <Row label="Brand" value={tenant.businessProfile?.brandName ?? '—'} />
            <Row label="Email" value={tenant.registrationEmail} />
            <Row label="Created" value={new Date(tenant.createdAt).toLocaleDateString()} />
          </dl>
        </Card>

        <Card title="Subscription">
          {sub ? (
            <dl className="space-y-1 text-sm">
              <Row label="Plan" value={sub.plan.name} />
              <Row label="Status" value={sub.status} />
            </dl>
          ) : <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No active subscription</p>}
        </Card>

        <Card title="Members">
          <ul className="space-y-1 text-sm">
            {tenant.members.map((m) => (
              <li key={m.id}>
                <span className="font-medium">{m.user.email}</span>
                <span className="ml-2" style={{ color: 'var(--text-tertiary)' }}>{m.roleDefinition.name}{m.isOwner ? ' (owner)' : ''}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Integrations">
          {tenant.integrationConnections.length === 0
            ? <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>None</p>
            : (
              <ul className="space-y-1 text-sm">
                {tenant.integrationConnections.map((i) => (
                  <li key={i.id}>
                    <span className="font-medium">{i.provider}</span>
                    <span className="ml-2" style={{ color: 'var(--text-tertiary)' }}>{i.status}</span>
                  </li>
                ))}
              </ul>
            )}
        </Card>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt style={{ color: 'var(--text-tertiary)' }}>{label}</dt>
      <dd style={{ color: 'var(--text-primary)' }}>{value}</dd>
    </div>
  )
}
