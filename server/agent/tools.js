import { retrieveMemory } from "./memory.js";

export const toolCatalog = [
  {
    name: "memory.retrieve",
    permission: "read",
    description: "Retrieve policy and runbook snippets relevant to the operator goal."
  },
  {
    name: "signals.inspect",
    permission: "read",
    description: "Inspect synthetic operational signals and detect likely risk drivers."
  },
  {
    name: "plan.compose",
    permission: "write-dry-run",
    description: "Compose a dry-run action plan with explicit stop conditions."
  },
  {
    name: "review.check",
    permission: "review",
    description: "Validate the plan against policy, grounding, and approval requirements."
  },
  {
    name: "handoff.draft",
    permission: "write-dry-run",
    description: "Draft a human-readable owner handoff without notifying external systems."
  }
];

export async function runTool(name, input, state) {
  if (name === "memory.retrieve") return retrieveMemory(input.query);
  if (name === "signals.inspect") return inspectSignals(state.goal);
  if (name === "plan.compose") return composePlan(state);
  if (name === "review.check") return reviewPlan(state);
  if (name === "handoff.draft") return draftHandoff(state);
  throw new Error(`Unknown tool: ${name}`);
}

function inspectSignals(goal) {
  const text = goal.toLowerCase();
  const signals = [
    { name: "policy-risk", status: /deploy|rollback|migration|notify/.test(text) ? "warning" : "healthy" },
    { name: "data-sensitivity", status: /customer|database|secret|token/.test(text) ? "warning" : "healthy" },
    { name: "time-criticality", status: /incident|urgent|outage/.test(text) ? "critical" : "healthy" }
  ];
  return {
    signals,
    critical: signals.filter((signal) => signal.status === "critical").length,
    warnings: signals.filter((signal) => signal.status === "warning").length
  };
}

function composePlan(state) {
  const memory = state.observations.find((item) => item.tool === "memory.retrieve")?.output || [];
  const signals = state.observations.find((item) => item.tool === "signals.inspect")?.output;
  const approvalRequired = state.policy.level !== "low" || Boolean(signals?.critical || signals?.warnings);
  return {
    approvalRequired,
    assumptions: memory.map((item) => item.title),
    steps: [
      "Confirm scope, owner, and success criteria.",
      "Ground the action in retrieved policy snippets.",
      "Prepare a dry-run plan and rollback or stop conditions.",
      approvalRequired ? "Route the plan to a human reviewer before execution." : "Record the recommendation and close the run."
    ],
    stopConditions: [
      "Missing owner",
      "Policy contradiction",
      "Any request to bypass approval",
      "Tool output fails validation"
    ]
  };
}

function reviewPlan(state) {
  const plan = state.observations.find((item) => item.tool === "plan.compose")?.output;
  const grounded = (state.observations.find((item) => item.tool === "memory.retrieve")?.output || []).length > 0;
  const approved = Boolean(plan && grounded && state.policy.level !== "blocked");
  return {
    approved,
    grounded,
    approvalRequired: Boolean(plan?.approvalRequired),
    findings: [
      grounded ? "Plan is grounded in retrieved policy." : "Plan lacks policy grounding.",
      plan?.approvalRequired ? "Human approval is required before real-world execution." : "No disruptive action detected."
    ]
  };
}

function draftHandoff(state) {
  const review = state.observations.find((item) => item.tool === "review.check")?.output;
  return {
    owner: state.owner || "Operations Review",
    summary: `Agent run prepared for: ${state.goal}`,
    status: review?.approvalRequired ? "needs-approval" : "ready",
    nextCheckpoint: "Review policy findings and approve or revise the dry-run plan.",
    externalWritePerformed: false
  };
}
