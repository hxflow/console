import { Hono } from "hono"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { listRuns, readManifest, readResult, outputDir } from "../store.ts"

const runs = new Hono()

runs.get("/", (c) => {
  const limit = parseInt(c.req.query("limit") ?? "50")
  const list = listRuns(limit).map((m) => {
    const result = readResult(m.runId)
    return {
      runId: m.runId,
      name: m.spec.name,
      status: result?.status ?? "running",
      startedAt: m.createdAt,
      endedAt: result?.endedAt,
      durationSec: result?.durationSec,
      costUsd: result?.usage?.costUsd,
      cwd: m.invocation.cwd,
      mrUrl: result?.mrUrl,
    }
  })
  return c.json(list)
})

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
