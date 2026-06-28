import { useEffect, useMemo, useState } from "react";

const examples = [
  "Draft a production deploy plan with approval gates",
  "Prepare a customer incident communications handoff for support leadership",
  "Draft a dry-run database migration plan with rollback checkpoints"
];

export default function App() {
  const [goal, setGoal] = useState(examples[0]);
  const [run, setRun] = useState(null);
  const [tools, setTools] = useState([]);
  const [runtime, setRuntime] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadMetadata() {
    const [toolsResponse, runtimeResponse] = await Promise.all([
      fetch("/api/tools"),
      fetch("/api/metrics/runtime")
    ]);
    setTools(await toolsResponse.json());
    setRuntime(await runtimeResponse.json());
  }

  useEffect(() => {
    loadMetadata();
  }, []);

  async function execute(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ goal, owner: "AgentOps Review" })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message || "Run failed");
      setRun(payload);
      await loadMetadata();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const phases = useMemo(() => {
    return (run?.trace || []).reduce((result, item) => {
      result[item.phase] = (result[item.phase] || 0) + 1;
      return result;
    }, {});
  }, [run]);

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Agent engineering workbench</p>
          <h1>AgentOps Eval Studio</h1>
          <p>Run deterministic agent workflows, inspect trace decisions, validate policy gates, and replay evaluation scenarios.</p>
        </div>
        <div className="runtime">
          <strong>{runtime?.requests ?? 0}</strong>
          <span>API requests</span>
        </div>
      </section>

      {error && <div className="alert">{error}</div>}

      <section className="layout">
        <div className="panel">
          <h2>Run agent</h2>
          <form onSubmit={execute} className="run-form">
            <textarea value={goal} onChange={(event) => setGoal(event.target.value)} />
            <div className="example-row">
              {examples.map((example) => (
                <button type="button" className="secondary" key={example} onClick={() => setGoal(example)}>
                  {example}
                </button>
              ))}
            </div>
            <button type="submit" disabled={loading}>{loading ? "Running..." : "Run dry-run agent"}</button>
          </form>
        </div>

        <aside className="panel">
          <h2>Tool registry</h2>
          <div className="tool-list">
            {tools.map((tool) => (
              <div key={tool.name}>
                <strong>{tool.name}</strong>
                <span>{tool.permission}</span>
                <p>{tool.description}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>

      {run && (
        <section className="results">
          <div className="panel status-panel">
            <span className={`status ${run.status}`}>{run.status}</span>
            <h2>{run.final.reason}</h2>
            <div className="quality-grid">
              <Metric label="Readiness" value={run.final.quality.readinessScore} />
              <Metric label="Validation %" value={run.final.quality.validationPassRate} />
              <Metric label="Grounded" value={String(run.final.quality.grounded)} />
              <Metric label="Approval" value={String(run.final.quality.approvalRequired)} />
              <Metric label="Writes" value={run.final.quality.externalWrites} />
            </div>
            {run.final.quality.riskSignals.length > 0 && <p className="muted">Risk signals: {run.final.quality.riskSignals.join(", ")}</p>}
          </div>

          <div className="panel">
            <h2>Trace phases</h2>
            <div className="phase-grid">
              {Object.entries(phases).map(([phase, count]) => (
                <Metric key={phase} label={phase} value={count} />
              ))}
            </div>
          </div>

          <div className="panel trace-panel">
            <h2>Trace timeline</h2>
            {run.trace.map((item, index) => (
              <article key={`${item.phase}-${item.step}-${index}`}>
                <span>{item.step}</span>
                <div>
                  <strong>{item.phase}</strong>
                  <pre>{JSON.stringify(item, null, 2)}</pre>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
