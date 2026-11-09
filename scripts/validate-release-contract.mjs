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

const filterMarker = '              keys == ["client_payload", "event_type"]';
const filterMarkerIndex = release.indexOf(filterMarker);
assert.ok(filterMarkerIndex >= 0, "Auth dispatch jq schema filter must remain present in release.yml.");
const filterOpenMarker = "\n            '\n";
const filterOpenIndex = release.lastIndexOf(filterOpenMarker, filterMarkerIndex);
const filterCloseMarker = "\n            ' \"$PAYLOAD_FILE\"";
const filterCloseIndex = release.indexOf(filterCloseMarker, filterMarkerIndex);
assert.ok(
  filterOpenIndex >= 0 && filterCloseIndex > filterMarkerIndex,
  "Auth dispatch jq filter must be extractable for CI fixture tests.",
);
const dispatchFilter = release
  .slice(filterOpenIndex + filterOpenMarker.length, filterCloseIndex)
  .split("\n")
  .map((line) => line.trim())
  .join("\n");

const sourceSha = "a".repeat(40);
const authDigest = `sha256:${"b".repeat(64)}`;
const sourceRunId = "123456789";
const sourceRunAttempt = "2";
const sourceWorkflowPath = ".github/workflows/release.yml";
const releaseTag = `prod-v1.2.3-${sourceSha}`;
const jqArgs = [
  "-e",
  "--arg", "app", "auth-service",
  "--arg", "component", "auth",
  "--arg", "commit", sourceSha,
  "--arg", "tag", releaseTag,
  "--arg", "auth_digest", authDigest,
  "--arg", "source_run_id", sourceRunId,
  "--arg", "source_run_attempt", sourceRunAttempt,
  "--arg", "source_workflow_path", sourceWorkflowPath,
  "--arg", "source_event", "workflow_dispatch",
  "--arg", "source_head_sha", sourceSha,
  dispatchFilter,
];
const validDispatchPayload = {
  event_type: "auth-image-published",
  client_payload: {
    app: "auth-service",
    component: "auth",
    commit: sourceSha,
    tag: releaseTag,
    auth_digest: authDigest,
    source_run_id: sourceRunId,
    source_run_attempt: sourceRunAttempt,
    source_workflow_path: sourceWorkflowPath,
    source_event: "workflow_dispatch",
    source_head_sha: sourceSha,
  },
};
const runDispatchFilter = (payload) =>
  execFileSync("jq", jqArgs, {
    input: JSON.stringify(payload),
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
assert.equal(runDispatchFilter(validDispatchPayload).trim(), "true", "A valid Auth dispatch payload must pass the exact release.yml jq filter.");

const invalidDispatchPayloads = [
  ["zero run attempt", { ...validDispatchPayload, client_payload: { ...validDispatchPayload.client_payload, source_run_attempt: "0" } }],
  ["non-numeric run ID", { ...validDispatchPayload, client_payload: { ...validDispatchPayload.client_payload, source_run_id: "run-123" } }],
  ["wrong digest", { ...validDispatchPayload, client_payload: { ...validDispatchPayload.client_payload, auth_digest: "sha256:invalid" } }],
  ["push event", { ...validDispatchPayload, client_payload: { ...validDispatchPayload.client_payload, source_event: "push" } }],
  ["mismatched source SHA", { ...validDispatchPayload, client_payload: { ...validDispatchPayload.client_payload, source_head_sha: "c".repeat(40) } }],
  ["wrong workflow path", { ...validDispatchPayload, client_payload: { ...validDispatchPayload.client_payload, source_workflow_path: ".github/workflows/ci.yml" } }],
  ["extra client payload key", { ...validDispatchPayload, client_payload: { ...validDispatchPayload.client_payload, unverified: true } }],
  ["extra root key", { ...validDispatchPayload, unexpected: true }],
];
for (const [name, payload] of invalidDispatchPayloads) {
  assert.throws(() => runDispatchFilter(payload), `Unsafe Auth dispatch payload accepted: ${name}`);
}

console.log("Auth immutable release contract validation passed.");
