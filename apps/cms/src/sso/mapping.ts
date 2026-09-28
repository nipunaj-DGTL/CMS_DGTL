import { APIError, type CollectionBeforeChangeHook } from 'payload'
import { hasCurrentCompanyRole } from '../access/policy'
import { tokenHash } from './crypto'

export const protectSSOMapping: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const changed = ['ssoIssuer', 'ssoSubject'].some(
    (key) => key in data && (data[key] || null) !== (originalDoc?.[key] || null),
  )
  if (changed && !(await hasCurrentCompanyRole(req, 'company-super-admin'))) {
    throw new APIError('Only a CMS super-admin can link a central identity.', 403)
  }
  const issuer = data.ssoIssuer !== undefined ? data.ssoIssuer : originalDoc?.ssoIssuer
  const subject = data.ssoSubject !== undefined ? data.ssoSubject : originalDoc?.ssoSubject
  if (Boolean(issuer) !== Boolean(subject))
    throw new APIError('Provide both SSO issuer and subject, or clear both.', 400)
  if (issuer && subject) {
    let valid = false
    try {
      const url = new URL(issuer)
      valid =
        url.protocol === 'https:' &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash &&
        url.href.replace(/\/$/, '') === issuer &&
        typeof subject === 'string' &&
        subject.trim() === subject &&
        subject.length <= 200
    } catch {
      /* Invalid input is rejected without echoing it. */
    }
    if (!valid) throw new APIError('Invalid SSO issuer or subject.', 400)
  }
  // Derived server-side even when a caller tries to supply a different uniqueness key.
  data.ssoIdentityKey = issuer && subject ? tokenHash(JSON.stringify([issuer, subject])) : null
  return data
}
