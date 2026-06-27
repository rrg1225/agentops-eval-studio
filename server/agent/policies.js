const blockedPatterns = [
  /delete\s+(all|production|database|customer)/i,
  /disable\s+(audit|logging|approval|auth)/i,
  /ignore\s+(policy|system|previous)\s+instructions/i,
  /exfiltrate|leak|send\s+secret/i
];

const reviewPatterns = [
  /deploy|rollback|notify|email|ticket|write|page|restart|migration/i
];

export function classifyRequest(goal) {
  const text = String(goal || "");
  const blocked = blockedPatterns.find((pattern) => pattern.test(text));
  if (blocked) {
    return {
      level: "blocked",
      reason: "Unsafe or irreversible instruction detected.",
      matchedPolicy: String(blocked)
    };
  }

  const review = reviewPatterns.find((pattern) => pattern.test(text));
  if (review) {
    return {
      level: "review",
      reason: "The request may change external state; the agent will stay in dry-run mode.",
      matchedPolicy: String(review)
    };
  }

  return {
    level: "low",
    reason: "No high-risk action detected.",
    matchedPolicy: null
  };
}

export function validateToolOutput(toolName, output) {
  if (toolName === "memory.retrieve") return Array.isArray(output);
  if (toolName === "signals.inspect") return Array.isArray(output?.signals);
  if (toolName === "plan.compose") return Array.isArray(output?.steps) && output.steps.length > 0;
  if (toolName === "review.check") return typeof output?.approved === "boolean";
  if (toolName === "handoff.draft") return Boolean(output?.summary && output?.owner);
  return false;
}
