/** CMS-backed pages are request-rendered. This keeps container builds
 * reproducible and makes the live CMS/runtime boundary explicit. */
export const dynamic = 'force-dynamic';

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
