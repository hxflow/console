import { useEffect, useState } from "react"
import { openStream } from "../lib/api.ts"

export function useRunStream(runId: string, active: boolean) {
  const [events, setEvents] = useState<any[]>([])
  const [streaming, setStreaming] = useState(false)

  useEffect(() => {
    if (!active) return
    setEvents([])   // 每次重新订阅都从空开始，避免 tab 切换导致重复
    setStreaming(true)
    const close = openStream(
      runId,
      (entry) => setEvents((prev) => [...prev, entry]),
      () => setStreaming(false),
    )
    return () => { close(); setStreaming(false) }
  }, [runId, active])

  return { events, streaming }
}
