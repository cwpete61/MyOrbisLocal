'use client'

import { useT } from '@/lib/i18n/I18nProvider'

export default function HelpPage() {
  const t = useT()
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{t('help.title')}</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>{t('help.placeholder')}</p>
    </div>
  )
}
