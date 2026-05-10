'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useT } from '@/lib/i18n/I18nProvider'

interface NavItem {
  href: string
  labelKey: string
  icon: React.ReactNode
  comingSoon?: boolean
}

interface NavGroup {
  labelKey: string
  items: NavItem[]
}

function Icon({ d }: { d: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: 'nav.groups.workspace',
    items: [
      { href: '/dashboard', labelKey: 'nav.items.dashboard', icon: <Icon d="M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H9zM9 9h5v5H9z" /> },
    ],
  },
  {
    labelKey: 'nav.groups.connect',
    items: [
      { href: '/integrations', labelKey: 'nav.items.integrations', icon: <Icon d="M13 8a5 5 0 0 1-10 0M8 3v5m0 0-2-2m2 2 2-2" /> },
    ],
  },
  {
    labelKey: 'nav.groups.account',
    items: [
      { href: '/billing',  labelKey: 'nav.items.billing',  icon: <Icon d="M1 5h14v6a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5zm0-2a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2" /> },
      { href: '/settings', labelKey: 'nav.items.settings', icon: <Icon d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm4.3-1.3A4.5 4.5 0 0 0 12.5 8a4.5 4.5 0 0 0-.2-.7l1.5-1.2-1-1.7-1.8.6A4.5 4.5 0 0 0 9.7 4.2L9.5 2.5h-2l-.2 1.7A4.5 4.5 0 0 0 5.9 5 l-1.8-.6-1 1.7 1.5 1.2A4.5 4.5 0 0 0 4.5 8a4.5 4.5 0 0 0 .1.7L3.1 9.9l1 1.7 1.8-.6a4.5 4.5 0 0 0 1.4.8l.2 1.7h2l.2-1.7a4.5 4.5 0 0 0 1.4-.8l1.8.6 1-1.7z" /> },
      { href: '/profile',  labelKey: 'nav.items.profile',  icon: <Icon d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-6 6a6 6 0 0 1 12 0" /> },
      { href: '/help',     labelKey: 'nav.items.help',     icon: <Icon d="M8 2a6 6 0 1 1 0 12A6 6 0 0 1 8 2zm0 4a1.5 1.5 0 0 0-1.5 1.5h1a.5.5 0 0 1 1 0c0 .5-.5.75-.87 1.06A1.5 1.5 0 0 0 7 9.5h1c0-.34.13-.5.63-.84C9.38 8.25 10 7.75 10 6.5A2.5 2.5 0 0 0 8 4zM7.5 11h1v1h-1z" /> },
    ],
  },
]

export function SidebarNav() {
  const pathname = usePathname()
  const t = useT()

  return (
    <div className="space-y-5 pt-1">
      {NAV_GROUPS.map((group) => (
        <div key={group.labelKey}>
          <p
            className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-tertiary)', letterSpacing: '0.06em' }}
          >
            {t(group.labelKey)}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={
                      active
                        ? { background: 'var(--nav-active-bg)', color: 'var(--nav-active-text)', fontWeight: 600 }
                        : { color: 'var(--text-secondary)' }
                    }
                  >
                    <span style={{ opacity: active ? 1 : 0.7 }}>{item.icon}</span>
                    <span className="flex-1">{t(item.labelKey)}</span>
                    {item.comingSoon && (
                      <span
                        className="text-[9px] px-1 py-0.5 rounded font-semibold uppercase tracking-wider flex-shrink-0"
                        style={{ background: 'oklch(55% 0.11 193 / 0.15)', color: 'oklch(65% 0.15 193)', letterSpacing: '0.08em' }}
                      >
                        {t('nav.soonPill')}
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}
