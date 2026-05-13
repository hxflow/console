import { useEffect, useState } from "react"
import { fetchRun, fetchDiff } from "../lib/api.ts"
import { useRunStream } from "../hooks/useRunStream.ts"

type Tab = "overview" | "events" | "diff"

export function RunDetail({ runId, onBack }: { runId: string; onBack: () => void }) {
  const [data, setData] = useState<any>(null)
  const [diff, setDiff] = useState("")
  const [tab, setTab] = useState<Tab>("overview")
  const isRunning = !data?.result

  const { events, streaming } = useRunStream(runId, isRunning || tab === "events")

  useEffect(() => {
    fetchRun(runId).then(setData).catch(console.error)
    fetchDiff(runId).then(setDiff).catch(() => {})
    const id = setInterval(() => fetchRun(runId).then(setData).catch(() => {}), 3000)
    return () => clearInterval(id)
  }, [runId])

  const envelope = data?.result
  const result = envelope?.data
  const status: string = result?.status ?? (envelope?.err === 0 ? "succeeded" : envelope ? "failed" : "running")
  const manifest = data?.manifest

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={s.topbar}>
        <button onClick={onBack} style={s.back}>← runs</button>
        <span style={{ marginLeft: 12, color: "#e6edf3" }}>{runId}</span>
        <span style={{ marginLeft: 12, color: STATUS_COLOR[status] ?? "#8b949e" }}>
          {!envelope ? "● running" : status}
        </span>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {(["overview", "events", "diff"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }}>
            {t}{t === "events" && streaming ? " ●" : ""}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {tab === "overview" && <Overview envelope={envelope} manifest={manifest} />}
        {tab === "events" && <Events events={events} />}
        {tab === "diff" && <Diff diff={diff} />}
      </div>
    </div>
  )
}

function Overview({ envelope, manifest }: any) {
  if (!manifest) return <div>Loading…</div>
  const data = envelope?.data
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <Row label="backend" value={manifest.backend} />
      <Row label="image" value={manifest.spec?.image} />
      <Row label="cwd" value={manifest.invocation?.cwd} />
      <Row label="environment" value={manifest.environment?.name} />
      {data && <>
        {data.model && <Row label="model" value={data.model} />}
        {data.provider && <Row label="provider" value={data.provider} />}
        {data.scope && <Row label="scope" value={data.scope} />}
        {data.source && <Row label="source" value={data.source} />}
        {data.executionLocation && <Row label="location" value={data.executionLocation} />}
        {typeof data.durationSec === "number" && <Row label="duration" value={`${data.durationSec.toFixed(1)}s`} />}
        {data.usage?.totalTokens > 0 && (
          <Row
            label="tokens"
            value={`${data.usage.totalTokens} (in:${data.usage.inputTokens} out:${data.usage.outputTokens} cache_r:${data.usage.cacheReadTokens} cache_w:${data.usage.cacheWriteTokens})`}
          />
        )}
        {envelope?.msg && envelope.err !== 0 && <Row label="error" value={envelope.msg} err />}
        {data.summary && (
          <div style={{ marginTop: 16, padding: 12, background: "#161b22", borderRadius: 4, color: "#e6edf3", whiteSpace: "pre-wrap" }}>
            {data.summary}
          </div>
        )}
        {Array.isArray(data.artifacts) && data.artifacts.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ color: "#8b949e", marginBottom: 8, fontSize: 11 }}>ARTIFACTS</div>
            {data.artifacts.map((a: any, i: number) => (
              <div key={i} style={{ padding: "4px 0" }}>
                <span style={{ color: "#bc8cff", marginRight: 8, minWidth: 60, display: "inline-block" }}>{a.type}</span>
                <a href={a.url} target="_blank" rel="noreferrer">{a.label ?? a.url}</a>
              </div>
            ))}
          </div>
        )}
        {data.skills && (
          <div style={{ marginTop: 16, fontSize: 11, color: "#8b949e" }}>
            <div>system skills: {data.skills.system?.join(", ") || "—"}</div>
            <div>project skills: {data.skills.project?.join(", ") || "—"}</div>
            {data.skills.overridden?.length > 0 && (
              <div style={{ color: "#d29922" }}>overridden: {data.skills.overridden.join(", ")}</div>
            )}
          </div>
        )}
      </>}
    </div>
  )
}

function Row({ label, value, link, err }: { label: string; value?: string; link?: boolean; err?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 16 }}>
      <span style={{ minWidth: 80, color: "#8b949e", fontSize: 11 }}>{label}</span>
      {link
        ? <a href={value} target="_blank">{value}</a>
        : <span style={{ color: err ? "#f85149" : "#e6edf3" }}>{value}</span>}
    </div>
  )
}

// 纯分隔符事件，不展示
const SKIP_PI_TYPES = new Set(["turn_start", "turn_end", "message_start", "message_end"])

type DisplayEvent =
  | { key: string; kind: "hx"; ts: string; hxType: string; msg?: string }
  | { key: string; kind: "message"; ts: string; text: string }
  | { key: string; kind: "tool"; ts: string; toolName: string; status: "running" | "done" }
  | { key: string; kind: "pi_other"; ts: string; piType: string }

function collapseEvents(raw: any[]): DisplayEvent[] {
  const result: DisplayEvent[] = []
  let msgIdx = -1

  for (const e of raw) {
    if (e.kind === "hx") {
      msgIdx = -1
      result.push({ key: e.ts + e.hxType, kind: "hx", ts: e.ts, hxType: e.hxType, msg: e.payload?.msg })
      continue
    }

    const pt: string = e.piType ?? ""

    if (SKIP_PI_TYPES.has(pt)) continue

    if (pt === "message_update") {
      const ae = e.payload?.assistantMessageEvent
      // 只处理纯文本 delta，tool input_json_delta 等跳过
      if (ae?.type !== "text_delta") continue
      const delta: string = ae?.delta ?? ""
      if (msgIdx >= 0 && result[msgIdx]?.kind === "message") {
        (result[msgIdx] as any).text += delta
      } else {
        msgIdx = result.length
        result.push({ key: e.ts + msgIdx, kind: "message", ts: e.ts, text: delta })
      }
      continue
    }

    msgIdx = -1

    if (pt === "tool_execution_start") {
      const toolName: string = e.payload?.toolName ?? e.payload?.tool ?? e.payload?.name ?? "tool"
      result.push({ key: e.ts + toolName, kind: "tool", ts: e.ts, toolName, status: "running" })
      continue
    }

    if (pt === "tool_execution_end") {
      for (let j = result.length - 1; j >= 0; j--) {
        const d = result[j]
        if (d.kind === "tool" && d.status === "running") { d.status = "done"; break }
      }
      continue
    }

    result.push({ key: e.ts + pt, kind: "pi_other", ts: e.ts, piType: pt })
  }

  return result
}

function Events({ events }: { events: any[] }) {
  if (!events.length) return <div style={{ color: "#8b949e" }}>No events yet…</div>
  const display = collapseEvents(events)
  return (
    <div style={{ fontFamily: "monospace", fontSize: 12 }}>
      {display.map((e, i) => (
        <div key={i} style={{ borderBottom: "1px solid #161b22", padding: "4px 0", display: "flex", gap: 8, alignItems: "flex-start" }}>
          <span style={{ color: "#8b949e", flexShrink: 0 }}>{e.ts?.slice(11, 19)}</span>

          {e.kind === "hx" && (
            <>
              <span style={{ color: "#d29922", flexShrink: 0, minWidth: 80 }}>{e.hxType}</span>
              {e.msg && <span style={{ color: "#e6edf3" }}>{e.msg}</span>}
            </>
          )}

          {e.kind === "message" && (
            <>
              <span style={{ color: "#58a6ff", flexShrink: 0, minWidth: 80 }}>assistant</span>
              <span style={{ color: "#e6edf3", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{e.text}</span>
            </>
          )}

          {e.kind === "tool" && (
            <>
              <span style={{ color: "#bc8cff", flexShrink: 0, minWidth: 80 }}>tool</span>
              <span style={{ color: "#e6edf3" }}>{e.toolName}</span>
              <span style={{ color: e.status === "done" ? "#3fb950" : "#d29922", marginLeft: "auto" }}>
                {e.status === "done" ? "✓" : "…"}
              </span>
            </>
          )}

          {e.kind === "pi_other" && (
            <span style={{ color: "#58a6ff" }}>{e.piType}</span>
          )}
        </div>
      ))}
    </div>
  )
}

function Diff({ diff }: { diff: string }) {
  if (!diff) return <div style={{ color: "#8b949e" }}>No diff available.</div>
  const lines = diff.split("\n")
  return (
    <pre style={{ fontSize: 12, lineHeight: 1.5, overflow: "auto" }}>
      {lines.map((line, i) => {
        const color = line.startsWith("+") ? "#3fb950" : line.startsWith("-") ? "#f85149" : line.startsWith("@@") ? "#79c0ff" : "#e6edf3"
        return <div key={i} style={{ color }}>{line}</div>
      })}
    </pre>
  )
}

const STATUS_COLOR: Record<string, string> = {
  succeeded: "#3fb950", running: "#d29922", failed: "#f85149",
  system_error: "#f85149", timeout: "#db6d28", cancelled: "#8b949e",
}

const s = {
  topbar: { display: "flex", alignItems: "center", padding: "10px 16px", borderBottom: "1px solid #21262d", background: "#161b22" },
  back: { background: "none", border: "none", color: "#58a6ff", cursor: "pointer", fontSize: 13 },
  tabs: { display: "flex", borderBottom: "1px solid #21262d", background: "#161b22" },
  tab: { background: "none", border: "none", color: "#8b949e", cursor: "pointer", padding: "8px 16px", fontSize: 13 },
  tabActive: { color: "#e6edf3", borderBottom: "2px solid #f78166" },
}
