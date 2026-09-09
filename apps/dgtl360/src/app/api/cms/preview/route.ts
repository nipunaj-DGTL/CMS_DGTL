import { cookies, draftMode } from 'next/headers';
import { NextResponse } from 'next/server';
import { previewPathFromSlug, verifyPreviewToken } from '../../../../lib/cms-signatures';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') ?? '';
  const destination = previewPathFromSlug(url.searchParams.get('slug'));
  if (!destination) {
    return Response.json({ error: 'Preview destination is invalid.' }, { status: 400 });
  }
  const websiteKey = process.env.CMS_WEBSITE_KEY;
  const secret = process.env.CMS_PREVIEW_SECRET;
  const claims = secret ? verifyPreviewToken(token, secret) : null;
  if (!claims || claims.websiteKey !== websiteKey) {
    return Response.json({ error: 'Preview link is invalid or expired.' }, { status: 401 });
  }

  const draft = await draftMode();
  draft.enable();
  const cookieStore = await cookies();
  cookieStore.set('dgtl-preview-token', token, {
    httpOnly: true,
    maxAge: 300,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  return NextResponse.redirect(new URL(destination, url.origin));
}
