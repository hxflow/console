import { existsSync, readFileSync, statSync, watch } from "node:fs"

/** Tail trace.jsonl incrementally, yielding parsed line objects. */
export async function* tailJsonl(
  path: string,
  signal: AbortSignal,
): AsyncGenerator<unknown> {
  let offset = 0

  const readNew = () => {
    if (!existsSync(path)) return []
    const size = statSync(path).size
    if (size <= offset) return []
    const buf = readFileSync(path)
    const chunk = buf.slice(offset, size).toString("utf8")
    offset = size
    return chunk
      .split("\n")
      .filter(Boolean)
      .map((l) => { try { return JSON.parse(l) } catch { return null } })
      .filter(Boolean)
  }

  // Yield anything already in the file
  for (const entry of readNew()) yield entry

  if (signal.aborted) return

  // Watch for changes
  const queue: unknown[] = []
  let done = false

  let watcher: ReturnType<typeof watch> | undefined
  try {
    const dir = path.split("/").slice(0, -1).join("/")
    watcher = watch(dir, { persistent: false }, (_, filename) => {
      if (filename && path.endsWith(filename)) {
        for (const entry of readNew()) queue.push(entry)
      }
    })
  } catch {
    // fs.watch may fail on some systems; fall back to polling
  }

  signal.addEventListener("abort", () => { done = true; watcher?.close() }, { once: true })

  while (!done) {
    while (queue.length > 0) yield queue.shift()!
    await new Promise((r) => setTimeout(r, 200))
  }
}
