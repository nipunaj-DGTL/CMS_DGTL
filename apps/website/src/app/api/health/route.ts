export function GET() {
  return Response.json({ service: 'dgtl-client-website', status: 'healthy' }, { headers: { 'Cache-Control': 'no-store' } })
}
