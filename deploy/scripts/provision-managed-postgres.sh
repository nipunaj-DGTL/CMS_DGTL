#!/usr/bin/env bash

set -Eeuo pipefail

required() {
  local name="$1"
  [[ -n "${!name:-}" ]] || {
    echo "${name} is required." >&2
    exit 1
  }
}

required CMS_DATABASE_ADMIN_URL
required CMS_DATABASE_NAME
required CMS_DATABASE_RUNTIME_PASSWORD
required CMS_DATABASE_MIGRATOR_PASSWORD

command -v psql >/dev/null 2>&1 || {
  echo "psql is required." >&2
  exit 1
}

runtime_role="${CMS_DATABASE_RUNTIME_ROLE:-dgtl_app}"
migrator_role="${CMS_DATABASE_MIGRATOR_ROLE:-dgtl_migrator}"

[[ "${runtime_role}" =~ ^[a-z_][a-z0-9_]*$ ]] || {
  echo "CMS_DATABASE_RUNTIME_ROLE is invalid." >&2
  exit 1
}
[[ "${migrator_role}" =~ ^[a-z_][a-z0-9_]*$ ]] || {
  echo "CMS_DATABASE_MIGRATOR_ROLE is invalid." >&2
  exit 1
}

export CMS_DATABASE_RUNTIME_ROLE="${runtime_role}"
export CMS_DATABASE_MIGRATOR_ROLE="${migrator_role}"

# psql's \getenv imports the two new role passwords without echoing their
# values; PostgreSQL format(%L) quotes password literals and format(%I) quotes
# identifiers. Run this only from the protected operator host: the temporary
# administrative URL is passed to psql as its connection argument.
psql --dbname="${CMS_DATABASE_ADMIN_URL}" \
  --no-psqlrc \
  --set ON_ERROR_STOP=1 <<'SQL'
\getenv database_name CMS_DATABASE_NAME
\getenv runtime_password CMS_DATABASE_RUNTIME_PASSWORD
\getenv runtime_role CMS_DATABASE_RUNTIME_ROLE
\getenv migrator_password CMS_DATABASE_MIGRATOR_PASSWORD
\getenv migrator_role CMS_DATABASE_MIGRATOR_ROLE

SELECT format('CREATE ROLE %I LOGIN', :'runtime_role')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'runtime_role') \gexec
SELECT format('CREATE ROLE %I LOGIN', :'migrator_role')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'migrator_role') \gexec

SELECT format(
  'ALTER ROLE %I WITH LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION',
  :'runtime_role',
  :'runtime_password'
) \gexec
SELECT format(
  'ALTER ROLE %I WITH LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION',
  :'migrator_role',
  :'migrator_password'
) \gexec

SELECT format('GRANT CONNECT ON DATABASE %I TO %I', :'database_name', :'runtime_role') \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', :'database_name', :'migrator_role') \gexec
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
SELECT format('GRANT USAGE ON SCHEMA public TO %I', :'runtime_role') \gexec
SELECT format('GRANT USAGE, CREATE ON SCHEMA public TO %I', :'migrator_role') \gexec

-- The DigitalOcean administrative user creates these roles and needs temporary
-- membership to manage the migrator's default privileges. This does not grant
-- either application role administrative capabilities.
SELECT format('GRANT %I TO %I WITH ADMIN OPTION', :'migrator_role', current_user) \gexec
SELECT format(
  'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I',
  :'migrator_role',
  :'runtime_role'
) \gexec
SELECT format(
  'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO %I',
  :'migrator_role',
  :'runtime_role'
) \gexec

-- Idempotently cover objects created by a migration before this script is
-- rerun. No schema ownership or DDL capability is granted to the runtime role.
SELECT format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO %I', :'runtime_role') \gexec
SELECT format('GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO %I', :'runtime_role') \gexec
SQL

echo "Managed PostgreSQL runtime and migrator roles are provisioned."
