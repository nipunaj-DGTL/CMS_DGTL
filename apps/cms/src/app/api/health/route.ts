import config from '@payload-config'
import { getPayload } from 'payload'

export async function GET() {
  try {
    const payload = await getPayload({ config })
    await payload.count({ collection: 'dgtl-tenants', overrideAccess: true })
    return Response.json({ service: 'dgtl-cms', status: 'healthy' }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return Response.json({ service: 'dgtl-cms', status: 'unhealthy' }, { status: 503 })
  }
}
