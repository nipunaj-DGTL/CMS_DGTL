#!/usr/bin/env bash

set -Eeuo pipefail
repository_dir="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
source "${repository_dir}/deploy/scripts/common.sh"

test_dir="$(mktemp -d)"
cleanup() {
  if [[ "${test_dir}" == /tmp/* && -d "${test_dir}" ]]; then
    rm -rf -- "${test_dir}"
  fi
}
trap cleanup EXIT

marker="${test_dir}/must-not-exist"
tooling_sha='0123456789abcdef0123456789abcdef01234567'
valid_manifest="${test_dir}/valid.env"
printf '%s\n' \
  '# data-only release manifest' \
  'COMPOSE_PROJECT_NAME=dgtl-security-test' \
  'OBJECT_STORAGE_CHECKPOINT_REFERENCE=backup-2026-09-08' \
  "TOOLING_GIT_SHA=${tooling_sha}" \
  >"${valid_manifest}"

load_release "${valid_manifest}"
[[ "${COMPOSE_PROJECT_NAME}" == 'dgtl-security-test' ]]
[[ "${OBJECT_STORAGE_CHECKPOINT_REFERENCE}" == 'backup-2026-09-08' ]]
[[ ! -e "${marker}" ]]
printf '%s\n' "${tooling_sha}" >"${test_dir}/source-sha"
validate_tooling_binding "${test_dir}/source-sha"
if (TOOLING_GIT_SHA=ffffffffffffffffffffffffffffffffffffffff validate_tooling_binding "${test_dir}/source-sha") 2>/dev/null; then
  echo 'Mismatched deployment tooling and manifest commits must be rejected.' >&2
  exit 1
fi

printf '%s\n' "OBJECT_STORAGE_CHECKPOINT_REFERENCE=\$(touch ${marker})" >"${test_dir}/interpolation.env"
if (load_release "${test_dir}/interpolation.env") 2>/dev/null; then
  echo 'Release manifest interpolation characters must be rejected.' >&2
  exit 1
fi
[[ ! -e "${marker}" ]]

printf '%s\n' 'PATH=/attacker-controlled' >"${test_dir}/unsupported.env"
if (load_release "${test_dir}/unsupported.env") 2>/dev/null; then
  echo 'Unsupported release keys must be rejected.' >&2
  exit 1
fi

printf '%s\n' 'DEPLOY_STATE_DIR=/tmp/attacker-state' >"${test_dir}/candidate-state.env"
if (load_release "${test_dir}/candidate-state.env") 2>/dev/null; then
  echo 'Release manifests must not control host deployment state paths.' >&2
  exit 1
fi

printf '%s\n' 'ENABLE_CADDY=true' 'ENABLE_CADDY=false' >"${test_dir}/duplicate.env"
if (load_release "${test_dir}/duplicate.env") 2>/dev/null; then
  echo 'Duplicate release keys must be rejected.' >&2
  exit 1
fi

ln -s "${valid_manifest}" "${test_dir}/symlink.env"
if [[ -L "${test_dir}/symlink.env" ]]; then
  if (load_release "${test_dir}/symlink.env") 2>/dev/null; then
    echo 'Symlinked release manifests must be rejected.' >&2
    exit 1
  fi
else
  echo 'NOTICE: this filesystem cannot create symlinks; CI validates that case on Linux.'
fi

load_release "${repository_dir}/deploy/release.env.example"
validate_release_settings
[[ "${DEPLOYMENT_SCOPE}" == cms-only ]]
[[ "$(application_services | paste -sd, -)" == 'cms,worker' ]]
[[ "$(application_image_keys | wc -l | tr -d ' ')" == 3 ]]
compose_command
[[ "${COMPOSE[*]}" != *compose.demos.yml* ]]
if (DEPLOYMENT_SCOPE=typo validate_release_settings) 2>/dev/null; then
  echo 'Invalid deployment scopes must be rejected.' >&2
  exit 1
fi
if (DEPLOYMENT_SCOPE=full-stack validate_release_settings) 2>/dev/null; then
  echo 'Full-stack deployment must require its frontend identities and origins.' >&2
  exit 1
fi
(
  DEPLOYMENT_SCOPE=full-stack
  CLIENT01_ORIGIN=https://client01.dgtl.lk
  DGTL360_ORIGIN=https://dgtl.lk
  IMAGE_CLIENT01_SITE_URL="$CLIENT01_ORIGIN"
  IMAGE_DGTL360_SITE_URL="$DGTL360_ORIGIN"
  CLIENT01_WEBSITE_KEY=client-01-main
  DGTL360_WEBSITE_KEY=client-02-main
  CLIENT01_HOSTNAME=client01.dgtl.lk
  DGTL360_HOSTNAME=dgtl.lk
  DGTL360_WWW_HOSTNAME=www.dgtl.lk
  validate_release_settings
  [[ "$(application_image_keys | wc -l | tr -d ' ')" == 5 ]]
  compose_command
  [[ "${COMPOSE[*]}" == *compose.demos.yml* ]]
  unset DEPLOYMENT_SCOPE
  demos_enabled
  validate_release_settings
)
if (HEALTH_TIMEOUT_SECONDS=179 validate_release_settings) 2>/dev/null; then
  echo 'Deployment health timeout must cover the worker cold-start proof window.' >&2
  exit 1
fi
(HEALTH_TIMEOUT_SECONDS=180 validate_release_settings)
if (CMS_ORIGIN=http://cms.example.test validate_release_settings) 2>/dev/null; then
  echo 'Non-HTTPS public origins must be rejected.' >&2
  exit 1
fi
if (SECRETS_DIR=../secrets validate_release_settings) 2>/dev/null; then
  echo 'Relative secret directories must be rejected.' >&2
  exit 1
fi
if (ENABLE_CADDY=yes validate_release_settings) 2>/dev/null; then
  echo 'Ambiguous boolean values must be rejected.' >&2
  exit 1
fi
if (IMAGE_CMS_PUBLIC_URL=https://different.example.test validate_release_settings) 2>/dev/null; then
  echo 'Image-build origins must exactly match deployed public origins.' >&2
  exit 1
fi
if (BACKUP_CONFIRMED=true BACKUP_REFERENCE= validate_release_settings) 2>/dev/null; then
  echo 'A confirmed managed backup must include a traceable recovery reference.' >&2
  exit 1
fi
if (OBJECT_STORAGE_CHECKPOINT_CONFIRMED=true OBJECT_STORAGE_CHECKPOINT_REFERENCE='unsafe reference' validate_release_settings) 2>/dev/null; then
  echo 'Recovery references must use the bounded data-only identifier format.' >&2
  exit 1
fi

dummy_digest='sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
(
  CMS_WEB_IMAGE="ghcr.io/your-org/dgtl-cms-web@${dummy_digest}"
  CMS_WORKER_IMAGE="ghcr.io/your-org/dgtl-cms-worker@${dummy_digest}"
  CMS_MIGRATE_IMAGE="ghcr.io/your-org/dgtl-cms-migrate@${dummy_digest}"
  CLIENT01_IMAGE="ghcr.io/your-org/dgtl-client01@${dummy_digest}"
  DGTL360_IMAGE="ghcr.io/your-org/dgtl360@${dummy_digest}"
  POSTGRES_IMAGE="docker.io/library/postgres@${dummy_digest}"
  CLAMAV_IMAGE="docker.io/clamav/clamav@${dummy_digest}"
  CADDY_IMAGE="docker.io/library/caddy@${dummy_digest}"
  validate_digest_images
)
if (
  CMS_WEB_IMAGE="ghcr.io/attacker/dgtl-cms-web@${dummy_digest}"
  CMS_WORKER_IMAGE="ghcr.io/your-org/dgtl-cms-worker@${dummy_digest}"
  CMS_MIGRATE_IMAGE="ghcr.io/your-org/dgtl-cms-migrate@${dummy_digest}"
  CLIENT01_IMAGE="ghcr.io/your-org/dgtl-client01@${dummy_digest}"
  DGTL360_IMAGE="ghcr.io/your-org/dgtl360@${dummy_digest}"
  POSTGRES_IMAGE="docker.io/library/postgres@${dummy_digest}"
  CLAMAV_IMAGE="docker.io/clamav/clamav@${dummy_digest}"
  CADDY_IMAGE="docker.io/library/caddy@${dummy_digest}"
  validate_digest_images
) 2>/dev/null; then
  echo 'Application images from a substituted registry repository must be rejected.' >&2
  exit 1
fi

worker_compose_block="$(
  awk '
    /^  worker:$/ { capture = 1 }
    capture && /^  [A-Za-z0-9_-]+:$/ && $0 != "  worker:" { exit }
    capture { print }
  ' "${repository_dir}/deploy/compose.prod.yml"
)"
grep -Fq "http://127.0.0.1:3001/health" <<<"${worker_compose_block}" || {
  echo 'Worker Compose health must probe the progress-aware worker endpoint.' >&2
  exit 1
}
grep -Eq '^[[:space:]]+start_period:[[:space:]]+150s$' <<<"${worker_compose_block}" || {
  echo 'Worker Compose health must retain its 150-second cold-cycle start period.' >&2
  exit 1
}

deploy_script="${repository_dir}/deploy/scripts/deploy.sh"
application_pull_line="$(grep -nF -- '--profile tools pull "${rollout_services[@]}" migrate' "${deploy_script}" | cut -d: -f1)"
infrastructure_pull_line="$(grep -nF -- 'pull postgres clamav' "${deploy_script}" | cut -d: -f1)"
edge_pull_line="$(grep -nF -- '--profile edge pull caddy' "${deploy_script}" | cut -d: -f1)"
backup_boundary_line="$(grep -nF -- 'BACKUP_KEEP_SERVICES_QUIESCED=true' "${deploy_script}" | head -n 1 | cut -d: -f1)"
if [[ -z "${application_pull_line}" || -z "${infrastructure_pull_line}" ||
      -z "${edge_pull_line}" || -z "${backup_boundary_line}" ||
      "${application_pull_line}" -ge "${backup_boundary_line}" ||
      "${infrastructure_pull_line}" -ge "${backup_boundary_line}" ||
      "${edge_pull_line}" -ge "${backup_boundary_line}" ]]; then
  echo 'All candidate images must be pulled before backup quiesces incumbent writers.' >&2
  exit 1
fi

migration_line="$(grep -nF -- '--profile tools run --rm --no-deps migrate' "${deploy_script}" | cut -d: -f1)"
fail_closed_line="$(grep -nF -- 'restore_incumbent_on_failure=false' "${deploy_script}" | tail -n 1 | cut -d: -f1)"
if [[ -z "${migration_line}" || -z "${fail_closed_line}" ||
      "${fail_closed_line}" -ge "${migration_line}" ]]; then
  echo 'Automatic incumbent restart must be disabled before migration can partially apply.' >&2
  exit 1
fi

rollback_script="${repository_dir}/deploy/scripts/rollback.sh"
grep -Fq 'preserved_keys+=(POSTGRES_IMAGE CLAMAV_IMAGE)' "${rollback_script}" || {
  echo 'Rollback state must preserve the active database and scanner image pins.' >&2
  exit 1
}
grep -Fq 'CADDY_IMAGE' "${rollback_script}" || {
  echo 'Rollback state must preserve active edge configuration.' >&2
  exit 1
}
if grep -Eq 'require_unchanged_active_setting (CADDY_IMAGE|CLAMAV_IMAGE)' "${rollback_script}"; then
  echo 'An application rollback must not reject infrastructure already left running.' >&2
  exit 1
fi

echo 'Release manifest parser security checks passed.'
