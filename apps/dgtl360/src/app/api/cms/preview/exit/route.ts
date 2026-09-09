import { cookies, draftMode } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const draft = await draftMode();
  draft.disable();
  const cookieStore = await cookies();
  cookieStore.delete('dgtl-preview-token');
  return NextResponse.redirect(new URL('/', request.url), 303);
}
