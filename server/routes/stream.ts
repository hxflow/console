import { Hono } from "hono"
import { join } from "node:path"
import { outputDir } from "../store.ts"
import { tailJsonl } from "../tail.ts"

const stream = new Hono()

stream.get("/:id/stream", async (c) => {
  const id = c.req.param("id")
  const tracePath = join(outputDir(id), "trace.jsonl")

  const ac = new AbortController()
  c.req.raw.signal.addEventListener("abort", () => ac.abort(), { once: true })

  const encoder = new TextEncoder()
  const body = new ReadableStream({
    async start(controller) {
      try {
        for await (const entry of tailJsonl(tracePath, ac.signal)) {
          const data = `data: ${JSON.stringify(entry)}\n\n`
          controller.enqueue(encoder.encode(data))
        }
      } finally {
        controller.close()
      }
    },
    cancel() {
      ac.abort()
    },
  })

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
})

export { stream }
