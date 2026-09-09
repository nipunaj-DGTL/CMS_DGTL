/* eslint-disable @typescript-eslint/no-explicit-any -- The idempotent seed works across several generated collection document unions. */
import 'dotenv/config'

import { existsSync } from 'node:fs'
import path from 'node:path'
import { getPayload, type Payload } from 'payload'

import config from '../payload.config'
import { seedClients } from './clients'
import { dgtl360Assets, dgtl360HomeBlocks, dgtl360Services, dgtl360Settings } from './dgtl360'

const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry-run')
const selectedClient = [...args].find((arg) => arg.startsWith('--client='))?.split('=')[1]
const toMetaDescription = (value: string) => value.length <= 180 ? value : `${value.slice(0, 177).trimEnd()}…`

const findOne = async (payload: Payload, collection: Parameters<Payload['find']>[0]['collection'], field: string, value: string | number): Promise<Record<string, any> | null> => {
  const result = await payload.find({
    collection,
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { [field]: { equals: value } },
  })
  return (result.docs[0] as Record<string, any> | undefined) ?? null
}

const findOneForWebsite = async (
  payload: Payload,
  collection: Parameters<Payload['find']>[0]['collection'],
  websiteID: string | number,
  field: string,
  value: string | number,
): Promise<Record<string, any> | null> => {
  const result = await payload.find({
    collection,
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { and: [{ website: { equals: websiteID } }, { [field]: { equals: value } }] },
  })
  return (result.docs[0] as Record<string, any> | undefined) ?? null
}

const seedDgtl360Media = async ({
  alt,
  decorative = false,
  file,
  payload,
  tenantID,
  websiteID,
}: {
  alt: string
  decorative?: boolean
  file: string
  payload: Payload
  tenantID: number
  websiteID: number
}): Promise<Record<string, any> | null> => {
  const filename = path.basename(file)
  const existing = await findOneForWebsite(payload, 'media', websiteID, 'filename', filename)
  if (existing) return existing

  const configuredRoot = process.env.DGTL360_ASSET_ROOT?.trim()
  if (!configuredRoot) return null

  const assetRoot = path.resolve(configuredRoot)
  const filePath = path.resolve(assetRoot, file)
  if (!filePath.startsWith(`${assetRoot}${path.sep}`) || !existsSync(filePath)) {
    payload.logger.warn({ file }, 'Skipped a missing or unsafe DGTL360 seed asset.')
    return null
  }

  return payload.create({
    collection: 'media',
    context: { systemOperation: true },
    data: {
      alt,
      classification: 'public',
      decorative,
      scanStatus: 'clean',
      tenant: tenantID,
      website: websiteID,
    },
    filePath,
    overrideAccess: true,
  }) as Promise<Record<string, any>>
}

const seed = async () => {
  const payload = await getPayload({ config })
  const clients = selectedClient ? seedClients.filter((client) => client.tenantKey === selectedClient) : seedClients
  if (clients.length === 0) throw new Error(`Unknown client key: ${selectedClient}`)

  if (dryRun) {
    payload.logger.info({ clients: clients.map((client) => client.tenantKey) }, 'Seed dry run: no records will be changed.')
    process.exit(0)
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase()
  const adminPassword = process.env.SEED_ADMIN_PASSWORD
  if (adminEmail && adminPassword && !(await findOne(payload, 'cms-users', 'email', adminEmail))) {
    await payload.create({
      collection: 'cms-users',
      data: {
        accountType: 'company',
        companyRoles: ['company-super-admin'],
        displayName: 'Local DGTL Administrator',
        email: adminEmail,
        password: adminPassword,
        status: 'active',
      },
      overrideAccess: true,
    })
    payload.logger.info({ email: adminEmail }, 'Created the local company administrator.')
  }

  for (const client of clients) {
    let tenant: Record<string, any> | null = await findOne(payload, 'dgtl-tenants', 'key', client.tenantKey)
    tenant ??= await payload.create({
      collection: 'dgtl-tenants',
      data: {
        activatedAt: new Date().toISOString(),
        displayName: client.tenantName,
        key: client.tenantKey,
        primaryContactEmail: client.adminEmail,
        status: 'active',
      },
      overrideAccess: true,
    })

    let website: Record<string, any> | null = await findOne(payload, 'websites', 'key', client.websiteKey)
    website ??= await payload.create({
      collection: 'websites',
      context: { systemOperation: true },
      data: {
        contentModelVersion: 1,
        displayName: client.websiteName,
        domain: client.domain,
        frontendKey: client.frontendKey,
        key: client.websiteKey,
        previewDomain: `http://localhost:${client.port}`,
        revalidationSecretRef: `env:CMS_REVALIDATION_SECRETS:${client.websiteKey}`,
        revalidationUrl: `http://localhost:${client.port}/api/cms/revalidate`,
        status: 'active',
        tenant: tenant.id,
      },
      overrideAccess: true,
    })

    let settings = await findOne(payload, 'site-settings', 'website', website.id)
    settings ??= await payload.create({
      collection: 'site-settings',
      context: { systemOperation: true },
      data: {
        contact: { email: `hello@${client.domain}`, phone: '+94 11 000 0000' },
        defaultSEO: { description: `Digital services from ${client.tenantName}.`, title: client.tenantName },
        displayName: client.tenantName,
        footerText: `© ${new Date().getFullYear()} ${client.tenantName}`,
        locale: 'en',
        tenant: tenant.id,
        timezone: 'Asia/Colombo',
        website: website.id,
      },
      overrideAccess: true,
    })

    let home = await findOneForWebsite(payload, 'pages', website.id, 'slug', 'home')
    home ??= await payload.create({
      collection: 'pages',
      context: { systemOperation: true },
      data: {
        _status: 'published',
        layout: [
          {
            blockType: 'hero',
            heading: `A sharper digital presence for ${client.tenantName}`,
            links: [{ label: 'Start a conversation', url: '/contact' }],
            text: 'A secure, fast and flexible website powered by the DGTL content platform.',
          },
          {
            blockType: 'cardGrid',
            cards: [
              { link: { label: 'Learn more', url: '/about' }, text: 'Content is separated by client and enforced on every query.', title: 'Tenant safe' },
              { link: { label: 'Learn more', url: '/about' }, text: 'Draft, preview and publish without a website redeploy.', title: 'Client-admin friendly' },
              { link: { label: 'Learn more', url: '/about' }, text: 'Signed delivery updates only the website that changed.', title: 'Precisely cached' },
            ],
            heading: 'Built for focused teams',
          },
          {
            blockType: 'callToAction',
            heading: 'Ready to publish something better?',
            link: { label: 'Contact us', url: '/contact' },
            text: 'Use Payload Admin to replace this synthetic content with approved client content.',
          },
        ],
        publishedAt: new Date().toISOString(),
        seo: { metaDescription: `Welcome to ${client.tenantName}.`, metaTitle: client.tenantName, noIndex: true },
        showInNavigation: true,
        slug: 'home',
        template: 'landing',
        tenant: tenant.id,
        title: 'Home',
        website: website.id,
      },
      draft: false,
      overrideAccess: true,
    })

    if (client.websiteKey === 'client-02-main') {
      const existingLayout = Array.isArray(home.layout) ? home.layout as Array<Record<string, any>> : []
      const legacyServiceCards = existingLayout.find((block) => block.blockType === 'cardGrid')?.cards as Array<Record<string, any>> | undefined

      const mediaByFile = new Map<string, Record<string, any>>()
      const mediaSeeds = [
        ...Object.values(dgtl360Assets),
        ...dgtl360Services.map((service) => ({ alt: `${service.label} service visual`, file: service.image })),
      ]
      for (const mediaSeed of mediaSeeds) {
        const media = await seedDgtl360Media({
          ...mediaSeed,
          payload,
          tenantID: tenant.id,
          websiteID: website.id,
        })
        if (media) mediaByFile.set(mediaSeed.file, media)
      }

      const servicePages: Array<Record<string, any>> = []
      for (const service of dgtl360Services) {
        const slug = `services/${service.slug}`
        let servicePage = await findOneForWebsite(payload, 'pages', website.id, 'slug', slug)
        if (!servicePage) {
          const legacyCard = legacyServiceCards?.find((card) =>
            typeof card.link?.url === 'string' && card.link.url.endsWith(`/${service.slug}`),
          )
          const image = mediaByFile.get(service.image)
          servicePage = await payload.create({
            collection: 'pages',
            context: { systemOperation: true },
            data: {
              _status: 'published',
              layout: [{
                accent: service.accent,
                blockType: 'serviceDetail',
                cardHeadline: service.cardHeadline,
                detailDescription: service.detailDescription,
                image: image?.id,
                imagePosition: service.imagePosition,
                label: legacyCard?.title ?? service.label,
                order: service.order,
                preview: service.preview,
                sections: service.sections,
                summary: legacyCard?.text ?? service.summary,
                tagline: service.tagline,
              }],
              publishedAt: new Date().toISOString(),
              seo: {
                metaDescription: toMetaDescription(legacyCard?.text ?? service.summary),
                metaTitle: `${legacyCard?.title ?? service.label} — DGTL 360`,
                noIndex: false,
                ogImage: image?.id,
              },
              showInNavigation: false,
              slug,
              template: 'service',
              tenant: tenant.id,
              title: legacyCard?.title ?? service.label,
              website: website.id,
            },
            draft: false,
            overrideAccess: true,
          }) as Record<string, any>
        }
        servicePages.push(servicePage)
      }

      const requiredHomeBlocks = ['companyOverview', 'identityField', 'serviceIndex', 'statement', 'teamShowcase']
      if (requiredHomeBlocks.some((blockType) => !existingLayout.some((block) => block.blockType === blockType))) {
        const hero = existingLayout.find((block) => block.blockType === 'hero') ?? {
          heading: 'MAKE THE THING.|MAKE IT LAND.|MAKE IT WORK.',
          links: [{ label: 'TELL US THE PROBLEM ↗', newTab: false, url: '/#enquiry' }],
          text: 'Brand, content, product, growth and the systems underneath—one Colombo crew from first sketch to live. Poddak less theatre, much more traction.',
        }
        const callToAction = existingLayout.find((block) => block.blockType === 'callToAction') ?? {
          heading: 'Tell us the problem. We’ll route the next useful step.',
          link: { label: 'Start an enquiry', newTab: false, url: '/#enquiry' },
          text: 'Tell us what you are trying to make, fix or move forward. We’ll bring in the right people, ask the useful questions and come back with a practical next step.',
        }
        const contactDetails = existingLayout.find((block) => block.blockType === 'contactDetails') ?? {
          address: dgtl360Settings.contact.address,
          email: dgtl360Settings.contact.email,
          heading: 'Start an enquiry',
          phone: dgtl360Settings.contact.phone,
        }
        const teamPortraits = mediaByFile.get(dgtl360Assets.teamPortraits.file)
        const teamProfiles = mediaByFile.get(dgtl360Assets.teamProfiles.file)
        const heroVideo = mediaByFile.get(dgtl360Assets.heroVideo.file)
        const retainedBlocks = existingLayout.filter((block) =>
          !['hero', 'cardGrid', 'callToAction', 'contactDetails', ...requiredHomeBlocks].includes(block.blockType),
        )

        home = await payload.update({
          collection: 'pages',
          context: { systemOperation: true },
          data: {
            _status: 'published',
            layout: [
              {
                blockType: 'hero',
                ...hero,
                activeServiceLinkLabel: hero.activeServiceLinkLabel ?? 'EXPLORE THIS SERVICE ↗',
                cardLinkLabel: hero.cardLinkLabel ?? 'EXPLORE SERVICE ↗',
                desktopServicesLabel: hero.desktopServicesLabel ?? 'SCROLL TO EXPLORE',
                eyebrow: hero.eyebrow ?? 'ONE CREW · EIGHT DOORS',
                mobileServicesLabel: hero.mobileServicesLabel ?? 'SERVICES · EIGHT DOORS',
                scrollPrompt: hero.scrollPrompt ?? 'SCROLL THE WORK ↓',
                video: hero.video ?? heroVideo?.id,
              },
              {
                blockType: 'serviceIndex',
                heading: 'DGTL 360 services',
                servicePages: servicePages.map((page) => page.id),
              },
              dgtl360HomeBlocks.companyOverview,
              dgtl360HomeBlocks.statement,
              {
                ...dgtl360HomeBlocks.teamShowcase,
                portraitImage: teamPortraits?.id,
                profileImage: teamProfiles?.id,
              },
              { blockType: 'callToAction', ...callToAction },
              { blockType: 'contactDetails', ...contactDetails },
              dgtl360HomeBlocks.identityField,
              ...retainedBlocks,
            ],
          },
          draft: false,
          id: home.id,
          overrideAccess: true,
        }) as Record<string, any>
      }

      if (!settings.brandContent?.locationLabel) {
        settings = await payload.update({
          collection: 'site-settings',
          context: { systemOperation: true },
          data: dgtl360Settings,
          id: settings.id,
          overrideAccess: true,
        })
      }
    }

    if (!website.homepage) {
      website = await payload.update({
        collection: 'websites',
        data: { homepage: home.id },
        id: website.id,
        overrideAccess: true,
      })
    }

    for (const location of ['header', 'footer'] as const) {
      const existing = await payload.find({
        collection: 'navigation',
        depth: 0,
        limit: 1,
        overrideAccess: true,
        where: { and: [{ website: { equals: website.id } }, { location: { equals: location } }] },
      })
      if (!existing.totalDocs) {
        await payload.create({
          collection: 'navigation',
          context: { systemOperation: true },
          data: {
            items: [{ enabled: true, label: 'Home', order: 0, page: home.id }],
            location,
            tenant: tenant.id,
            website: website.id,
          },
          overrideAccess: true,
        })
      }
    }

    payload.logger.info({ tenantID: tenant.id, websiteID: website.id, websiteKey: client.websiteKey }, 'Seeded client.')
  }

  payload.logger.info('Seed complete. Client company admin invitations remain an explicit operator step.')
  process.exit(0)
}

await seed()
