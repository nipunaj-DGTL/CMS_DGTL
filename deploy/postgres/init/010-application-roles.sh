#!/usr/bin/env bash

# The Postgres entrypoint sources non-executable `.sh` files. Keep strict shell
# options inside a subshell so they cannot alter the parent entrypoint process.
(
set -Eeuo pipefail

: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${POSTGRES_MIGRATOR_USER:?POSTGRES_MIGRATOR_USER is required}"
: "${POSTGRES_MIGRATOR_PASSWORD:?POSTGRES_MIGRATOR_PASSWORD is required}"
: "${POSTGRES_APP_USER:?POSTGRES_APP_USER is required}"
: "${POSTGRES_APP_PASSWORD:?POSTGRES_APP_PASSWORD is required}"

# The official image invokes this only while initializing an empty data volume.
# psql's quoted variables prevent role names/passwords from becoming SQL syntax.
psql --set=ON_ERROR_STOP=1 \
  --username "${POSTGRES_USER}" \
  --dbname "${POSTGRES_DB}" \
  --set=database_name="${POSTGRES_DB}" \
  --set=migrator_user="${POSTGRES_MIGRATOR_USER}" \
  --set=migrator_password="${POSTGRES_MIGRATOR_PASSWORD}" \
  --set=app_user="${POSTGRES_APP_USER}" \
  --set=app_password="${POSTGRES_APP_PASSWORD}" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'migrator_user', :'migrator_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'migrator_user') \gexec

SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'app_user', :'app_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_user') \gexec

GRANT CONNECT, CREATE ON DATABASE :"database_name" TO :"migrator_user";
GRANT CONNECT ON DATABASE :"database_name" TO :"app_user";
GRANT USAGE, CREATE ON SCHEMA public TO :"migrator_user";
GRANT USAGE ON SCHEMA public TO :"app_user";

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"app_user";
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO :"app_user";
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO :"app_user";

ALTER DEFAULT PRIVILEGES FOR ROLE :"migrator_user" IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"app_user";
ALTER DEFAULT PRIVILEGES FOR ROLE :"migrator_user" IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO :"app_user";
ALTER DEFAULT PRIVILEGES FOR ROLE :"migrator_user" IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO :"app_user";
ALTER DEFAULT PRIVILEGES FOR ROLE :"migrator_user" IN SCHEMA public
  GRANT USAGE ON TYPES TO :"app_user";
SQL
)
