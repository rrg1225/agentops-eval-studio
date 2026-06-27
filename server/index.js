import express from "express";
import cors from "cors";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { runAgent } from "./agent/loop.js";
import { toolCatalog } from "./agent/tools.js";
import { createRuntimeState, installRuntimeControls, runtimeMetrics } from "./runtime.js";
import { asyncRoute, errorHandler, notFound, requireObjectBody, requireText } from "./http.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");

export function createApp() {
  const app = express();
  const runtime = createRuntimeState("agentops-eval-studio");

  installRuntimeControls(app, runtime);
  app.use(cors());
  app.use(express.json({ limit: "256kb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "agentops-eval-studio", mode: process.env.AGENT_MODE || "dry-run" });
  });

  app.get("/api/tools", (_req, res) => {
    res.json(toolCatalog);
  });

  app.get("/api/metrics/runtime", (_req, res) => {
    res.json(runtimeMetrics(runtime));
  });

  app.post("/api/runs", asyncRoute(async (req, res) => {
    const body = requireObjectBody(req.body);
    const run = await runAgent(requireText(body.goal, "goal", 6), {
      owner: body.owner,
      mode: body.mode,
      maxSteps: body.maxSteps
    });
    await persistTrace(run);
    res.status(run.status === "failed" ? 500 : 200).json(run);
  }));

  app.use("/api", notFound);
  app.use(express.static(join(rootDir, "dist")));
  app.get("*", (_req, res) => {
    res.sendFile(join(rootDir, "dist", "index.html"));
  });
  app.use(errorHandler("agentops-eval-studio"));

  return app;
}

async function persistTrace(run) {
  const traceDir = join(rootDir, "traces");
  await mkdir(traceDir, { recursive: true });
  await writeFile(join(traceDir, `${run.runId}.json`), JSON.stringify(run, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4420);
  createApp().listen(port, () => {
    console.log(`AgentOps Eval Studio running on http://localhost:${port}`);
  });
}
