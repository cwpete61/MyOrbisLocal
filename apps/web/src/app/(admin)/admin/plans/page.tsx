'use client'

import { useApi } from '@/hooks/useApi'

interface Plan {
  id: string
  code: string
  name: string
  priceCents: number
  interval: string
  isActive: boolean
}

export default function AdminPlansPage() {
  const { data, error, loading } = useApi<Plan[]>('/api/admin/plans')

  if (loading) return <div>Loading…</div>
  if (error) return <div className="alert-error">{error}</div>
  if (!data) return null

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>Plans</h1>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left" style={{ color: 'var(--text-tertiary)' }}>
            <th className="py-2">Code</th>
            <th>Name</th>
            <th>Price</th>
            <th>Interval</th>
            <th>Active</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p) => (
            <tr key={p.id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <td className="py-2 font-mono">{p.code}</td>
              <td>{p.name}</td>
              <td>${(p.priceCents / 100).toFixed(2)}</td>
              <td>{p.interval}</td>
              <td>{p.isActive ? '✓' : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
