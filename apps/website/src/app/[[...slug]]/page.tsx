import type { Metadata } from 'next'
import { cookies, draftMode } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { CMSClientError } from '@dgtl/cms-client'

import { BlockRenderer } from '@/components/BlockRenderer'
import { getPage } from '@/lib/cms'

type PageProps = { params: Promise<{ slug?: string[] }> }

const readPage = async (params: PageProps['params']) => {
  const { slug: parts = [] } = await params
  const slug = parts.join('/') || 'home'
  const draft = await draftMode()
  const token = draft.isEnabled ? (await cookies()).get('dgtl-preview-token')?.value : undefined
  try {
    return { draft: draft.isEnabled, page: await getPage(slug, token), slug }
  } catch (error) {
    if (error instanceof CMSClientError && error.status === 404) notFound()
    throw error
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { page } = await readPage(params)
  return {
    description: page.seo.metaDescription ?? undefined,
    openGraph: page.seo.ogImage ? { images: [{ alt: page.seo.ogImage.alt, height: page.seo.ogImage.height ?? undefined, url: page.seo.ogImage.url, width: page.seo.ogImage.width ?? undefined }] } : undefined,
    robots: page.seo.noIndex ? { follow: false, index: false } : undefined,
    title: page.seo.metaTitle ?? page.title,
  }
}

export default async function CMSPage({ params }: PageProps) {
  const { draft, page } = await readPage(params)
  return (
    <main className={`cms-page cms-page--${page.typography.fontFamily}`}>
      {draft && <div className="preview-banner">Draft preview — not public <Link href="/api/cms/preview/exit">Exit preview</Link></div>}
      <BlockRenderer blocks={page.layout} />
    </main>
  )
}
