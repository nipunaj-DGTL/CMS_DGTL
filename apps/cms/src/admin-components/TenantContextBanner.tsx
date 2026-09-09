'use client'

import { useTenantSelection } from '@payloadcms/plugin-multi-tenant/client'
import { useEffect, useState } from 'react'

interface WebsiteResult {
  docs?: Array<{ domain?: string; displayName?: string }>
}

export default function TenantContextBanner() {
  const { options, selectedTenantID } = useTenantSelection()
  const [websiteResult, setWebsiteResult] = useState<{
    tenantID: string
    website: NonNullable<WebsiteResult['docs']>[number] | null
  } | null>(null)
  const selected = options.find((option) => String(option.value) === String(selectedTenantID))
  const website = websiteResult?.tenantID === String(selectedTenantID) ? websiteResult.website : null

  useEffect(() => {
    if (!selectedTenantID) return
    const tenantID = String(selectedTenantID)
    const controller = new AbortController()
    const query = new URLSearchParams({ depth: '0', limit: '1', 'where[tenant][equals]': tenantID })
    fetch(`/api/websites?${query}`, { credentials: 'include', signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((result: WebsiteResult | null) => setWebsiteResult({ tenantID, website: result?.docs?.[0] ?? null }))
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setWebsiteResult({ tenantID, website: null })
      })
    return () => controller.abort()
  }, [selectedTenantID])

  return (
    <aside className="dgtl-tenant-banner" aria-label="Current client context">
      <span>Current client</span>
      <strong>{String(selected?.label ?? 'Select a client')}</strong>
      <small>Website: {website?.domain ?? 'No website selected'}</small>
      <small>Environment: {process.env.NODE_ENV === 'production' ? 'Production' : 'Development'}</small>
    </aside>
  )
}
