#!/usr/bin/env bun
import { startServer } from "../server/index.ts"

const port = parseInt(process.env.HX_UI_PORT ?? process.argv.find(a => a.startsWith("--port="))?.split("=")[1] ?? "7878")
const host = process.env.HX_UI_HOST ?? process.argv.find(a => a.startsWith("--host="))?.split("=")[1] ?? "0.0.0.0"
const noOpen = process.argv.includes("--no-open")

const { url } = await startServer({ port, host })

if (!noOpen) {
  const opener = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open"
  Bun.spawn([opener, url], { stdio: ["ignore", "ignore", "ignore"] })
}
