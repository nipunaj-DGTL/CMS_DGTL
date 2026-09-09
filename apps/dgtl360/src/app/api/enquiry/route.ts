import { sendEnquiryEmail } from '@/features/enquiry/server/send-enquiry-email';
import { validateEnquiry } from '@/features/enquiry/validation/validate-enquiry';
import { readLimitedText, RequestTooLargeError } from '@/lib/http';

const maximumRequestSize = 20_000;

function json(body: object, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  const requestOrigin = new URL(request.url).origin;

  if (origin && origin !== requestOrigin) {
    return json({ success: false, message: 'Invalid request origin.' }, 403);
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);

  if (contentLength > maximumRequestSize) {
    return json({ success: false, message: 'Request is too large.' }, 413);
  }

  if (!request.headers.get('content-type')?.includes('application/json')) {
    return json({ success: false, message: 'JSON is required.' }, 415);
  }

  let rawBody: string;

  try {
    rawBody = await readLimitedText(request, maximumRequestSize);
  } catch (error) {
    return json(
      { success: false, message: error instanceof RequestTooLargeError ? 'Request is too large.' : 'Invalid request body.' },
      error instanceof RequestTooLargeError ? 413 : 400,
    );
  }

  let requestBody: unknown;
  try {
    requestBody = JSON.parse(rawBody);
  } catch {
    return json({ success: false, message: 'Invalid JSON.' }, 400);
  }

  const result = validateEnquiry(requestBody);

  if (!result.success) {
    return json(result, 400);
  }

  if (result.data.website) {
    return json({ success: true });
  }

  try {
    await sendEnquiryEmail(result.data);
    return json({ success: true });
  } catch (error) {
    console.error('Enquiry email failed:', error instanceof Error ? error.message : 'Unknown error');
    return json({ success: false, message: 'Email service is temporarily unavailable.' }, 503);
  }
}
