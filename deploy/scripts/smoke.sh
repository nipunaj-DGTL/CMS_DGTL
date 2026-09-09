#!/usr/bin/env bash

set -Eeuo pipefail
source "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)/common.sh"

load_release "${1:-}"
require_command curl

check_json() {
  local url="$1"
  local marker="$2"
  local body
  body="$(curl --fail --silent --show-error --location --connect-timeout 5 --max-time 15 \
    --retry 12 --retry-delay 5 --retry-max-time 120 --retry-all-errors -- "${url}")"
  [[ "${body}" == *"${marker}"* ]] || {
    echo "Unexpected response from ${url}; expected marker ${marker}." >&2
    return 1
  }
}

check_status() {
  curl --fail --silent --show-error --location --connect-timeout 5 --max-time 20 \
    --retry 12 --retry-delay 5 --retry-max-time 120 --retry-all-errors \
    --output /dev/null -- "$1"
}

check_json "${CMS_ORIGIN:?CMS_ORIGIN is required}/api/health" '"status":"healthy"'
check_json "${CLIENT01_ORIGIN:?CLIENT01_ORIGIN is required}/api/health" '"status":"healthy"'
check_json "${CLIENT01_ORIGIN}/api/ready" '"status":"ready"'
check_json "${CLIENT01_ORIGIN}/api/ready" "\"websiteKey\":\"${CLIENT01_WEBSITE_KEY:?CLIENT01_WEBSITE_KEY is required}\""
check_json "${DGTL360_ORIGIN:?DGTL360_ORIGIN is required}/api/health" '"status":"healthy"'
check_json "${DGTL360_ORIGIN}/api/ready" '"status":"ready"'
check_json "${DGTL360_ORIGIN}/api/ready" "\"websiteKey\":\"${DGTL360_WEBSITE_KEY:?DGTL360_WEBSITE_KEY is required}\""
check_status "${CLIENT01_ORIGIN}/"
check_status "${DGTL360_ORIGIN}/"

# A root-only CI/server environment may supply these values for a stronger
# binding check. They are intentionally not stored in the release manifest.
if [[ -n "${SMOKE_WEBSITE_KEY:-}" && -n "${SMOKE_READ_TOKEN:-}" ]]; then
  response="$(curl --fail --silent --show-error --max-time 15 \
    -H "Authorization: Bearer ${SMOKE_READ_TOKEN}" \
    -H "X-DGTL-Website-Key: ${SMOKE_WEBSITE_KEY}" \
    -- "${CMS_ORIGIN}/api/dgtl/public/v1/sites/${SMOKE_WEBSITE_KEY}")"
  [[ "${response}" == *"\"key\":\"${SMOKE_WEBSITE_KEY}\""* ]] || {
    echo "CMS binding response did not identify ${SMOKE_WEBSITE_KEY}." >&2
    exit 1
  }
fi

echo "Read-only release smoke checks passed."
