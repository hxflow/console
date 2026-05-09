import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import type { RunManifest, RunResult } from "@hxflow/shared/types"

function hxDir() { return join(homedir(), ".hx") }
function runsDir() { return join(hxDir(), "runs") }
export function outputDir(runId: string) { return join(runsDir(), runId) }

export function readManifest(runId: string): RunManifest | null {
  const p = join(outputDir(runId), "manifest.json")
  if (!existsSync(p)) return null
  return JSON.parse(readFileSync(p, "utf8")) as RunManifest
}

export function readResult(runId: string): RunResult | null {
  const p = join(outputDir(runId), "result.json")
  if (!existsSync(p)) return null
  return JSON.parse(readFileSync(p, "utf8")) as RunResult
}

export function listRuns(limit = 50): RunManifest[] {
  const dir = runsDir()
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((n) => n.startsWith("r-"))
    .sort().reverse().slice(0, limit)
    .map((n) => readManifest(n))
    .filter((m): m is RunManifest => m !== null)
}
