#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
helper="$repo_root/scripts/verify-ghcr-tags-absent.sh"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

cat > "$tmp/docker" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
[[ "$#" -eq 4 && "$1" == "buildx" && "$2" == "imagetools" && "$3" == "inspect" ]] || {
  echo "unexpected docker invocation: $*" >&2
  exit 90
}
reference="$4"
printf '%s\n' "$reference" >> "${MOCK_DOCKER_LOG:?}"
case "${MOCK_MODE:-absent}" in
  absent)
    echo "ERROR: unexpected status from HEAD request: 404 Not Found" >&2
    exit 1
    ;;
  existing)
    echo "Name: $reference"
    exit 0
    ;;
  forbidden)
    echo "ERROR: unexpected status from HEAD request: 403 Forbidden" >&2
    exit 1
    ;;
  unauthorized)
    echo "ERROR: unexpected status from HEAD request: 401 Unauthorized" >&2
    exit 1
    ;;
  repository_not_found)
    echo "ERROR: repository not found" >&2
    exit 1
    ;;
  missing_manifest)
    echo "ERROR: no such manifest: $reference" >&2
    exit 1
    ;;
  *)
    echo "unknown mock mode" >&2
    exit 91
    ;;
esac
MOCK
chmod +x "$tmp/docker"

export PATH="$tmp:$PATH"
export MOCK_DOCKER_LOG="$tmp/docker.log"
image="ghcr.io/phanthienquoc/auth-service/auth"
sha="0123456789abcdef0123456789abcdef01234567"
tag="prod-v1.0.0-$sha"

: > "$MOCK_DOCKER_LOG"
MOCK_MODE=absent bash "$helper" "$image" "$sha" "$tag" > "$tmp/absent.log"
[[ "$(wc -l < "$MOCK_DOCKER_LOG")" -eq 2 ]]
grep -Fq "Both immutable Auth GHCR tags are absent" "$tmp/absent.log"

: > "$MOCK_DOCKER_LOG"
MOCK_MODE=missing_manifest bash "$helper" "$image" "$sha" "$tag" > "$tmp/missing-manifest.log"
[[ "$(wc -l < "$MOCK_DOCKER_LOG")" -eq 2 ]]
grep -Fq "Both immutable Auth GHCR tags are absent" "$tmp/missing-manifest.log"

: > "$MOCK_DOCKER_LOG"
if MOCK_MODE=existing bash "$helper" "$image" "$sha" "$tag" > "$tmp/existing.log" 2>&1; then
  echo "Existing immutable Auth tag was incorrectly accepted." >&2
  exit 1
fi
grep -Fq "Immutable Auth release tag already exists" "$tmp/existing.log"
[[ "$(wc -l < "$MOCK_DOCKER_LOG")" -eq 1 ]]

for mode in forbidden unauthorized repository_not_found; do
  : > "$MOCK_DOCKER_LOG"
  if MOCK_MODE="$mode" bash "$helper" "$image" "$sha" "$tag" > "$tmp/$mode.log" 2>&1; then
    echo "$mode was incorrectly treated as an absent Auth tag." >&2
    exit 1
  fi
  grep -Fq "Unable to verify whether Auth tag is absent" "$tmp/$mode.log"
  [[ "$(wc -l < "$MOCK_DOCKER_LOG")" -eq 1 ]]
done

: > "$MOCK_DOCKER_LOG"
if MOCK_MODE=absent bash "$helper" "$image" short-sha "$tag" > "$tmp/invalid-sha.log" 2>&1; then
  echo "Short source SHA was incorrectly accepted." >&2
  exit 1
fi
[[ ! -s "$MOCK_DOCKER_LOG" ]]

if MOCK_MODE=absent bash "$helper" "$image" "$sha" "prod-v1.0.0-ffffffffffffffffffffffffffffffffffffffff" > "$tmp/mismatched-sha.log" 2>&1; then
  echo "Release tag bound to another source SHA was incorrectly accepted." >&2
  exit 1
fi
[[ ! -s "$MOCK_DOCKER_LOG" ]]

echo "Auth immutable GHCR tag preflight tests passed."
