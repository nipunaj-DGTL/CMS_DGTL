#!/usr/bin/env bash

set -Eeuo pipefail
umask 077
source "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)/common.sh"

release_input="${1:?release manifest path is required}"
checkpoint_reference_override="${BACKUP_OBJECT_STORAGE_CHECKPOINT_REFERENCE:-}"
keep_services_quiesced="${BACKUP_KEEP_SERVICES_QUIESCED:-false}"
if [[ "${keep_services_quiesced}" != "true" && "${keep_services_quiesced}" != "false" ]]; then
  echo 'BACKUP_KEEP_SERVICES_QUIESCED must be exactly true or false.' >&2
  exit 2
fi
require_command docker
require_command sha256sum

# Deploy invokes this script with its locked descriptor inherited. Standalone
# backups acquire the same fixed host lock themselves.
acquire_deploy_lock

release_snapshot="$(mktemp "${DEPLOY_STATE_DIR}/.backup-release.XXXXXX")"
cms_was_running=false
worker_was_running=false
services_quiesced=false
cleanup_backup() {
  local status=$?
  trap - EXIT
  if [[ "${services_quiesced}" == "true" &&
        ( "${status}" -ne 0 || "${keep_services_quiesced}" != "true" ) ]]; then
    # Resume only services that were running before this backup. Failures are
    # surfaced but do not hide the original backup result.
    if [[ "${cms_was_running}" == "true" ]]; then
      if ! "${COMPOSE[@]}" start cms >/dev/null; then
        echo 'ERROR: failed to resume CMS after backup.' >&2
        [[ "${status}" -ne 0 ]] || status=1
      fi
    fi
    if [[ "${worker_was_running}" == "true" ]]; then
      if ! "${COMPOSE[@]}" start worker >/dev/null; then
        echo 'ERROR: failed to resume worker after backup.' >&2
        [[ "${status}" -ne 0 ]] || status=1
      fi
    fi
  fi
  rm -f -- "${release_snapshot}"
  exit "${status}"
}
trap cleanup_backup EXIT
copy_release_manifest "${release_input}" "${release_snapshot}"
load_release "${release_snapshot}"
if [[ -n "${checkpoint_reference_override}" ]]; then
  OBJECT_STORAGE_CHECKPOINT_CONFIRMED=true
  OBJECT_STORAGE_CHECKPOINT_REFERENCE="${checkpoint_reference_override}"
fi
validate_digest_images
validate_tooling_binding
compose_command

if [[ "${OBJECT_STORAGE_CHECKPOINT_CONFIRMED:-false}" != "true" || -z "${OBJECT_STORAGE_CHECKPOINT_REFERENCE:-}" ]]; then
  echo "A confirmed, traceable object-storage recovery checkpoint is required before backup." >&2
  exit 2
fi

if [[ "${SELF_HOSTED_POSTGRES:-false}" != "true" ]]; then
  echo "This baseline script backs up the self-hosted Postgres profile only. Use the managed provider's PITR/snapshot workflow." >&2
  exit 2
fi

backup_root="${BACKUP_DIR}"
prepare_owned_directory "${backup_root}" 'Backup directory'
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
destination="${backup_root}/${timestamp}"
mkdir "${destination}"

cms_running_ids="$("${COMPOSE[@]}" ps --status running --quiet cms)"
worker_running_ids="$("${COMPOSE[@]}" ps --status running --quiet worker)"
cms_existing_ids="$("${COMPOSE[@]}" ps --all --quiet cms)"
worker_existing_ids="$("${COMPOSE[@]}" ps --all --quiet worker)"
[[ -z "${cms_running_ids}" ]] || cms_was_running=true
[[ -z "${worker_running_ids}" ]] || worker_was_running=true

# Quiesce application writes while PostgreSQL creates a consistent snapshot.
# Production media is in versioned object storage and is referenced by the
# separately verified checkpoint recorded in the release manifest.
services_quiesced=true
if [[ -n "${worker_existing_ids}" ]]; then
  "${COMPOSE[@]}" stop worker
fi
if [[ -n "${cms_existing_ids}" ]]; then
  "${COMPOSE[@]}" stop cms
fi

cms_running_after="$("${COMPOSE[@]}" ps --status running --quiet cms)"
cms_restarting_after="$("${COMPOSE[@]}" ps --status restarting --quiet cms)"
worker_running_after="$("${COMPOSE[@]}" ps --status running --quiet worker)"
worker_restarting_after="$("${COMPOSE[@]}" ps --status restarting --quiet worker)"
if [[ -n "${cms_running_after}" || -n "${cms_restarting_after}" ||
      -n "${worker_running_after}" || -n "${worker_restarting_after}" ]]; then
  echo 'CMS or worker remained active; refusing to create a potentially inconsistent backup.' >&2
  exit 1
fi

# This script may run against the last successful manifest before a candidate
# rollout. Only start or reconcile PostgreSQL after all application writers are
# proven stopped, then wait for database readiness before the dump.
"${COMPOSE[@]}" up -d postgres
wait_for_service_health postgres 180

"${COMPOSE[@]}" exec -T postgres sh -ec \
  'pg_dump --format=custom --no-owner --no-privileges --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"' \
  >"${destination}/postgres.dump"

copy_release_manifest "${RELEASE_FILE}" "${destination}/release.env"
printf '%s\n' "${OBJECT_STORAGE_CHECKPOINT_REFERENCE:?object-storage checkpoint reference is required}" \
  >"${destination}/object-storage-checkpoint.txt"
(
  cd "${destination}"
  sha256sum postgres.dump object-storage-checkpoint.txt release.env >SHA256SUMS
)

echo "Database backup and object-storage checkpoint record created at ${destination}. Copy them to encrypted off-site storage and rehearse an isolated restore."
