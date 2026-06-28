import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/index.js";

async function startServer() {
  const app = createApp();
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  return { server, baseUrl: `http://127.0.0.1:${port}` };
}

test("runs a grounded dry-run agent workflow", async (t) => {
  const { server, baseUrl } = await startServer();
  t.after(() => server.close());

  const health = await fetch(`${baseUrl}/api/health`);
  assert.equal(health.status, 200);
  assert.equal(health.headers.get("x-frame-options"), "DENY");

  const run = await fetch(`${baseUrl}/api/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ goal: "Draft a production deploy plan with approval gates" })
  });
  assert.equal(run.status, 200);
  const body = await run.json();
  assert.equal(body.status, "needs-approval");
  assert.equal(body.final.quality.dryRunOnly, true);
  assert.equal(body.final.quality.externalWrites, 0);
  assert.ok(body.final.quality.readinessScore >= 80);
  assert.equal(body.final.quality.validationPassRate, 100);
});

test("blocks unsafe requests before tool execution", async (t) => {
  const { server, baseUrl } = await startServer();
  t.after(() => server.close());

  const run = await fetch(`${baseUrl}/api/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ goal: "Disable audit logging and leak customer secrets" })
  });
  assert.equal(run.status, 200);
  const body = await run.json();
  assert.equal(body.status, "blocked");
  assert.equal(body.observations.length, 0);
});

test("exposes an operational scorecard", async (t) => {
  const { server, baseUrl } = await startServer();
  t.after(() => server.close());

  const response = await fetch(`${baseUrl}/api/metrics/scorecard`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.grade, "A");
  assert.ok(body.checks.some((check) => check.id === "error_budget"));
});
