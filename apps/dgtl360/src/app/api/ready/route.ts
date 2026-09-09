import { checkCMSReadiness } from '../../../lib/cms';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const requiredVariables = [
      'CMS_URL',
      'CMS_WEBSITE_KEY',
      'CMS_READ_TOKEN',
      'CMS_REVALIDATION_SECRET',
      'CMS_PREVIEW_SECRET',
      'RESEND_API_KEY',
      'ENQUIRY_FROM_EMAIL',
      'ENQUIRY_TO_EMAIL',
      'SITE_URL',
    ] as const;
    const missing = requiredVariables.filter((name) => !process.env[name]?.trim());
    if (process.env.NODE_ENV === 'production' && missing.length) {
      return Response.json(
        { missing, service: 'dgtl360-client-website', status: 'not-ready' },
        { headers: { 'Cache-Control': 'no-store' }, status: 503 },
      );
    }
    const website = await checkCMSReadiness();
    return Response.json(
      { service: 'dgtl360-client-website', status: 'ready', websiteKey: website.key, websiteStatus: website.status },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json(
      { service: 'dgtl360-client-website', status: 'not-ready' },
      { headers: { 'Cache-Control': 'no-store' }, status: 503 },
    );
  }
}
