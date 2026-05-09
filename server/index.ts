import { Hono } from "hono"
import { cors } from "hono/cors"
import { serveStatic } from "hono/bun"
import { join } from "node:path"
import { existsSync } from "node:fs"
import { tokenAuth, getOrCreateToken } from "./auth.ts"
import { runs } from "./routes/runs.ts"
import { stream } from "./routes/stream.ts"

export interface ServerOptions {
  port?: number
  host?: string
  webDistDir?: string
}

export function createApp(opts: ServerOptions = {}) {
  const app = new Hono()
  const auth = tokenAuth()

  app.use("*", cors())

  // API routes — all require token auth
  app.use("/api/*", auth)
  app.route("/api/runs", runs)
  app.route("/api/runs", stream)

  // Static SPA
  const distDir = opts.webDistDir ?? join(import.meta.dir, "../dist")
  if (existsSync(distDir)) {
    app.use("/*", serveStatic({ root: distDir }))
    // SPA fallback
    app.get("*", serveStatic({ path: join(distDir, "index.html") }))
  } else {
    app.get("/", (c) =>
      c.html(`<pre>UI not built. Run: bun run build:web\n\nAPI available at /api/runs</pre>`)
    )
  }

  return app
}

export async function startServer(opts: ServerOptions = {}) {
  const port = opts.port ?? 7878
  const host = opts.host ?? "0.0.0.0"
  const token = getOrCreateToken()
  const app = createApp(opts)

  const server = Bun.serve({ fetch: app.fetch, port, hostname: host })

  const url = `http://localhost:${port}/?token=${token}`
  console.log(`hx-console listening on http://${host}:${port}`)
  console.log(`Open: ${url}`)

  return { server, token, url }
}

// Direct run
if (import.meta.main) {
  const port = parseInt(process.env.HX_UI_PORT ?? "7878")
  const host = process.env.HX_UI_HOST ?? "0.0.0.0"
  await startServer({ port, host })
}
