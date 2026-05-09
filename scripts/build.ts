#!/usr/bin/env bun
/**
 * Build hx-ui: Vite web assets → bun compile single binary.
 * Usage: bun scripts/build.ts [--skip-web] [--target <platform>]
 */

import { existsSync, mkdirSync } from "node:fs"
import { join } from "node:path"

const args = process.argv.slice(2)
const skipWeb = args.includes("--skip-web")
const targetFilter = args[args.indexOf("--target") + 1]

const root = join(import.meta.dir, "..")
const distDir = join(root, "dist/bin")
mkdirSync(distDir, { recursive: true })

// Step 1: Vite build
if (!skipWeb) {
  console.log("Building web assets…")
  const r = Bun.spawnSync(["bun", "run", "build:web"], { cwd: root, stdio: ["ignore", "inherit", "inherit"] })
  if (r.exitCode !== 0) { console.error("Vite build failed"); process.exit(1) }
}

// Step 2: bun compile
const TARGETS = [
  { target: "bun-darwin-arm64",  out: "hx-ui-darwin-arm64" },
  { target: "bun-darwin-x64",    out: "hx-ui-darwin-x64" },
  { target: "bun-linux-arm64",   out: "hx-ui-linux-arm64" },
  { target: "bun-linux-x64",     out: "hx-ui-linux-x64" },
]

const currentTarget = (() => {
  const os = process.platform === "darwin" ? "darwin" : "linux"
  const arch = process.arch === "arm64" ? "arm64" : "x64"
  return TARGETS.find((t) => t.out.includes(os) && t.out.includes(arch))!
})()

const toBuild = targetFilter
  ? TARGETS.filter((t) => t.out.includes(targetFilter))
  : [currentTarget]

for (const { target, out } of toBuild) {
  const outPath = join(distDir, out)
  console.log(`Compiling ${out}…`)
  const r = Bun.spawnSync([
    "bun", "build", "--compile",
    `--target=${target}`,
    "--sourcemap=none",
    "bin/hx-ui.ts",
    `--outfile=${outPath}`,
  ], { cwd: root, stdio: ["ignore", "inherit", "inherit"] })
  if (r.exitCode !== 0) { console.error(`Failed: ${out}`); process.exit(1) }
  console.log(`  → dist/bin/${out}`)
}

console.log("Build complete.")
