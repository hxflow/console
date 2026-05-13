import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import type { AgentResponse, RunManifest } from "@hxflow/shared/types"

function hxDir() { return join(homedir(), ".hx") }
function runsDir() { return join(hxDir(), "runs") }
export function outputDir(runId: string) { return join(runsDir(), runId) }

export function readManifest(runId: string): RunManifest | null {
  const p = join(outputDir(runId), "manifest.json")
  if (!existsSync(p)) return null
  return JSON.parse(readFileSync(p, "utf8")) as RunManifest
}

export function readResult(runId: string): AgentResponse | null {
  const p = join(outputDir(runId), "result.json")
  if (!existsSync(p)) return null
  return JSON.parse(readFileSync(p, "utf8")) as AgentResponse
}

const RUN_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function listRuns(limit = 50): RunManifest[] {
  const dir = runsDir()
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((n) => RUN_ID_RE.test(n) || n.startsWith("r-"))
    .sort().reverse().slice(0, limit)
    .map((n) => readManifest(n))
    .filter((m): m is RunManifest => m !== null)
}
