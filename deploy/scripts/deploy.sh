#!/usr/bin/env bash

set -Eeuo pipefail
source "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)/common.sh"

release_input="${1:?release manifest path is required}"
expected_release_sha256="${2:?verified release manifest SHA-256 is required}"
require_command docker
require_command mktemp
require_command sha256sum
if [[ ! "${expected_release_sha256}" =~ ^[0-9a-f]{64}$ ]]; then
  echo 'Expected release manifest SHA-256 must be 64 lowercase hexadecimal characters.' >&2
  exit 2
fi
acquire_deploy_lock

state_dir="${DEPLOY_STATE_DIR}"
candidate_manifest="$(mktemp "${state_dir}/.candidate.XXXXXX")"
incumbent_cms_was_running=false
incumbent_worker_was_running=false
restore_incumbent_on_failure=false
cleanup_candidate() {
  local status=$?
  trap - EXIT
  if [[ "${status}" -ne 0 && "${restore_incumbent_on_failure}" == "true" ]]; then
    if [[ "${incumbent_cms_was_running}" == "true" ]] && ! "${COMPOSE[@]}" start cms >/dev/null; then
      echo 'ERROR: failed to restore the incumbent CMS after deployment failure.' >&2
    fi
    if [[ "${incumbent_worker_was_running}" == "true" ]] && ! "${COMPOSE[@]}" start worker >/dev/null; then
      echo 'ERROR: failed to restore the incumbent worker after deployment failure.' >&2
    fi
  fi
  rm -f -- "${candidate_manifest}"
  exit "${status}"
}
trap cleanup_candidate EXIT
copy_release_manifest "${release_input}" "${candidate_manifest}"
snapshot_checksum="$(sha256sum -- "${candidate_manifest}")"
snapshot_checksum="${snapshot_checksum%% *}"
if [[ "${snapshot_checksum}" != "${expected_release_sha256}" ]]; then
  echo 'Release manifest changed after attestation verification; deployment is blocked.' >&2
  exit 1
fi
load_release "${candidate_manifest}"
validate_digest_images
validate_tooling_binding
compose_command

if [[ "${OBJECT_STORAGE_CHECKPOINT_CONFIRMED:-false}" != "true" || -z "${OBJECT_STORAGE_CHECKPOINT_REFERENCE:-}" ]]; then
  echo "Confirm object-storage versioning/recovery and set OBJECT_STORAGE_CHECKPOINT_CONFIRMED=true plus OBJECT_STORAGE_CHECKPOINT_REFERENCE." >&2
  exit 1
fi

echo "Validating the fully rendered Compose model and protected env files."
"${COMPOSE[@]}" --profile tools --profile edge config --quiet

if [[ -f "${state_dir}/current.env" ]]; then
  current_project_name="$(release_value "${state_dir}/current.env" COMPOSE_PROJECT_NAME dgtl-platform)"
  current_self_hosted="$(release_value "${state_dir}/current.env" SELF_HOSTED_POSTGRES false)"
  current_edge="$(release_value "${state_dir}/current.env" ENABLE_CADDY false)"
  current_scope="$(release_value "${state_dir}/current.env" DEPLOYMENT_SCOPE full-stack)"
  if [[ "${current_project_name}" != "${COMPOSE_PROJECT_NAME:-dgtl-platform}" ||
        "${current_self_hosted}" != "${SELF_HOSTED_POSTGRES:-false}" ||
        "${current_edge}" != "${ENABLE_CADDY:-false}" ||
        "${current_scope}" != "${DEPLOYMENT_SCOPE:-full-stack}" ]]; then
    echo "COMPOSE_PROJECT_NAME, SELF_HOSTED_POSTGRES, ENABLE_CADDY, and DEPLOYMENT_SCOPE are topology settings; change them only through a separate infrastructure runbook." >&2
    exit 1
  fi
  if [[ "${SELF_HOSTED_POSTGRES:-false}" == "true" ]]; then
    current_postgres_image="$(release_value "${state_dir}/current.env" POSTGRES_IMAGE)"
    if [[ "${current_postgres_image}" != "${POSTGRES_IMAGE}" ]]; then
      echo "POSTGRES_IMAGE changes require a separate, tested database-upgrade runbook; ordinary application deployment is blocked." >&2
      exit 1
    fi
  fi
fi

# Pull every image that this rollout may start before quiescing incumbent
# writers. A registry outage or missing optional image must fail while the
# currently healthy application is still available.
echo "Pulling immutable release images before the maintenance boundary."
mapfile -t rollout_services < <(application_services)
"${COMPOSE[@]}" --profile tools pull "${rollout_services[@]}" migrate
if [[ "${SELF_HOSTED_POSTGRES:-false}" == "true" ]]; then
  "${COMPOSE[@]}" pull postgres clamav
fi
if [[ "${ENABLE_CADDY:-false}" == "true" ]]; then
  "${COMPOSE[@]}" --profile edge pull caddy
fi

echo "Checking runtime and migrator configuration without contacting providers or stopping the current release."
"${COMPOSE[@]}" run --rm --no-deps --entrypoint node worker \
  scripts/production-preflight.mjs --role runtime --expected-origin "${CMS_ORIGIN}"
"${COMPOSE[@]}" --profile tools run --rm --no-deps --entrypoint node migrate \
  scripts/production-preflight.mjs --role migration --expected-origin "${CMS_ORIGIN}"

incumbent_cms_running_ids="$("${COMPOSE[@]}" ps --status running --quiet cms)"
incumbent_worker_running_ids="$("${COMPOSE[@]}" ps --status running --quiet worker)"
[[ -z "${incumbent_cms_running_ids}" ]] || incumbent_cms_was_running=true
[[ -z "${incumbent_worker_running_ids}" ]] || incumbent_worker_was_running=true

if [[ "${SELF_HOSTED_POSTGRES:-false}" == "true" ]]; then
  if [[ -f "${state_dir}/current.env" ]]; then
    current_tooling_sha="$(release_value "${state_dir}/current.env" TOOLING_GIT_SHA)"
    validate_installed_tooling "${current_tooling_sha}"
    BACKUP_OBJECT_STORAGE_CHECKPOINT_REFERENCE="${OBJECT_STORAGE_CHECKPOINT_REFERENCE}" \
      BACKUP_KEEP_SERVICES_QUIESCED=true \
      "/opt/dgtl/tooling/${current_tooling_sha}/scripts/backup.sh" "${state_dir}/current.env"
  else
    # A first install records an empty, restorable pre-migration baseline.
    BACKUP_KEEP_SERVICES_QUIESCED=true "${SCRIPT_DIR}/backup.sh" "${RELEASE_FILE}"
  fi
  restore_incumbent_on_failure=true

  "${COMPOSE[@]}" up -d --no-deps clamav
  wait_for_service_health clamav 420
elif [[ "${BACKUP_CONFIRMED:-false}" != "true" || -z "${BACKUP_REFERENCE:-}" ]]; then
  echo "Set BACKUP_CONFIRMED=true and BACKUP_REFERENCE only after verifying the managed database recovery point." >&2
  exit 1
else
  restore_incumbent_on_failure=true
fi

# Keep all database-writing application processes stopped from the verified
# backup/PITR point through migration. The backup already did this for the
# self-hosted profile; the repeated stop is deliberate and fail-closed.
incumbent_worker_ids="$("${COMPOSE[@]}" ps --all --quiet worker)"
incumbent_cms_ids="$("${COMPOSE[@]}" ps --all --quiet cms)"
if [[ -n "${incumbent_worker_ids}" ]]; then
  "${COMPOSE[@]}" stop worker
fi
if [[ -n "${incumbent_cms_ids}" ]]; then
  "${COMPOSE[@]}" stop cms
fi
active_cms_ids="$("${COMPOSE[@]}" ps --status running --quiet cms)"
restarting_cms_ids="$("${COMPOSE[@]}" ps --status restarting --quiet cms)"
active_worker_ids="$("${COMPOSE[@]}" ps --status running --quiet worker)"
restarting_worker_ids="$("${COMPOSE[@]}" ps --status restarting --quiet worker)"
if [[ -n "${active_cms_ids}" || -n "${restarting_cms_ids}" ||
      -n "${active_worker_ids}" || -n "${restarting_worker_ids}" ]]; then
  echo 'CMS or worker remained active; migration is blocked.' >&2
  exit 1
fi

echo "Applying reviewed migrations once with schema push disabled."
# A migration command can fail after applying part of a reviewed migration set.
# From this boundary onward, never restart old writers automatically; operators
# must assess schema compatibility and choose the recorded rollback or a forward
# fix explicitly.
restore_incumbent_on_failure=false
"${COMPOSE[@]}" --profile tools run --rm --no-deps migrate

echo "Rolling out CMS, optional demo frontends, then exactly one worker."
"${COMPOSE[@]}" up -d --no-deps cms
wait_for_service_health cms
if demos_enabled; then
  "${COMPOSE[@]}" up -d --no-deps client01 dgtl360
  wait_for_service_health client01
  wait_for_service_health dgtl360
fi
incumbent_worker_ids="$("${COMPOSE[@]}" ps --all --quiet worker)"
if [[ -n "${incumbent_worker_ids}" ]]; then
  "${COMPOSE[@]}" stop worker
fi
"${COMPOSE[@]}" up -d --no-deps --scale worker=1 worker
if [[ "${ENABLE_CADDY:-false}" == "true" ]]; then
  "${COMPOSE[@]}" --profile edge up -d --no-deps caddy
fi

wait_for_compose_health
"${SCRIPT_DIR}/smoke.sh" "${RELEASE_FILE}"
# Recheck after external smoke retries so a worker that exited shortly after
# start cannot be recorded as a successful release.
wait_for_compose_health

if [[ -f "${state_dir}/current.env" ]]; then
  copy_release_manifest "${state_dir}/current.env" "${state_dir}/previous.env.next"
  mv "${state_dir}/previous.env.next" "${state_dir}/previous.env"
fi
copy_release_manifest "${candidate_manifest}" "${state_dir}/current.env.next"
mv "${state_dir}/current.env.next" "${state_dir}/current.env"

echo "Deployment passed. Active release manifest: ${release_input}"
