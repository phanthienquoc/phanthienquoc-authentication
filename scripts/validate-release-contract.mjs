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
  "name: Build and validate exact Auth repository-dispatch payload",
  "id: dispatch-payload",
  "payload=\"$(jq -cn",
  "event_type:\"auth-image-published\"",
  "keys == [\"client_payload\", \"event_type\"]",
  "keys == [\"app\", \"auth_digest\", \"commit\", \"component\", \"source_event\", \"source_head_sha\", \"source_run_attempt\", \"source_run_id\", \"source_workflow_path\", \"tag\"]",
  "and .client_payload.source_run_attempt == $source_run_attempt",
  "and .client_payload.source_event == \"workflow_dispatch\"",
  "and .client_payload.commit == .client_payload.source_head_sha",
  "and .client_payload.tag == $tag",
  "and .client_payload.auth_digest == $auth_digest",
  "and (.client_payload.auth_digest | test(\"^sha256:[0-9a-f]{64}$\"))",
  "and .client_payload.source_run_id == $source_run_id",
  "and (.client_payload.source_run_id | test(\"^[1-9][0-9]*$\"))",
  "and .client_payload.source_workflow_path == $source_workflow_path",
  "and .client_payload.source_event == $source_event",
  "and .client_payload.source_head_sha == $source_head_sha",
  "and (.client_payload.commit | test(\"^[0-9a-f]{40}$\"))",
  "TAG: ${{ github.sha }}",
  "RELEASE_TAG: ${{ steps.release-contract.outputs.release_tag }}",
  "DIGEST: ${{ steps.image.outputs.digest }}",
  "SOURCE_RUN_ID: ${{ github.run_id }}",
  "SOURCE_WORKFLOW_PATH: .github/workflows/release.yml",
  "SOURCE_EVENT: ${{ github.event_name }}",
  "SOURCE_HEAD_SHA: ${{ github.sha }}",
  "SOURCE_RUN_ATTEMPT: ${{ github.run_attempt }}",
  '[[ "$SOURCE_RUN_ATTEMPT" =~ ^[1-9][0-9]*$ ]]',
  "PAYLOAD_FILE: ${{ runner.temp }}/auth-image-published.json",
  "if: steps.dispatch-payload.outcome == 'success'",
  '--input "$PAYLOAD_FILE"',
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
assert.ok(
  release.indexOf("Build and validate exact Auth repository-dispatch payload") <
    release.indexOf("Request Auth image promotion in platform-infra"),
  "The exact Auth dispatch payload must be built and validated before it is sent.",
);
assert.ok(
  release.includes("if: steps.dispatch-payload.outcome == 'success'"),
  "Auth dispatch must be gated on successful exact-payload validation.",
);
assert.ok(
  !release.includes("client_payload[app]=auth-service"),
  "Auth dispatch must send the validated JSON payload rather than independently reconstructed form fields.",
);

assert.ok(release.includes("docker buildx imagetools inspect \"$IMAGE:$tag\""), "Auth release must verify both tags after publication.");
assert.ok(release.indexOf("Refuse to overwrite existing immutable Auth GHCR tags") < release.indexOf("Build and publish image"), "The Auth tag guard must run before the first image push.");
execFileSync("bash", ["scripts/tests/verify-ghcr-tags-absent.test.sh"], { stdio: "inherit" });

console.log("Auth immutable release contract validation passed.");
