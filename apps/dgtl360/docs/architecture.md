# Architecture

The site is a Next.js 16 App Router client of the shared DGTL CMS. It uses a feature-first UI structure plus the monorepo's versioned content contracts and authenticated CMS SDK.

```text
apps/dgtl360/
├── docs/                         # Architecture and maintenance notes
├── public/
│   ├── assets/reference/         # Approved source imagery and visual references
│   ├── favicon.svg
│   └── og.png                    # Social sharing image
├── src/
│   ├── app/
│   │   ├── (site)/
│   │   │   ├── page.tsx          # CMS-driven homepage composition
│   │   │   ├── [...slug]/        # Arbitrary CMS page routes
│   │   │   ├── posts/            # Public post list and detail routes
│   │   │   └── services/[slug]/  # CMS service detail routes
│   │   ├── api/cms/              # Signed preview and cache invalidation
│   │   ├── api/enquiry/route.ts  # Server-only enquiry email endpoint
│   │   ├── api/health/route.ts   # Process liveness
│   │   ├── api/ready/route.ts    # Live authenticated CMS readiness
│   │   ├── globals.css           # Tokens, resets, global accessibility rules
│   │   ├── layout.tsx            # Fonts and global metadata
│   │   └── not-found.tsx         # Unknown route state
│   ├── components/
│   │   └── layout/               # Shared site-wide layout components
│   ├── lib/                       # CMS adapter, signature and HTTP guards
│   ├── content/
│   │   └── local/services.ts     # Explicit development fallback only
│   └── features/
│       ├── company/              # Who-we-are and attitude sections
│       ├── enquiry/              # Form UI, validation, email rendering and Resend service
│       ├── hero/                 # Homepage opening composition
│       ├── identity/             # DGTL field/brand transition
│       ├── navigation/           # Global navigation
│       ├── services/             # Homepage cards and detail-page template
│       └── team/                 # Interactive team/profile system
├── next.config.ts                # Next.js configuration
├── package.json
├── postcss.config.mjs            # Tailwind/PostCSS integration
├── tsconfig.json
└── package.json                  # pnpm workspace package manifest
```

## Rules for future changes

1. Keep route files thin. Compose feature components in `src/app`; do not place large UI implementations there.
2. Add content fields to the shared contract and CMS model before consuming them; local sample content is development-only.
3. Put feature-specific styles beside the feature using CSS Modules.
4. Put reusable site-wide layout pieces in `src/components`, not inside one feature.
5. Add client rendering only to the smallest interactive component that needs browser state.
6. Use direct imports across server/client boundaries. Avoid barrels that mix client and server components.
7. Store secrets in deployment environment variables; never commit `.env` files.
8. Keep CMS credentials server-only. Production must fail visibly when the CMS is unavailable.
9. Deploy with the repository Docker/Compose pipeline and the pinned Node/pnpm versions.

## Scaling path

- All published content is delivered by the headless CMS; do not introduce new production-only local copy.
- Enforce durable rate limiting for `/api/enquiry` at the reverse proxy/Cloudflare boundary and add optional CRM delivery when required.
- Add image derivatives or managed image delivery when final photography replaces the reference composites.
- Add analytics, error monitoring, and performance budgets before a high-traffic campaign launch.
- Keep the single web application until release ownership or operational boundaries justify separate services.
