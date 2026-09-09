# Email service

The enquiry forms send through a server-only Next.js route using Resend. The browser never receives the Resend API key.

## Folder structure

```text
src/
├── app/api/enquiry/route.ts                  # HTTP boundary, origin/body checks and safe responses
└── features/enquiry/
    ├── components/
    │   ├── enquiry-section.tsx               # Shared contact section
    │   └── enquiry-form.client.tsx           # Form submission state and accessible feedback
    ├── email/enquiry-email.ts                # Escaped HTML and plain-text email renderers
    ├── server/send-enquiry-email.ts           # Server-only Resend integration
    ├── types/enquiry.types.ts                 # Shared payload contracts
    ├── validation/validate-enquiry.ts         # Runtime validation and length limits
    └── enquiry.module.css                     # Form and status presentation
```

## Why Resend

- Its official SDK supports the Next.js App Router.
- It supports custom-domain authentication, delivery tracking, suppression handling and a free starting tier.
- The API-based integration avoids managing SMTP passwords and connections inside serverless functions.

Official references: [Vercel Marketplace](https://vercel.com/marketplace/resend), [Next.js guide](https://resend.com/docs/send-with-nextjs), [domain verification](https://resend.com/docs/dashboard/domains/introduction), and [pricing](https://resend.com/pricing).

## Production setup

1. Create a Resend account and API key for this application.
2. In Resend, add `mail.dgtl.lk` as the sending domain. Using a subdomain isolates transactional-email reputation from normal company mail.
3. Add the SPF and DKIM records Resend provides to the DNS host. Add DMARC after SPF and DKIM verify.
4. Store these values as runtime-only secrets in the deployment environment:

   ```dotenv
   RESEND_API_KEY=<your-resend-api-key>
   ENQUIRY_FROM_EMAIL="DGTL 360 Website <enquiries@mail.dgtl.lk>"
   ENQUIRY_TO_EMAIL="riz@dgtl.lk"
   ```

5. Redeploy after changing environment variables. For local development, copy `.env.example` to `.env.local` and add a development API key.

The verified domain must match the domain in `ENQUIRY_FROM_EMAIL`. During initial testing, Resend's `onboarding@resend.dev` sender can be used subject to its test-recipient restrictions.

## Request flow and safeguards

1. The shared form posts JSON to `/api/enquiry`.
2. The route checks the request origin, content type and body size.
3. Runtime validation checks required fields and maximum lengths.
4. A hidden honeypot quietly discards basic bot submissions.
5. User content is HTML-escaped before rendering the notification.
6. Resend sends the message to `ENQUIRY_TO_EMAIL`; `replyTo` is set to the visitor's address.
7. The form announces sending, success and error states using an accessible live region.

Add a Cloudflare/reverse-proxy rate-limit rule for `/api/enquiry` before launch. Add CAPTCHA only if abuse warrants its usability and privacy cost. Monitor Resend bounce and complaint events before adding newsletters or other marketing email.

## Testing

Run the normal project checks:

```bash
pnpm --filter @dgtl/dgtl360 test
pnpm --filter @dgtl/dgtl360 lint
pnpm --filter @dgtl/dgtl360 build
```

Then submit one enquiry using a non-sensitive test message and confirm it arrives at `ENQUIRY_TO_EMAIL`. Do not test with production personal data until the domain and destination are verified.
