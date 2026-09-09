# Security controls

- Account type and role assignments are field-protected and additionally checked in a before-change hook.
- The only human profiles are `company-super-admin` and `client-admin`.
- CMS User management is Super-Admin-only. A client company admin can update safe fields on their own account but cannot change account status, account type, company roles, or tenant assignments.
- Account unlock is explicitly Super-Admin-only. This overrides Payload 3.88.0's permissive default and mitigates GHSA-jg8r-5jh2-v2xj until a compatible patched Payload release is published.
- Authorization refreshes the current user and active tenant state from the database, so suspending an account or tenant also blocks requests made with older session claims.
- Removing an assignment, suspending an account, changing its type, or deleting it cannot leave a tenant without an active client company admin.
- Client company admins can create, edit, preview, publish, and manage media only inside their assigned tenant. Super admins can operate across all tenants.
- Tenant `notes` are DGTL-company-private and are removed from Client Admin reads and writes.
- Generated admin/raw APIs require an authenticated scoped user. Public delivery uses the narrow DGTL DTO endpoints.
- Website credentials are compared in constant time and return indistinguishable not-found responses for invalid bindings.
- Preview and revalidation messages are signed, expire after five minutes, and are bound to a website.
- Rich text is rendered node-by-node without `dangerouslySetInnerHTML`; raw HTML/script blocks do not exist.
- External content links allow only HTTPS, `mailto`, `tel`, or internal paths. Revalidation paths/tags are allowlisted.
- Upload MIME types exclude executable formats and unsanitized SVG. Byte-level magic/MIME verification runs before acceptance; production requires private ClamAV scanning before `scanStatus` can become `clean`.
- Production media uses private S3/R2 object storage with tenant-aware keys. Public delivery is streamed through the website-bound CMS route; checksum-versioned URLs receive immutable caching while unversioned legacy URLs must revalidate.
- GraphQL is disabled. CORS and CSRF origins are explicit runtime configuration.
- Every third-party GitHub Action is pinned to a reviewed 40-character commit
  SHA with its release version retained as a comment. CI enforces this rule,
  checkout credentials are not persisted, and Dependabot proposes weekly
  JavaScript, Action, and Docker dependency updates for review.
- The release-image verification job has read-only repository permission. GHCR
  write and OIDC token permissions exist only in the protected image-build job
  that needs them. Release images require a successful `ci.yml` push run for
  the exact source SHA and a protected staging or production Environment.
- CI service containers and the Trivy scanner are pinned to reviewed OCI
  manifest digests. Trivy runs directly from that digest instead of a composite
  Action whose transitive setup steps use mutable references; every fixed or
  unfixed High/Critical finding blocks the workflow.
- Release builds checksum-verify the platform-specific Buildx executable before
  installing it and pin the BuildKit multi-platform image digest. This prevents
  a mutable release asset or builder tag from silently changing the toolchain
  that produces a signed application digest.
- Gitleaks also runs from a reviewed OCI digest. This avoids the licensed Action
  wrapper and its deprecated Node runtime while keeping the open-source secret
  scanner fail-closed in CI.
- Application images are built and loaded locally, scanned, and assigned an SPDX
  SBOM before any registry tag is pushed. Cosign then creates keyless Sigstore
  attestations for provenance, the SBOM, and a DGTL release policy that binds
  the image target, deployment variant, public origins, and website identities
  to the immutable digest. Deployment verifies the Fulcio identity, Rekor-backed
  signature, exact source repository/commit, trusted image-building workflow,
  and every bound release value before the server pulls an application image.
- Published registry tags include the full source SHA and unique workflow
  run/attempt instead of reusable convenience tags. Tags remain lookup aids,
  never deployment authority; manifests and policy verification use only the
  immutable digest.
- This Sigstore path works with private repositories without GitHub Enterprise
  artifact-attestation licensing. It deliberately uses the public Sigstore
  trust service and transparency log: repository/workflow signing identity and
  immutable digest metadata can be publicly observable. Never put credentials,
  customer data, or other secrets in an image label or attestation predicate.
- Server release manifests are parsed as an allowlisted, data-only `KEY=VALUE`
  format. They are never sourced as shell, duplicate/unknown keys and symlinks
  are rejected, public build origins must equal deployment origins, and image
  names must match the exact GHCR owner/service allowlist. CI tests command
  substitution, path override, origin mismatch, and repository substitution.
- Deployment state, locking, and backup paths are fixed by trusted tooling and
  cannot be redirected by a release manifest. The workflow installs tooling in
  an owner-only commit directory, verifies its checkout-derived content
  inventory on every retry, and binds each manifest to that tooling commit.
  Manifests are copied under the lock and their verified SHA-256 is rechecked
  before Compose, backup, migration, smoke, or state recording uses them.

The dependency policy blocks High/Critical production advisories. DOMPurify is
overridden to 3.4.13 and Sharp to 0.35.4. The remaining reported esbuild
advisory affects a development server that is not started in production; keep
developer servers private and continue monitoring upstream releases.

CI additionally rejects every new Moderate-or-higher production advisory. The
only temporary exceptions are `GHSA-67mh-4wv8-2f99` (the transitive esbuild
development-tool path) and `GHSA-jg8r-5jh2-v2xj` (Payload account unlock, with
the explicit Super-Admin-only override). Both exceptions expire on 2026-10-01;
the gate then fails until the affected dependency is upgraded or a fresh
documented security review deliberately renews the exception.

GitHub Dependency Review adds a pull-request diff gate for public repositories.
GitHub's paid security features are required for that Action in private
repositories, so private GitHub Free/Team repositories retain the mandatory
full production lockfile audit on every CI run instead of silently depending on
an unavailable service.

Before production, provision managed object storage, verify the configured
Resend domain, enforce MFA or enterprise identity controls, add rate limiting at
the CDN/WAF, validate CSP compatibility in staging, connect a secret manager,
run dependency/container scanning, and enable centralized immutable audit
retention.
