type DatabaseEnvironment = {
  NODE_ENV?: string
  PAYLOAD_DB_PUSH?: string
}

export const shouldPushDatabaseSchema = (environment: DatabaseEnvironment = process.env): boolean => {
  // Production schema changes must come from reviewed, committed migrations.
  if (environment.NODE_ENV === 'production') return false
  if (environment.PAYLOAD_DB_PUSH !== undefined) {
    return environment.PAYLOAD_DB_PUSH === 'true'
  }
  return environment.NODE_ENV === 'development'
}
