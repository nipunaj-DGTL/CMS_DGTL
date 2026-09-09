export const normalizeSlug = (input: string): string => {
  const segments = input
    .trim()
    .replace(/^https?:\/\/[^/]+/i, '')
    .split('/')
    .map((segment) =>
      segment
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, ''),
    )
    .filter(Boolean)

  return segments.join('/') || 'home'
}

export const isSafeExternalURL = (value: string): boolean => {
  if (/^\/(?!\/)[^\s\\]*$/.test(value)) return true
  if (/^(mailto|tel):[^\s]+$/i.test(value)) return true
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}
