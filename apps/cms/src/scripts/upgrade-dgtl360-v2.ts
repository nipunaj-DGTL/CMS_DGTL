/* eslint-disable @typescript-eslint/no-explicit-any -- Scoped, versioned import spans Payload block unions. */
import 'dotenv/config'
import { createHash } from 'node:crypto'
import { closeSync, existsSync, openSync, readFileSync, readSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { getPayload, createLocalReq } from 'payload'
import config from '../payload.config'
import { relationID } from '../access/policy'
import { services } from '../../../dgtl360/src/content/local/services'
import { teamMembers } from '../../../dgtl360/src/content/local/team'
import { glyphs } from '../../../dgtl360/src/features/identity/letters'

// Never invoked by application startup or the general demo seed.
// This is a one-time content upgrade of the EXISTING Client 02 website.
const args = process.argv.slice(2)
const apply = args.includes('--apply')
const backup = args.find(value => value.startsWith('--backup='))?.slice(9)
const root = path.resolve(import.meta.dirname, '../../../..')
const assetRoot = path.join(root, 'apps/dgtl360/public')
const websiteKey = 'client-02-main'
const releaseKey = 'dgtl360-v2'
const canonicalSlugs = new Set(['home', ...services.map(service => `services/${service.slug}`)])
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const description = (value: string) => value.length <= 180 ? value : `${value.slice(0, 177).trimEnd()}…`
const isPostgresDump = (filename: string | undefined) => {
  if (!filename || !existsSync(filename)) return false
  const handle = openSync(filename, 'r')
  try {
    const header = Buffer.alloc(5)
    return readSync(handle, header, 0, 5, 0) === 5 && header.toString() === 'PGDMP'
  } finally { closeSync(handle) }
}

async function main() {
  if (apply && !isPostgresDump(backup)) {
    throw new Error('Apply requires --backup=<existing PostgreSQL custom-format dump>. Take a fresh database and media backup first.')
  }
  const payload = await getPayload({ config })
  try {
    const site = (await payload.find({ collection: 'websites', depth: 0, limit: 1, where: { key: { equals: websiteKey } }, overrideAccess: true })).docs[0]
    if (!site || !relationID(site.tenant)) throw new Error('The existing DGTL360 Client 02 website was not found. No tenant is created by this script.')
    if (site.frontendKey === releaseKey) { console.log('DGTL360 v2 was already imported. Later CMS edits are preserved; nothing changed.'); return }
    const tenantID = relationID(site.tenant) as number
    const allPages = (await payload.find({ collection: 'pages', depth: 0, pagination: false, overrideAccess: true, sort: 'id' })).docs
    const pages = allPages.filter(page => relationID(page.website) === site.id)
    const home = pages.find(page => page.slug === 'home')
    if (!home) throw new Error('Existing home page missing. Refusing to create a duplicate website.')
    for (const page of pages.filter(page => canonicalSlugs.has(page.slug))) {
      const latest = await payload.findByID({ collection: 'pages', id: page.id, draft: true, depth: 0, overrideAccess: true })
      if (latest._status !== 'published' || page.archivedAt) throw new Error(`Resolve the draft/archived canonical page ${page.id} before importing.`)
    }
    const settings = (await payload.find({ collection: 'site-settings', depth: 0, limit: 1, where: { website: { equals: site.id } }, overrideAccess: true })).docs[0]
    const navigations = (await payload.find({ collection: 'navigation', depth: 0, pagination: false, where: { website: { equals: site.id } }, overrideAccess: true })).docs
    if (!settings) throw new Error('Existing Site Settings missing.')
    const untouchedBefore = hash(allPages.filter(page => relationID(page.website) !== site.id || !canonicalSlugs.has(page.slug)))
    const plan = { websiteID: site.id, websiteKey, homeID: home.id, servicePages: services.map(service => ({ slug: `services/${service.slug}`, existingID: pages.find(page => page.slug === `services/${service.slug}`)?.id ?? null })), namedProfiles: teamMembers.length, preservedCustomPages: pages.filter(page => !canonicalSlugs.has(page.slug)).map(page => page.id), apply }
    console.log(JSON.stringify(plan, null, 2))
    if (!apply) return
    const backupDirectory = path.join(root, '.backups')
    mkdirSync(backupDirectory, { recursive: true })
    const snapshot = path.join(backupDirectory, `dgtl360-v2-content-before-${Date.now()}.json`)
    writeFileSync(snapshot, JSON.stringify({ site, pages, settings, navigations }, null, 2))
    console.log(`Recoverable content snapshot: ${snapshot}`)

    // Upload only new assets through the normal media hook, preserving scan and tenant validation.
    const mediaID = async (relative: string, alt: string) => {
      const filePath = path.resolve(assetRoot, relative.replace(/^\//, ''))
      if (!filePath.startsWith(`${assetRoot}${path.sep}`) || !existsSync(filePath)) throw new Error(`Missing or unsafe release asset: ${relative}`)
      const checksum = createHash('sha256').update(readFileSync(filePath)).digest('hex')
      const existing = (await payload.find({ collection: 'media', depth: 0, limit: 1, overrideAccess: true, where: { and: [{ website: { equals: site.id } }, { checksum: { equals: checksum } }, { classification: { equals: 'public' } }, { scanStatus: { equals: 'clean' } }] } })).docs[0]
      if (existing) return existing.id
      const media = await payload.create({ collection: 'media', overrideAccess: true, context: { systemOperation: true }, filePath, data: { tenant: tenantID, website: site.id, alt, classification: 'public', scanStatus: 'pending' } })
      return media.id
    }
    const portraits: Array<number | null> = []
    for (const member of teamMembers) portraits.push(member.image ? await mediaID(member.image, `Temporary sample portrait for ${member.name}; not a verified photo of this person.`) : null)
    const serviceImages = new Map<string, number>()
    for (const service of services) serviceImages.set(service.slug, await mediaID(service.image, `${service.label} service visual`))
    const heroVideo = await mediaID('/assets/video/mycelial-transport.mp4', 'Abstract mycelial transport animation')

    const req = await createLocalReq({ context: { systemOperation: true } }, payload)
    const transaction = await payload.db.beginTransaction()
    if (!transaction) throw new Error('A transaction is required for the content switch.')
    req.transactionID = transaction
    try {
      const serviceIDs: number[] = []
      for (const service of services) {
        const slug = `services/${service.slug}`
        const existing = pages.find(page => page.slug === slug)
        const block = { ...service, blockType: 'serviceDetail' as const, image: serviceImages.get(service.slug) }
        const oldLayout = existing?.layout ?? []
        const nextLayout = oldLayout.some(item => item.blockType === 'serviceDetail')
          ? oldLayout.map(item => item.blockType === 'serviceDetail' ? { ...block, id: item.id } : item)
          : [block, ...oldLayout]
        const data: any = { tenant: tenantID, website: site.id, slug, title: service.label, template: 'service', _status: 'published', layout: nextLayout,
          seo: { ...existing?.seo, metaTitle: `${service.label} — DGTL 360`, metaDescription: description(service.summary), ogImage: serviceImages.get(service.slug) } }
        const saved = existing
          ? await payload.update({ collection: 'pages', id: existing.id, data, draft: false, req, overrideAccess: true })
          : await payload.create({ collection: 'pages', data, draft: false, req, overrideAccess: true })
        serviceIDs.push(saved.id)
      }
      const replacements: Record<string, any> = {
        companyOverview: {
          heading: 'One crew.\nEvery angle.', kicker: 'Who we are', tagline: 'Creative. Technology. Business.',
          lead: 'We are a 360° creative, technology, and business solutions agency that transforms ideas into impactful brands and scalable businesses.',
          paragraphs: [{ text: 'By combining strategy, design, marketing, technology, AI, media production, and event management, we deliver end-to-end solutions that help organizations launch, grow, and lead in an ever-evolving digital world.' }, { text: 'Our focus is simple: create measurable value through innovation, creativity, and execution excellence.' }],
          capabilities: ['Production', 'Brand & strategy', 'Digital marketing', 'Web development', 'App development', 'Digital services', 'Events & experiences', 'Agentic AI'].map(label => ({ label })),
          link: { label: 'Let’s build something ↗', url: '/#enquiry', newTab: false },
        },
        teamShowcase: {
          instruction: 'Select a team member to learn more.', portraitImage: null, profileImage: null,
          members: teamMembers.map((member, index) => ({ name: member.name, number: String(index + 1).padStart(2, '0'), role: member.role, description: member.bio, linkedin: member.linkedin, image: portraits[index], portraitPosition: '50% 50%', profilePosition: '50% 50%' })),
        },
        identityField: { alphabets: [{ characters: glyphs.join('') }], ariaLabel: 'DGTL logo with interactive multilingual letters' },
        serviceIndex: { servicePages: serviceIDs },
      }
      const layout = home.layout.map(block => block.blockType === 'hero'
        ? { ...block, video: block.video ?? heroVideo, scrollPrompt: 'SCROLL DOWN' }
        : { ...block, ...replacements[block.blockType] })
      await payload.update({ collection: 'pages', id: home.id, data: { layout, _status: 'published' }, draft: false, overrideAccess: true, req })
      let privacy = pages.find(page => page.slug === 'privacy-policy')
      if (!privacy) privacy = await payload.create({ collection: 'pages', overrideAccess: true, req, data: {
        tenant: tenantID, website: site.id, title: 'Privacy Policy', slug: 'privacy-policy', template: 'standard', _status: 'published', showInNavigation: false,
        seo: { metaTitle: 'Privacy Policy', noIndex: true },
        layout: [{ blockType: 'hero', heading: 'Privacy Policy', eyebrow: 'DGTL Foundry Pvt Ltd', text: 'Our full privacy policy will be available here. For information about how your personal information is handled, or to make a privacy-related request, contact us.', links: [{ label: 'Privacy enquiries', url: `mailto:${settings.contact?.email || 'info@dgtl.lk'}`, newTab: false }] }],
      } })
      const footer = navigations.find(nav => nav.location === 'footer')
      if (footer && !(footer.items ?? []).some(item => relationID(item.page) === privacy!.id || item.externalURL === '/privacy-policy')) {
        await payload.update({ collection: 'navigation', id: footer.id, overrideAccess: true, req, data: { items: [...(footer.items ?? []), { label: 'Privacy Policy', page: privacy.id, enabled: true, order: (footer.items?.length ?? 0) + 1 }] } })
      }
      await payload.update({ collection: 'site-settings', id: settings.id, overrideAccess: true, req, data: {
        serviceContent: { ...settings.serviceContent, reelInstruction: 'DRAG OR SWIPE TO EXPLORE · SELECT A SERVICE' },
        brandContent: { ...settings.brandContent, backToTopLabel: 'Back to top ⌃' },
      } })
      // Keep the same tenant, website key, domains, credentials and delivery target.
      await payload.update({ collection: 'websites', id: site.id, overrideAccess: true, req, data: { frontendKey: releaseKey } })
      await payload.db.commitTransaction(transaction)
    } catch (error) { await payload.db.rollbackTransaction(transaction); throw error }
    const after = (await payload.find({ collection: 'pages', depth: 0, pagination: false, overrideAccess: true, sort: 'id' })).docs
    const originalIDs = new Set(allPages.map(page => page.id))
    const untouchedAfter = hash(after.filter(page => originalIDs.has(page.id) && (relationID(page.website) !== site.id || !canonicalSlugs.has(page.slug))))
    if (untouchedBefore !== untouchedAfter) throw new Error('Unexpected change to a non-target page; inspect the backup before continuing.')
    console.log('PASS: DGTL360 v2 imported on the existing website. Other clients and custom pages unchanged. Old page revisions retained. Privacy policy is a placeholder, not a legal approval.')
  } finally { await payload.destroy() }
}
main().then(() => process.exit(0)).catch(error => { console.error(error instanceof Error ? error.message : 'Upgrade failed'); process.exit(1) })
