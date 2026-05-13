#!/usr/bin/env bun
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

import { getOrCreateToken } from "../server/auth.ts"

function consoleDir() { return join(homedir(), ".hx", "console") }
function pidFile() { return join(consoleDir(), "server.pid") }
function portFile() { return join(consoleDir(), "server.port") }
function tokenFile() { return join(consoleDir(), "token") }

function readFlag(name: string): string | null {
  const prefix = `--${name}=`
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? null
}

function readToken() {
  const path = tokenFile()
  return existsSync(path) ? readFileSync(path, "utf8").trim() : null
}

function serverUrl() {
  const port = existsSync(portFile()) ? readFileSync(portFile(), "utf8").trim() : "7878"
  const token = readToken()
  return `http://localhost:${port}/${token ? `?token=${token}` : ""}`
}

function isAlive(pid: number) {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function openBrowser(url: string) {
  const opener = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open"
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url]
  Bun.spawn([opener, ...args], { stdio: ["ignore", "ignore", "ignore"] })
}

const port = parseInt(process.env.HX_CONSOLE_PORT ?? process.env.HX_UI_PORT ?? readFlag("port") ?? "7878", 10)
const host = process.env.HX_CONSOLE_HOST ?? process.env.HX_UI_HOST ?? readFlag("host") ?? "0.0.0.0"
const noOpen = process.argv.includes("--no-open")
const stop = process.argv.includes("--stop")
const status = process.argv.includes("--status")

mkdirSync(consoleDir(), { recursive: true })

if (stop) {
  const path = pidFile()
  if (!existsSync(path)) {
    console.log("Console server not running.")
    process.exit(0)
  }
  const pid = parseInt(readFileSync(path, "utf8"), 10)
  try {
    process.kill(pid, "SIGTERM")
    console.log(`Stopped pid ${pid}`)
  } catch {
    console.log("Process already stopped.")
  }
  process.exit(0)
}

if (status) {
  const path = pidFile()
  if (!existsSync(path)) {
    console.log("Console server not running.")
    process.exit(0)
  }
  const pid = parseInt(readFileSync(path, "utf8"), 10)
  if (isAlive(pid)) console.log(`running  pid=${pid}  ${serverUrl()}`)
  else console.log("Console server not running (stale pid file).")
  process.exit(0)
}

if (existsSync(pidFile())) {
  const pid = parseInt(readFileSync(pidFile(), "utf8"), 10)
  if (isAlive(pid)) {
    const url = serverUrl()
    console.log(`Console already running at ${url}`)
    if (!noOpen) openBrowser(url)
    process.exit(0)
  }
}

const serverPath = join(import.meta.dir, "../server/index.ts")
const proc = Bun.spawn(["bun", serverPath], {
  stdio: ["ignore", "ignore", "ignore"],
  detached: true,
  env: { ...process.env, HX_CONSOLE_PORT: String(port), HX_CONSOLE_HOST: host },
})

writeFileSync(pidFile(), String(proc.pid))
writeFileSync(portFile(), String(port))
proc.unref()

await new Promise((resolve) => setTimeout(resolve, 800))

const token = getOrCreateToken()
const url = `http://localhost:${port}/?token=${token}`

if (!noOpen) {
  openBrowser(url)
}

console.log(`hx-console started  pid=${proc.pid}`)
console.log(url)
process.exit(0)
