# Architecture

The CMS is the only component allowed to read or write PostgreSQL. Payload’s multi-tenant plugin injects tenant fields and Admin filtering, while explicit collection access functions independently constrain list and direct-ID operations. Hooks then validate same-tenant website relationships and publishing transitions. This layered model prevents the Admin tenant selector from becoming an authorization boundary.

Public websites call only `/api/dgtl/public/v1/sites/{websiteKey}/...`. A non-secret website key selects the binding; a separate server-only bearer token proves that the caller is the bound deployment. The handler resolves an active website and active tenant before using Payload Local API with elevated access, and maps records into the versioned public DTO rather than exposing raw Payload documents.

Preview tokens are short-lived HMAC claims bound to user, tenant, website, and page. The website verifies the token before enabling Draft Mode; the CMS verifies the same binding again before returning a draft. Public query parameters can never opt into draft content.

Publishing stores an activity event and pending revalidation delivery in the same Payload request transaction. The worker signs the raw body and delivers it after commit. The website validates timestamp, signature, website key, tag prefix, path allowlist, and delivery ID before calling Next.js revalidation APIs.

## Trust boundaries

- Browsers, editor input, paths, relationship IDs, uploaded files, and request bodies are untrusted.
- Client users receive application-level logical isolation, not a claim of physical database isolation.
- DGTL super admins have standing cross-tenant access and therefore require individual accounts, MFA, monthly role review, visible tenant context, and append-only activity records.
- Database, object storage, email, preview, and revalidation credentials are runtime secrets. They are never public website variables.

## Scaling path

The MVP runs one CMS web process, one worker, and four independently deployable website instances. Multi-instance website or CMS deployments require a shared Next.js cache/deduplication store and connection-pool sizing. A future client that contractually requires physical isolation should receive a dedicated Payload deployment/database using the same content contract.
