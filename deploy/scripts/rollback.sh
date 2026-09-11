#!/usr/bin/env bash

set -Eeuo pipefail
source "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)/common.sh"

release_input="${1:-${DEPLOY_STATE_DIR}/previous.env}"
require_command docker
require_command mktemp
acquire_deploy_lock

state_dir="${DEPLOY_STATE_DIR}"
expected_release="$(readlink -f -- "${state_dir}/previous.env" 2>/dev/null || true)"
selected_release="$(readlink -f -- "${release_input}" 2>/dev/null || true)"
if [[ -z "${expected_release}" || "${selected_release}" != "${expected_release}" ]]; then
  echo "Rollback accepts only the protected, previously successful ${state_dir}/previous.env manifest." >&2
  exit 2
fi
selected_manifest="$(mktemp "${state_dir}/.rollback-selected.XXXXXX")"
active_manifest=""
rollback_state_manifest=""
cleanup_snapshots() {
  rm -f -- "${selected_manifest}"
  [[ -z "${active_manifest}" ]] || rm -f -- "${active_manifest}"
  [[ -z "${rollback_state_manifest}" ]] || rm -f -- "${rollback_state_manifest}"
}
trap cleanup_snapshots EXIT
copy_release_manifest "${release_input}" "${selected_manifest}"
load_release "${selected_manifest}"
validate_digest_images
validate_tooling_binding
compose_command

if [[ "${CONFIRM_DB_COMPATIBLE:-}" != "YES" ]]; then
  echo "Rollback does not reverse migrations. Set CONFIRM_DB_COMPATIBLE=YES after confirming the selected images accept the current schema." >&2
  exit 2
fi

if [[ ! -f "${state_dir}/current.env" || -L "${state_dir}/current.env" ]]; then
  echo "Rollback requires a protected current release manifest." >&2
  exit 2
fi
active_manifest="$(mktemp "${state_dir}/.rollback-active.XXXXXX")"
copy_release_manifest "${state_dir}/current.env" "${active_manifest}"
(load_release "${active_manifest}"; validate_digest_images)

require_unchanged_active_setting() {
  local key="${1:?release setting is required}"
  local fallback="${2:-}"
  local selected_value="${!key:-${fallback}}"
  local active_value
  active_value="$(release_value "${active_manifest}" "${key}" "${fallback}")"
  if [[ "${selected_value}" != "${active_value}" ]]; then
    echo "Rollback cannot change active infrastructure setting ${key}; use a separate infrastructure runbook." >&2
    exit 1
  fi
}

require_unchanged_active_setting COMPOSE_PROJECT_NAME dgtl-platform
require_unchanged_active_setting SELF_HOSTED_POSTGRES false
require_unchanged_active_setting ENABLE_CADDY false
require_unchanged_active_setting DEPLOYMENT_SCOPE full-stack
require_unchanged_active_setting SECRETS_DIR
require_unchanged_active_setting CMS_ORIGIN
if demos_enabled; then
  require_unchanged_active_setting CLIENT01_ORIGIN
  require_unchanged_active_setting DGTL360_ORIGIN
  require_unchanged_active_setting CLIENT01_WEBSITE_KEY
  require_unchanged_active_setting DGTL360_WEBSITE_KEY
fi
require_unchanged_active_setting IMAGE_BUILD_VARIANT

# The application images roll back, but the live database, object storage, and
# edge/scanner infrastructure do not. Synthesize state from the selected app
# release while preserving every active value for resources rollback leaves in
# place. This also keeps current recovery evidence instead of reviving stale
# references from the older application manifest.
preserved_keys=(
  BACKUP_CONFIRMED
  BACKUP_REFERENCE
  OBJECT_STORAGE_CHECKPOINT_CONFIRMED
  OBJECT_STORAGE_CHECKPOINT_REFERENCE
)
if [[ "${SELF_HOSTED_POSTGRES:-false}" == "true" ]]; then
  preserved_keys+=(POSTGRES_IMAGE CLAMAV_IMAGE)
fi
if [[ "${ENABLE_CADDY:-false}" == "true" ]]; then
  preserved_keys+=(
    CADDY_IMAGE
    ACME_EMAIL
    CMS_HOSTNAME
  )
  if demos_enabled; then
    preserved_keys+=(CLIENT01_HOSTNAME DGTL360_HOSTNAME DGTL360_WWW_HOSTNAME)
  fi
fi
declare -A preserved_values=()
declare -A seen_preserved_keys=()
for preserved_key in "${preserved_keys[@]}"; do
  preserved_values["${preserved_key}"]="$(release_value "${active_manifest}" "${preserved_key}")"
done

rollback_state_manifest="$(mktemp "${state_dir}/.rollback-state.XXXXXX")"
{
  while IFS= read -r raw || [[ -n "${raw}" ]]; do
    line="${raw%$'\r'}"
    key="${line%%=*}"
    replaced=false
    for preserved_key in "${preserved_keys[@]}"; do
      if [[ "${key}" == "${preserved_key}" ]]; then
        printf '%s=%s\n' "${preserved_key}" "${preserved_values[${preserved_key}]}"
        seen_preserved_keys["${preserved_key}"]=true
        replaced=true
        break
      fi
    done
    [[ "${replaced}" == "true" ]] || printf '%s\n' "${line}"
  done <"${selected_manifest}"
  for preserved_key in "${preserved_keys[@]}"; do
    if [[ "${seen_preserved_keys[${preserved_key}]:-false}" != "true" ]]; then
      printf '%s=%s\n' "${preserved_key}" "${preserved_values[${preserved_key}]}"
    fi
  done
} >"${rollback_state_manifest}"
chmod 600 -- "${rollback_state_manifest}"
(load_release "${rollback_state_manifest}"; validate_digest_images; validate_tooling_binding)

"${COMPOSE[@]}" --profile tools --profile edge config --quiet
mapfile -t rollback_services < <(application_services)
"${COMPOSE[@]}" pull "${rollback_services[@]}"
echo "Rolling back application images without recreating PostgreSQL, ClamAV, or the edge proxy."
incumbent_worker_ids="$("${COMPOSE[@]}" ps --all --quiet worker)"
if [[ -n "${incumbent_worker_ids}" ]]; then
  "${COMPOSE[@]}" stop worker
fi
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
wait_for_compose_health
"${SCRIPT_DIR}/smoke.sh" "${RELEASE_FILE}"
wait_for_compose_health

# Record reality only after health and smoke checks pass. The selected manifest
# is snapshotted first because operators commonly pass state/previous.env.
copy_release_manifest "${active_manifest}" "${state_dir}/previous.env.next"
mv "${state_dir}/previous.env.next" "${state_dir}/previous.env"
copy_release_manifest "${rollback_state_manifest}" "${state_dir}/current.env.next"
mv "${state_dir}/current.env.next" "${state_dir}/current.env"
echo "Application rollback passed. No database migration was reversed."
