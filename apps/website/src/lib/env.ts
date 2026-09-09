const required = (name: string): string => {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export const websiteEnv = {
  cmsURL: () => required('CMS_URL'),
  previewSecret: () => required('CMS_PREVIEW_SECRET'),
  readToken: () => required('CMS_READ_TOKEN'),
  revalidationSecret: () => required('CMS_REVALIDATION_SECRET'),
  siteURL: () => process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3101',
  websiteKey: () => required('CMS_WEBSITE_KEY'),
}
