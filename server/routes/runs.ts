import { Hono } from "hono"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { listRuns, readManifest, readResult, outputDir } from "../store.ts"

const runs = new Hono()

runs.get("/", (c) => {
  const limit = parseInt(c.req.query("limit") ?? "50")
  const list = listRuns(limit).map((m) => {
    const envelope = readResult(m.runId)
    const data = envelope?.data as any
    const status = data?.status ?? (envelope?.err === 0 ? "succeeded" : envelope ? "failed" : "running")
    const mrUrl = pickMr(data?.artifacts)
    return {
      runId: m.runId,
      name: m.spec.name,
      status,
      startedAt: m.createdAt,
      endedAt: data?.endedAt ?? null,
      durationSec: data?.durationSec ?? null,
      cwd: m.invocation.cwd,
      mrUrl,
    }
  })
  return c.json(list)
})

function pickMr(artifacts: Array<{ type: string; url: string }> | undefined): string | undefined {
  if (!Array.isArray(artifacts)) return undefined
  return artifacts.find((a) => a.type === "pr" || a.type === "mr")?.url
}

runs.get("/:id", (c) => {
  const id = c.req.param("id")
  const manifest = readManifest(id)
  if (!manifest) return c.json({ error: "Not found" }, 404)
  const result = readResult(id)
  return c.json({ manifest, result })
})

runs.get("/:id/diff", (c) => {
  const id = c.req.param("id")
  const diffPath = join(outputDir(id), "diff.patch")
  if (!existsSync(diffPath)) return c.text("", 200)
  return c.text(readFileSync(diffPath, "utf8"))
})

export { runs }
