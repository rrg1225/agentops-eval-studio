import { randomUUID } from "node:crypto";
import { classifyRequest, validateToolOutput } from "./policies.js";
import { runTool } from "./tools.js";

export async function runAgent(goal, options = {}) {
  const state = {
    runId: `run_${Date.now()}_${randomUUID().slice(0, 8)}`,
    startedAt: new Date().toISOString(),
    goal: String(goal || "").trim(),
    owner: options.owner || "Operations Review",
    mode: options.mode || process.env.AGENT_MODE || "dry-run",
    maxSteps: clampSteps(options.maxSteps || process.env.AGENT_MAX_STEPS || 8),
    policy: null,
    observations: [],
    trace: [],
    status: "running"
  };

  if (state.goal.length < 6) return finish(state, "blocked", "Goal is too short to execute safely.");

  state.policy = classifyRequest(state.goal);
  state.trace.push(event(1, "observe", { goal: state.goal, policy: state.policy }));
  if (state.policy.level === "blocked") return finish(state, "blocked", state.policy.reason);

  const sequence = ["memory.retrieve", "signals.inspect", "plan.compose", "review.check", "handoff.draft"];
  for (let index = 0; index < Math.min(sequence.length, state.maxSteps); index += 1) {
    const tool = sequence[index];
    const startedAt = performance.now();
    state.trace.push(event(index + 2, "decide", { tool, reason: reasonFor(tool) }));

    const output = await runTool(tool, { query: state.goal }, state);
    const observation = {
      tool,
      output,
      latencyMs: Math.round(performance.now() - startedAt)
    };
    state.observations.push(observation);
    state.trace.push(event(index + 2, "act", { observation }));

    const ok = validateToolOutput(tool, output);
    state.trace.push(event(index + 2, "validate", { tool, ok }));
    if (!ok) return finish(state, "failed", `Tool output failed validation: ${tool}`);
  }

  const handoff = state.observations.find((item) => item.tool === "handoff.draft")?.output;
  return finish(state, handoff?.status === "needs-approval" ? "needs-approval" : "completed", "success_criteria_met");
}

function reasonFor(tool) {
  const reasons = {
    "memory.retrieve": "Ground the run in policy and runbook context.",
    "signals.inspect": "Inspect operational and data-sensitivity risk signals.",
    "plan.compose": "Build a dry-run plan with stop conditions.",
    "review.check": "Review grounding and approval gates.",
    "handoff.draft": "Produce an audit-friendly handoff for humans."
  };
  return reasons[tool];
}

function finish(state, status, reason) {
  state.status = status;
  state.completedAt = new Date().toISOString();
  state.durationMs = Math.max(0, Date.parse(state.completedAt) - Date.parse(state.startedAt));
  const review = state.observations.find((item) => item.tool === "review.check")?.output;
  const handoff = state.observations.find((item) => item.tool === "handoff.draft")?.output;
  state.final = {
    status,
    reason,
    policy: state.policy,
    quality: {
      grounded: Boolean(review?.grounded),
      approvalRequired: Boolean(review?.approvalRequired),
      dryRunOnly: state.mode === "dry-run",
      externalWrites: state.observations.filter((item) => item.output?.externalWritePerformed).length,
      validatedTools: state.trace.filter((item) => item.phase === "validate" && item.ok).length
    },
    handoff
  };
  return state;
}

function event(step, phase, payload) {
  return {
    step,
    phase,
    at: new Date().toISOString(),
    ...payload
  };
}

function clampSteps(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 8;
  return Math.max(3, Math.min(10, Math.round(parsed)));
}
