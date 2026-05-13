import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { randomBytes } from "node:crypto"
import type { Context, Next } from "hono"

function consoleDir() {
  return join(homedir(), ".hx", "console")
}

function tokenPath() {
  return join(consoleDir(), "token")
}

export function getOrCreateToken(): string {
  mkdirSync(consoleDir(), { recursive: true })
  const p = tokenPath()
  if (existsSync(p)) return readFileSync(p, "utf8").trim()
  const token = randomBytes(32).toString("hex")
  writeFileSync(p, token, { mode: 0o600 })
  return token
}

export function rotateToken(): string {
  mkdirSync(consoleDir(), { recursive: true })
  const token = randomBytes(32).toString("hex")
  writeFileSync(tokenPath(), token, { mode: 0o600 })
  return token
}

export function tokenAuth() {
  const validToken = getOrCreateToken()
  return async (c: Context, next: Next) => {
    // Allow ?token= in query (for initial browser open)
    const qToken = c.req.query("token")
    const hToken = c.req.header("authorization")?.replace(/^Bearer\s+/, "")
    if (qToken === validToken || hToken === validToken) {
      return next()
    }
    return c.json({ error: "Unauthorized" }, 401)
  }
}
