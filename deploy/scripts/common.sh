#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(CDPATH= cd -- "${SCRIPT_DIR}/.." && pwd)"
readonly BACKUP_DIR="/opt/dgtl/backups"
readonly DEPLOY_LOCK_FILE="/opt/dgtl/state/deploy.lock"
readonly DEPLOY_STATE_DIR="/opt/dgtl/state"

readonly RELEASE_KEYS=(
  ACME_EMAIL
  BACKUP_CONFIRMED
  BACKUP_REFERENCE
  CADDY_IMAGE
  CLIENT01_HOSTNAME
  CLIENT01_IMAGE
  CLIENT01_ORIGIN
  CLIENT01_WEBSITE_KEY
  CLAMAV_IMAGE
  CMS_HOSTNAME
  CMS_MIGRATE_IMAGE
  CMS_ORIGIN
  CMS_WEB_IMAGE
  CMS_WORKER_IMAGE
  COMPOSE_PROJECT_NAME
  DGTL360_HOSTNAME
  DGTL360_IMAGE
  DGTL360_ORIGIN
  DGTL360_WEBSITE_KEY
  DGTL360_WWW_HOSTNAME
  DEPLOYMENT_SCOPE
  ENABLE_CADDY
  HEALTH_TIMEOUT_SECONDS
  IMAGE_BUILD_VARIANT
  IMAGE_CLIENT01_SITE_URL
  IMAGE_CMS_PUBLIC_URL
  IMAGE_DGTL360_SITE_URL
  IMAGE_REPOSITORY_PREFIX
  OBJECT_STORAGE_CHECKPOINT_CONFIRMED
  OBJECT_STORAGE_CHECKPOINT_REFERENCE
  POSTGRES_IMAGE
  SECRETS_DIR
  SELF_HOSTED_POSTGRES
  SOURCE_GIT_SHA
  SOURCE_REPOSITORY
  TOOLING_GIT_SHA
)

release_key_allowed() {
  local candidate="${1:?release key is required}"
  local allowed
  for allowed in "${RELEASE_KEYS[@]}"; do
    [[ "${candidate}" == "${allowed}" ]] && return 0
  done
  return 1
}

load_release() {
  local release_file="${1:?release manifest path is required}"
  if [[ ! -f "${release_file}" || -L "${release_file}" ]]; then
    echo "Release manifest must be a regular, non-symlink file: ${release_file}" >&2
    exit 2
  fi

  local key line raw value
  local -A seen_release_keys=()
  for key in "${RELEASE_KEYS[@]}"; do
    unset "${key}"
  done

  # Parse data-only KEY=VALUE records. Never `source` a deployment manifest:
  # even an operator-controlled file must not become executable shell input.
  while IFS= read -r raw || [[ -n "${raw}" ]]; do
    line="${raw%$'\r'}"
    [[ "${line}" =~ ^[[:space:]]*$ || "${line}" =~ ^[[:space:]]*# ]] && continue
    if [[ ! "${line}" =~ ^([A-Z][A-Z0-9_]*)=(.*)$ ]]; then
      echo "Invalid release manifest line (expected KEY=VALUE): ${line}" >&2
      exit 2
    fi

    key="${BASH_REMATCH[1]}"
    value="${BASH_REMATCH[2]}"
    if ! release_key_allowed "${key}"; then
      echo "Unsupported release manifest key: ${key}" >&2
      exit 2
    fi
    if [[ -n "${seen_release_keys[${key}]:-}" ]]; then
      echo "Duplicate release manifest key: ${key}" >&2
      exit 2
    fi
    if [[ "${value}" == *'$'* || "${value}" == *'`'* || "${value}" == *'"'* || "${value}" == *"'"* ]]; then
      echo "Release manifest values must be unquoted literals without interpolation characters: ${key}" >&2
      exit 2
    fi
    seen_release_keys["${key}"]=1
    printf -v "${key}" '%s' "${value}"
    export "${key}"
  done <"${release_file}"

  RELEASE_FILE="$(cd "$(dirname "${release_file}")" && pwd)/$(basename "${release_file}")"
}

copy_release_manifest() {
  local source="${1:?source release manifest is required}"
  local destination="${2:?destination release manifest is required}"
  if [[ ! -f "${source}" || -L "${source}" ]]; then
    echo "Release manifest must be a regular, non-symlink file: ${source}" >&2
    exit 2
  fi
  if [[ -e "${destination}" || -L "${destination}" ]]; then
    if [[ ! -f "${destination}" || -L "${destination}" || ! -O "${destination}" ]]; then
      echo "Release snapshot destination is not a safe deployment-owned file: ${destination}" >&2
      exit 2
    fi
    rm -f -- "${destination}"
  fi
  (umask 077; cp --no-dereference -- "${source}" "${destination}")
  if [[ ! -f "${destination}" || -L "${destination}" ]]; then
    rm -f -- "${destination}"
    echo "Could not create a safe release manifest snapshot." >&2
    exit 2
  fi
  chmod 600 -- "${destination}"
}

release_value() {
  local release_file="${1:?release manifest path is required}"
  local key="${2:?release key is required}"
  local fallback="${3:-}"
  if ! release_key_allowed "${key}"; then
    echo "Unsupported release manifest key lookup: ${key}" >&2
    return 2
  fi

  (
    load_release "${release_file}"
    printf '%s' "${!key:-${fallback}}"
  )
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Required command is unavailable: $1" >&2
    exit 2
  }
}

prepare_owned_directory() {
  local directory="${1:?directory is required}"
  local description="${2:-directory}"
  if [[ -e "${directory}" && ( ! -d "${directory}" || -L "${directory}" ) ]]; then
    echo "${description} must be a real directory, not a file or symlink: ${directory}" >&2
    exit 2
  fi
  if [[ ! -d "${directory}" ]]; then
    mkdir -m 700 -- "${directory}"
  fi
  if [[ ! -O "${directory}" || ! -w "${directory}" || ! -x "${directory}" ]]; then
    echo "${description} must be owned by and writable only through the deployment account: ${directory}" >&2
    exit 2
  fi
  chmod 700 -- "${directory}"

  local probe
  probe="$(mktemp "${directory}/.write-test.XXXXXX")" || {
    echo "${description} is not safely writable: ${directory}" >&2
    exit 2
  }
  rm -f -- "${probe}"
}

prepare_deploy_control() {
  require_command mktemp
  prepare_owned_directory "${DEPLOY_STATE_DIR}" 'Deployment state directory'
  if [[ -e "${DEPLOY_LOCK_FILE}" &&
        ( ! -f "${DEPLOY_LOCK_FILE}" || -L "${DEPLOY_LOCK_FILE}" || ! -O "${DEPLOY_LOCK_FILE}" ) ]]; then
    echo "Deployment lock must be a regular file owned by the deployment account: ${DEPLOY_LOCK_FILE}" >&2
    exit 2
  fi
  if [[ ! -e "${DEPLOY_LOCK_FILE}" ]]; then
    (umask 077; : >"${DEPLOY_LOCK_FILE}")
  fi
  chmod 600 -- "${DEPLOY_LOCK_FILE}"
}

acquire_deploy_lock() {
  require_command flock
  require_command readlink
  prepare_deploy_control

  # A nested backup inherits the already-locked descriptor from deploy.sh.
  # Verify the descriptor target rather than trusting a caller-controlled flag.
  local expected_lock inherited_lock=''
  expected_lock="$(readlink -f -- "${DEPLOY_LOCK_FILE}")"
  if [[ -e "/proc/$$/fd/9" ]]; then
    inherited_lock="$(readlink -f -- "/proc/$$/fd/9" 2>/dev/null || true)"
  fi
  if [[ "${inherited_lock}" == "${expected_lock}" ]] && flock -n 9; then
    return 0
  fi

  exec 9>"${DEPLOY_LOCK_FILE}"
  flock -n 9 || {
    echo "Another deployment, rollback, or backup is already running." >&2
    exit 1
  }
}

compose_command() {
  COMPOSE=(docker compose --env-file "${RELEASE_FILE}" -f "${DEPLOY_DIR}/compose.prod.yml")
  if demos_enabled; then
    COMPOSE+=(-f "${DEPLOY_DIR}/compose.demos.yml")
  fi
  if [[ "${SELF_HOSTED_POSTGRES:-false}" == "true" ]]; then
    COMPOSE+=(-f "${DEPLOY_DIR}/compose.self-hosted-db.yml")
  fi
}

# Missing scope means the legacy five-image release. Never silently change an
# installed deployment's topology when loading its previous manifest.
demos_enabled() {
  [[ "${DEPLOYMENT_SCOPE:-full-stack}" == "full-stack" ]]
}

application_image_keys() {
  printf '%s\n' CMS_WEB_IMAGE CMS_WORKER_IMAGE CMS_MIGRATE_IMAGE
  if demos_enabled; then printf '%s\n' CLIENT01_IMAGE DGTL360_IMAGE; fi
}

application_services() {
  printf '%s\n' cms worker
  if demos_enabled; then printf '%s\n' client01 dgtl360; fi
}

validate_release_settings() {
  local name value
  if [[ "${DEPLOYMENT_SCOPE:-full-stack}" != "cms-only" && "${DEPLOYMENT_SCOPE:-full-stack}" != "full-stack" ]]; then
    echo 'DEPLOYMENT_SCOPE must be cms-only or full-stack.' >&2
    exit 2
  fi
  local origins=(CMS_ORIGIN) website_keys=() build_origins=(IMAGE_CMS_PUBLIC_URL) hostnames=(CMS_HOSTNAME)
  if demos_enabled; then
    origins+=(CLIENT01_ORIGIN DGTL360_ORIGIN)
    website_keys+=(CLIENT01_WEBSITE_KEY DGTL360_WEBSITE_KEY)
    build_origins+=(IMAGE_CLIENT01_SITE_URL IMAGE_DGTL360_SITE_URL)
    hostnames+=(CLIENT01_HOSTNAME DGTL360_HOSTNAME DGTL360_WWW_HOSTNAME)
  fi
  for name in SELF_HOSTED_POSTGRES ENABLE_CADDY BACKUP_CONFIRMED OBJECT_STORAGE_CHECKPOINT_CONFIRMED; do
    value="${!name:-false}"
    if [[ "${value}" != "true" && "${value}" != "false" ]]; then
      echo "${name} must be exactly true or false." >&2
      exit 2
    fi
  done

  if [[ ! "${COMPOSE_PROJECT_NAME:-dgtl-platform}" =~ ^[a-z0-9][a-z0-9_-]*$ ]]; then
    echo "COMPOSE_PROJECT_NAME contains unsupported characters." >&2
    exit 2
  fi
  if [[ ! "${SECRETS_DIR:-}" =~ ^/[A-Za-z0-9._/-]+$ || "${SECRETS_DIR}" =~ (^|/)\.\.?(/|$) ]]; then
    echo "SECRETS_DIR must be an absolute path without dot segments." >&2
    exit 2
  fi

  for name in "${origins[@]}"; do
    value="${!name:-}"
    if [[ ! "${value}" =~ ^https://[A-Za-z0-9.-]+(:[0-9]{1,5})?$ ]]; then
      echo "${name} must be an HTTPS origin without a path." >&2
      exit 2
    fi
  done

  for name in "${website_keys[@]}"; do
    value="${!name:-}"
    if [[ ! "${value}" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$ ]]; then
      echo "${name} is missing or invalid." >&2
      exit 2
    fi
  done

  if [[ ! "${TOOLING_GIT_SHA:-}" =~ ^[0-9a-f]{40}$ ]]; then
    echo "TOOLING_GIT_SHA must be the exact lowercase Git commit used for deployment tooling." >&2
    exit 2
  fi
  if [[ ! "${SOURCE_GIT_SHA:-}" =~ ^[0-9a-f]{40}$ ]]; then
    echo "SOURCE_GIT_SHA must be the exact lowercase Git commit used to build the application images." >&2
    exit 2
  fi
  if [[ ! "${SOURCE_REPOSITORY:-}" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]]; then
    echo "SOURCE_REPOSITORY must be the GitHub owner/repository that attested the images." >&2
    exit 2
  fi
  if [[ ! "${IMAGE_REPOSITORY_PREFIX:-}" =~ ^ghcr\.io/[a-z0-9][a-z0-9._/-]*[a-z0-9]$ ]]; then
    echo "IMAGE_REPOSITORY_PREFIX must be a lowercase GHCR owner path without a trailing slash." >&2
    exit 2
  fi
  if [[ "${IMAGE_BUILD_VARIANT:-}" != "staging" && "${IMAGE_BUILD_VARIANT:-}" != "production" ]]; then
    echo "IMAGE_BUILD_VARIANT must be staging or production." >&2
    exit 2
  fi

  for name in "${build_origins[@]}"; do
    value="${!name:-}"
    if [[ ! "${value}" =~ ^https://[A-Za-z0-9.-]+(:[0-9]{1,5})?$ ]]; then
      echo "${name} must be an HTTPS origin without a path." >&2
      exit 2
    fi
  done
  if [[ "${IMAGE_CMS_PUBLIC_URL}" != "${CMS_ORIGIN}" ]] ||
     { demos_enabled && [[ "${IMAGE_CLIENT01_SITE_URL}" != "${CLIENT01_ORIGIN}" ||
        "${IMAGE_DGTL360_SITE_URL}" != "${DGTL360_ORIGIN}" ]]; }; then
    echo "Frontend image build origins must exactly match the deployed public origins." >&2
    exit 2
  fi

  if [[ "${BACKUP_CONFIRMED:-false}" == "true" &&
        ! "${BACKUP_REFERENCE:-}" =~ ^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$ ]]; then
    echo "BACKUP_REFERENCE must identify the verified managed-database recovery point." >&2
    exit 2
  fi
  if [[ "${OBJECT_STORAGE_CHECKPOINT_CONFIRMED:-false}" == "true" &&
        ! "${OBJECT_STORAGE_CHECKPOINT_REFERENCE:-}" =~ ^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$ ]]; then
    echo "OBJECT_STORAGE_CHECKPOINT_REFERENCE must identify the verified media recovery point." >&2
    exit 2
  fi

  if [[ "${ENABLE_CADDY:-false}" == "true" ]]; then
    for name in "${hostnames[@]}"; do
      value="${!name:-}"
      if [[ ! "${value}" =~ ^[A-Za-z0-9][A-Za-z0-9.-]*[A-Za-z0-9]$ ]]; then
        echo "${name} is missing or invalid." >&2
        exit 2
      fi
    done
    if [[ ! "${ACME_EMAIL:-}" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]]; then
      echo "ACME_EMAIL is missing or invalid." >&2
      exit 2
    fi
  fi

  if [[ -n "${HEALTH_TIMEOUT_SECONDS:-}" ]]; then
    if [[ ! "${HEALTH_TIMEOUT_SECONDS}" =~ ^[0-9]+$ ]]; then
      echo "HEALTH_TIMEOUT_SECONDS must be an integer from 180 through 900." >&2
      exit 2
    fi
    local timeout_seconds=$((10#${HEALTH_TIMEOUT_SECONDS}))
    if (( timeout_seconds < 180 || timeout_seconds > 900 )); then
      echo "HEALTH_TIMEOUT_SECONDS must be an integer from 180 through 900." >&2
      exit 2
    fi
  fi
}

validate_tooling_binding() {
  local marker="${1:-${DEPLOY_DIR}/.source-sha}"
  if [[ ! -f "${marker}" || -L "${marker}" || ! -O "${marker}" ]]; then
    echo "Deployment tooling source marker is missing or unsafe: ${marker}" >&2
    exit 2
  fi

  local actual_sha
  actual_sha="$(<"${marker}")"
  if [[ ! "${actual_sha}" =~ ^[0-9a-f]{40}$ || "${actual_sha}" != "${TOOLING_GIT_SHA:-}" ]]; then
    echo "Release manifest TOOLING_GIT_SHA does not match the installed deployment tooling." >&2
    exit 2
  fi
}

validate_installed_tooling() {
  local source_sha="${1:?tooling source SHA is required}"
  local tooling_directory="/opt/dgtl/tooling/${source_sha}"
  require_command find
  require_command sha256sum
  if [[ ! "${source_sha}" =~ ^[0-9a-f]{40}$ ||
        ! -d "${tooling_directory}" || -L "${tooling_directory}" || ! -O "${tooling_directory}" ]]; then
    echo "Installed deployment tooling is missing or unsafe for ${source_sha}." >&2
    exit 2
  fi
  if [[ ! -f "${tooling_directory}/scripts/backup.sh" ||
        -L "${tooling_directory}/scripts/backup.sh" ||
        ! -f "${tooling_directory}/.content-sha256" ||
        -L "${tooling_directory}/.content-sha256" ||
        ! -O "${tooling_directory}/.content-sha256" ||
        -n "$(find "${tooling_directory}" -type l -print -quit)" ]]; then
    echo "Installed deployment tooling content is missing or unsafe for ${source_sha}." >&2
    exit 2
  fi
  if ! (TOOLING_GIT_SHA="${source_sha}" validate_tooling_binding "${tooling_directory}/.source-sha"); then
    exit 2
  fi
  if ! (cd "${tooling_directory}" && sha256sum --check --strict .content-sha256 >/dev/null); then
    echo "Installed deployment tooling failed its content checksum for ${source_sha}." >&2
    exit 2
  fi
}

validate_digest_images() {
  local expected_name name repository value
  validate_release_settings
  local image_keys
  mapfile -t image_keys < <(application_image_keys)
  for name in "${image_keys[@]}"; do
    value="${!name:-}"
    if [[ ! "${value}" =~ @sha256:[0-9a-f]{64}$ ]]; then
      echo "${name} must be an immutable image reference ending in @sha256:<64 lowercase hex characters>." >&2
      exit 2
    fi
    case "${name}" in
      CMS_WEB_IMAGE) expected_name='dgtl-cms-web' ;;
      CMS_WORKER_IMAGE) expected_name='dgtl-cms-worker' ;;
      CMS_MIGRATE_IMAGE) expected_name='dgtl-cms-migrate' ;;
      CLIENT01_IMAGE) expected_name='dgtl-client01' ;;
      DGTL360_IMAGE) expected_name='dgtl360' ;;
    esac
    repository="${value%@sha256:*}"
    if [[ "${repository}" != "${IMAGE_REPOSITORY_PREFIX}/${expected_name}" ]]; then
      echo "${name} must use ${IMAGE_REPOSITORY_PREFIX}/${expected_name} with an immutable digest." >&2
      exit 2
    fi
  done
  if [[ "${SELF_HOSTED_POSTGRES:-false}" == "true" ]]; then
    for name in POSTGRES_IMAGE CLAMAV_IMAGE; do
      value="${!name:-}"
      if [[ ! "${value}" =~ @sha256:[0-9a-f]{64}$ ]]; then
        echo "${name} must be an immutable image reference ending in @sha256:<64 lowercase hex characters>." >&2
        exit 2
      fi
      if [[ "${name}" == "POSTGRES_IMAGE" && "${value%@sha256:*}" != "docker.io/library/postgres" ]]; then
        echo "POSTGRES_IMAGE must use docker.io/library/postgres." >&2
        exit 2
      fi
      if [[ "${name}" == "CLAMAV_IMAGE" && "${value%@sha256:*}" != "docker.io/clamav/clamav" ]]; then
        echo "CLAMAV_IMAGE must use docker.io/clamav/clamav." >&2
        exit 2
      fi
    done
  fi
  if [[ "${ENABLE_CADDY:-false}" == "true" ]]; then
    value="${CADDY_IMAGE:-}"
    if [[ ! "${value}" =~ @sha256:[0-9a-f]{64}$ ]]; then
      echo "CADDY_IMAGE must be an immutable image reference ending in @sha256:<64 lowercase hex characters>." >&2
      exit 2
    fi
    if [[ "${value%@sha256:*}" != "docker.io/library/caddy" ]]; then
      echo "CADDY_IMAGE must use docker.io/library/caddy." >&2
      exit 2
    fi
  fi
}

wait_for_service_health() {
  local service="${1:?service is required}"
  local timeout_seconds="${2:-${HEALTH_TIMEOUT_SECONDS:-180}}"
  local deadline=$((SECONDS + timeout_seconds))
  local container status="missing"

  container="$("${COMPOSE[@]}" ps -q "${service}")"
  if [[ -z "${container}" ]]; then
    echo "Service did not create a running container: ${service}" >&2
    return 1
  fi
  while (( SECONDS < deadline )); do
    status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "${container}")"
    [[ "${status}" == "healthy" ]] && return 0
    [[ "${status}" == "unhealthy" || "${status}" == "exited" || "${status}" == "dead" ]] && {
      echo "${service} entered ${status}." >&2
      return 1
    }
    sleep 3
  done
  echo "Timed out waiting for ${service}; last status: ${status}." >&2
  return 1
}

wait_for_compose_health() {
  local service
  local services
  mapfile -t services < <(application_services)
  for service in "${services[@]}"; do
    wait_for_service_health "${service}"
  done
}
