export function GET() {
  return Response.json(
    { cmsWebsiteKey: process.env.CMS_WEBSITE_KEY ?? null, service: 'dgtl360-client-website', status: 'healthy' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
