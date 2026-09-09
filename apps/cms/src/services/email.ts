import { resendAdapter } from '@payloadcms/email-resend'
import type { EmailAdapter } from 'payload'

const required = (name: string): string => {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required when CMS email delivery is enabled.`)
  return value
}

const isEmailAddress = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

/**
 * Payload uses this adapter for verification and password-reset messages. Local
 * development keeps Payload's console adapter unless email is explicitly
 * enabled; production fails at startup if transactional email is not wired.
 */
export const getEmailAdapter = (): EmailAdapter | undefined => {
  const provider = process.env.CMS_EMAIL_PROVIDER?.trim().toLowerCase()
  const requiredInThisEnvironment = process.env.NODE_ENV === 'production'

  if (!provider && !requiredInThisEnvironment) return undefined
  if (provider !== 'resend') {
    throw new Error('CMS_EMAIL_PROVIDER must be set to "resend" in production.')
  }

  const defaultFromAddress = required('CMS_EMAIL_FROM_ADDRESS').toLowerCase()
  if (!isEmailAddress(defaultFromAddress)) {
    throw new Error('CMS_EMAIL_FROM_ADDRESS must be a valid email address.')
  }

  return resendAdapter({
    apiKey: required('RESEND_API_KEY'),
    defaultFromAddress,
    defaultFromName: required('CMS_EMAIL_FROM_NAME'),
  })
}
