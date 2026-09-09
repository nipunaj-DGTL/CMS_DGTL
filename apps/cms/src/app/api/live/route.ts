export function GET() {
  return Response.json(
    { service: 'dgtl-cms', status: 'live' },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
