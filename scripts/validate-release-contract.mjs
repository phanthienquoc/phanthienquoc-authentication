import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const release = readFileSync(".github/workflows/release.yml", "utf8");
const ci = readFileSync(".github/workflows/ci.yml", "utf8");

const required = [
  "workflow_dispatch:",
  "  validate-release-ref:\n",
  "    name: Require master for production release\n",
  '          if [[ "$GITHUB_REF" != "refs/heads/master" ]]; then',
  "    permissions: {}\n",
  "  verify:\n    needs: validate-release-ref\n",
  "    needs: [validate-release-ref, verify]\n",
  'RELEASE_TAG="prod-v${VERSION}-${TAG}"',
  "--platform linux/arm64",
  "--provenance=true",
  "--sbom=true",
  "Verify published digest and ARM64 manifest",
  "Refuse to overwrite existing immutable Auth GHCR tags",
  'run: bash scripts/verify-ghcr-tags-absent.sh "$IMAGE" "$SHA_TAG" "$RELEASE_TAG"',
  "docker buildx imagetools inspect",
  'event_type="auth-image-published"',
  "client_payload[app]=auth-service",
  "client_payload[component]=auth",
  "client_payload[commit]=$TAG",
  "client_payload[tag]=$RELEASE_TAG",
  "client_payload[auth_digest]=$DIGEST",
  "client_payload[source_run_id]=$SOURCE_RUN_ID",
  "client_payload[source_workflow_path]=$SOURCE_WORKFLOW_PATH",
  "client_payload[source_event]=$SOURCE_EVENT",
  "client_payload[source_head_sha]=$SOURCE_HEAD_SHA",
];

for (const token of required) {
  assert.ok(release.includes(token), `Auth release workflow is missing contract token: ${token}`);
}

assert.ok(!release.includes('event_type="image-published"'), "Legacy tag-only Auth dispatch must be removed.");
assert.ok(!release.includes("SHORT_SHA"), "Auth release tag must retain the full 40-character source SHA.");
assert.ok(
  release.indexOf("Verify published digest and ARM64 manifest") <
    release.indexOf("Request Auth image promotion in platform-infra"),
  "The Auth publisher must verify the registry digest before dispatching promotion.",
);
assert.ok(
  ci.includes("node scripts/validate-release-contract.mjs"),
  "Auth CI must execute the release contract validator.",
);

assert.ok(release.includes("docker buildx imagetools inspect \"$IMAGE:$tag\""), "Auth release must verify both tags after publication.");
assert.ok(release.indexOf("Refuse to overwrite existing immutable Auth GHCR tags") < release.indexOf("Build and publish image"), "The Auth tag guard must run before the first image push.");
execFileSync("bash", ["scripts/tests/verify-ghcr-tags-absent.test.sh"], { stdio: "inherit" });

console.log("Auth immutable release contract validation passed.");
