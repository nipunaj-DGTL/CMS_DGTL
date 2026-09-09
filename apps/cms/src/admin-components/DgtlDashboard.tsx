import { headers as getHeaders } from 'next/headers'
import Link from 'next/link'
import { getPayload } from 'payload'

import config from '@payload-config'

export default async function DgtlDashboard() {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await getHeaders() })
  if (!user || user.accountType !== 'company') return null

  const [tenants, websites, draftPages, openRequests, failedDeliveries] = await Promise.all([
    payload.count({ collection: 'dgtl-tenants', overrideAccess: false, user, where: { status: { equals: 'active' } } }),
    payload.count({ collection: 'websites', overrideAccess: false, user, where: { status: { equals: 'active' } } }),
    payload.count({ collection: 'pages', overrideAccess: false, user, where: { _status: { equals: 'draft' } } }),
    payload.count({
      collection: 'content-requests',
      overrideAccess: false,
      user,
      where: { status: { in: ['submitted', 'reviewing', 'needs-information', 'in-progress', 'client-review'] } },
    }),
    payload.count({ collection: 'revalidation-deliveries', overrideAccess: false, user, where: { state: { equals: 'failed' } } }),
  ])

  const cards = [
    ['Active clients', tenants.totalDocs, '/admin/collections/dgtl-tenants'],
    ['Active websites', websites.totalDocs, '/admin/collections/websites'],
    ['Draft pages', draftPages.totalDocs, '/admin/collections/pages?where[_status][equals]=draft'],
    ['Open requests', openRequests.totalDocs, '/admin/collections/content-requests'],
    ['Failed deliveries', failedDeliveries.totalDocs, '/admin/collections/revalidation-deliveries?where[state][equals]=failed'],
  ] as const

  return (
    <section className="dgtl-dashboard" aria-labelledby="dgtl-dashboard-title">
      <div>
        <p className="dgtl-eyebrow">Central operations</p>
        <h1 id="dgtl-dashboard-title">DGTL CMS Control Panel</h1>
        <p>Manage every connected client from one tenant-aware workspace.</p>
      </div>
      <div className="dgtl-metrics">
        {cards.map(([label, count, href]) => (
          <Link className="dgtl-metric" href={href} key={label}>
            <span>{label}</span>
            <strong>{count}</strong>
          </Link>
        ))}
      </div>
    </section>
  )
}
