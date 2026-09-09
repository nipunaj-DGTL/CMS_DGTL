import { revalidatePath, revalidateTag } from 'next/cache';
import { verifyDelivery } from '../../../../lib/cms-signatures';
import { readLimitedText, RequestTooLargeError } from '../../../../lib/http';

const processedDeliveries = new Map<string, number>();
const maximumBodyBytes = 32_768;

const response = (body: object, status = 200) =>
  Response.json(body, { headers: { 'Cache-Control': 'no-store' }, status });

export async function POST(request: Request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return response({ error: 'JSON is required.' }, 415);
  }
  let rawBody: string;
  try {
    rawBody = await readLimitedText(request, maximumBodyBytes);
  } catch (error) {
    return response(
      { error: error instanceof RequestTooLargeError ? 'Request is too large.' : 'Request body is invalid.' },
      error instanceof RequestTooLargeError ? 413 : 400,
    );
  }
  const deliveryID = request.headers.get('x-dgtl-delivery-id') ?? '';
  const signature = request.headers.get('x-dgtl-signature') ?? '';
  const timestamp = request.headers.get('x-dgtl-timestamp') ?? '';
  const secret = process.env.CMS_REVALIDATION_SECRET;
  const websiteKey = process.env.CMS_WEBSITE_KEY;

  if (!secret || !websiteKey) return response({ error: 'CMS revalidation is not configured.' }, 503);
  if (!/^[A-Za-z0-9:_-]{1,128}$/.test(deliveryID) || !verifyDelivery(rawBody, timestamp, signature, secret)) {
    return response({ error: 'Invalid signature.' }, 401);
  }

  const now = Date.now();
  for (const [id, processedAt] of processedDeliveries) {
    if (now - processedAt > 86_400_000) processedDeliveries.delete(id);
  }
  if (processedDeliveries.has(deliveryID)) {
    return response({ duplicate: true, revalidated: false });
  }

  let body: { paths?: unknown; tags?: unknown; websiteKey?: unknown };
  try {
    body = JSON.parse(rawBody) as typeof body;
  } catch {
    return response({ error: 'Invalid JSON body.' }, 400);
  }
  if (body.websiteKey !== websiteKey) return response({ error: 'Wrong website binding.' }, 403);

  const tags = Array.isArray(body.tags) ? [...new Set(body.tags.filter((tag): tag is string => typeof tag === 'string'))] : [];
  const paths = Array.isArray(body.paths) ? [...new Set(body.paths.filter((path): path is string => typeof path === 'string'))] : [];
  const siteTag = `cms:site:${websiteKey}`;
  if (
    tags.length > 20 ||
    paths.length > 20 ||
    tags.some((tag) => tag.length > 256 || (tag !== siteTag && !tag.startsWith(`${siteTag}:`))) ||
    paths.some((path) => path.length > 2_048 || !path.startsWith('/') || path.startsWith('//') || /[\\?\u0000-\u001f]/.test(path) || path.split('/').includes('..'))
  ) {
    return response({ error: 'Unsafe cache target.' }, 400);
  }

  for (const tag of tags) revalidateTag(tag, 'max');
  for (const path of paths) revalidatePath(path);
  processedDeliveries.set(deliveryID, now);
  return response({ duplicate: false, revalidated: true });
}
