type DatabaseEnvironment = {
  NODE_ENV?: string
  PAYLOAD_DB_PUSH?: string
  PAYLOAD_DROP_DATABASE?: string
}

export const assertSafeDatabaseStartup = (environment: DatabaseEnvironment = process.env): void => {
  if (environment.NODE_ENV === 'production' && environment.PAYLOAD_DROP_DATABASE === 'true') {
    throw new Error('PAYLOAD_DROP_DATABASE must not be enabled in production. Use a separately reviewed recovery procedure.')
  }
}

export const shouldPushDatabaseSchema = (environment: DatabaseEnvironment = process.env): boolean => {
  // Production schema changes must come from reviewed, committed migrations.
  if (environment.NODE_ENV === 'production') return false
  if (environment.PAYLOAD_DB_PUSH !== undefined) {
    return environment.PAYLOAD_DB_PUSH === 'true'
  }
  return environment.NODE_ENV === 'development'
}
