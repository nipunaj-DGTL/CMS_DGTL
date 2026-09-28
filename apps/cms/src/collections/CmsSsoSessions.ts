import type { CollectionConfig } from 'payload'

export const CmsSsoSessions: CollectionConfig = {
  slug: 'cms-sso-sessions',
  admin: { hidden: true },
  access: { create: () => false, read: () => false, update: () => false, delete: () => false },
  lockDocuments: false,
  fields: [
    { name: 'keyHash', type: 'text', required: true, unique: true, index: true },
    { name: 'user', type: 'relationship', relationTo: 'cms-users', required: true, index: true },
    { name: 'issuer', type: 'text', required: true },
    { name: 'subject', type: 'text', required: true },
    { name: 'encryptedAccessToken', type: 'text', required: true, hidden: true },
    { name: 'expiresAt', type: 'date', required: true, index: true },
  ],
}
