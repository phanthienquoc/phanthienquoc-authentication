#!/usr/bin/env bash
set -euo pipefail

image="${1:-}"
sha_tag="${2:-}"
release_tag="${3:-}"

[[ "$image" =~ ^ghcr\.io/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]] || {
  echo "Usage: $0 ghcr.io/owner/package <full-source-sha> <prod-vX.Y.Z-full-source-sha>" >&2
  exit 2
}
[[ "$sha_tag" =~ ^[0-9a-f]{40}$ ]] || {
  echo "Expected a full 40-character lowercase source SHA; refusing publication." >&2
  exit 2
}
[[ "$release_tag" =~ ^prod-v[0-9]+\.[0-9]+\.[0-9]+-[0-9a-f]{40}$ ]] || {
  echo "Expected a stable semver release tag containing a full source SHA; refusing publication." >&2
  exit 2
}
[[ "$release_tag" == *-"$sha_tag" ]] || {
  echo "Release tag is not bound to the expected source SHA; refusing publication." >&2
  exit 2
}
command -v docker >/dev/null 2>&1 || {
  echo "Docker is required to inspect GHCR tags before publication." >&2
  exit 2
}

for tag in "$sha_tag" "$release_tag"; do
  reference="$image:$tag"
  if inspect_output="$(docker buildx imagetools inspect "$reference" 2>&1)"; then
    echo "::error::Immutable Auth release tag already exists; refusing to overwrite: $reference" >&2
    echo "Use the existing registry digest for promotion; do not republish this source SHA." >&2
    exit 1
  else
    inspect_status=$?
  fi

  if grep -Eiq '(^|[^0-9])404([^0-9]|$)|manifest unknown|name_unknown|no such manifest|manifest not found' <<< "$inspect_output"; then
    echo "Verified immutable Auth tag is absent: $reference"
    continue
  fi

  echo "::error::Unable to verify whether Auth tag is absent (docker exit $inspect_status); refusing publication: $reference" >&2
  printf '%s\n' "$inspect_output" >&2
  exit 1
done

echo "Both immutable Auth GHCR tags are absent; publication may proceed."
