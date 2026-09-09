export const dynamic = 'force-dynamic'

export async function GET() {
  const requiredVariables = [
    'CMS_URL',
    'CMS_WEBSITE_KEY',
    'CMS_READ_TOKEN',
    'CMS_REVALIDATION_SECRET',
    'CMS_PREVIEW_SECRET',
    'NEXT_PUBLIC_SITE_URL',
  ] as const
  const missing = requiredVariables.filter((name) => !process.env[name]?.trim())
  if (missing.length > 0) {
    return Response.json(
      {
        cms: 'not-configured',
        missing,
        service: 'dgtl-client-website',
        status: 'unready',
      },
      { headers: { 'Cache-Control': 'no-store' }, status: 503 },
    )
  }

  const cmsURL = process.env.CMS_URL!.replace(/\/$/, '')
  const websiteKey = process.env.CMS_WEBSITE_KEY!
  const readToken = process.env.CMS_READ_TOKEN!

  try {
    const response = await fetch(
      `${cmsURL}/api/dgtl/public/v1/sites/${encodeURIComponent(websiteKey)}`,
      {
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${readToken}`,
          'X-DGTL-Website-Key': websiteKey,
        },
        signal: AbortSignal.timeout(5_000),
      },
    )
    const body = (await response.json().catch(() => null)) as {
      contractVersion?: unknown
      key?: unknown
    } | null
    if (!response.ok || body?.contractVersion !== 1 || body.key !== websiteKey)
      throw new Error('Binding unavailable')

    return Response.json(
      {
        cms: 'connected',
        service: 'dgtl-client-website',
        status: 'ready',
        websiteKey,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return Response.json(
      {
        cms: 'unavailable',
        service: 'dgtl-client-website',
        status: 'unready',
        websiteKey,
      },
      { headers: { 'Cache-Control': 'no-store' }, status: 503 },
    )
  }
}
