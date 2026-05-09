import { useRunList } from "../hooks/useRunList.ts"

const STATUS_COLOR: Record<string, string> = {
  succeeded: "#3fb950",
  running: "#d29922",
  failed: "#f85149",
  system_error: "#f85149",
  budget_exceeded: "#db6d28",
  timeout: "#db6d28",
  cancelled: "#8b949e",
}

function Badge({ status }: { status: string }) {
  return (
    <span style={{ color: STATUS_COLOR[status] ?? "#8b949e", minWidth: 120, display: "inline-block" }}>
      {status}
    </span>
  )
}

export function RunList({ onSelect }: { onSelect: (id: string) => void }) {
  const { runs, loading, error } = useRunList()

  if (loading) return <div style={s.pad}>Loading…</div>
  if (error) return <div style={{ ...s.pad, color: "#f85149" }}>Error: {error}</div>
  if (!runs.length) return <div style={s.pad}>No runs yet. Try: hx agent run --prompt "…"</div>

  return (
    <div>
      <div style={s.header}>
        <span style={{ minWidth: 120 }}>STATUS</span>
        <span style={{ flex: 1 }}>RUN ID</span>
        <span style={{ minWidth: 80, textAlign: "right" }}>COST</span>
        <span style={{ minWidth: 60, textAlign: "right" }}>DUR</span>
        <span style={{ minWidth: 200, marginLeft: 16 }}>CWD</span>
      </div>
      {runs.map((r) => (
        <div key={r.runId} style={s.row} onClick={() => onSelect(r.runId)}>
          <Badge status={r.status} />
          <span style={{ flex: 1, color: "#58a6ff", cursor: "pointer" }}>{r.runId}</span>
          <span style={{ minWidth: 80, textAlign: "right", color: "#8b949e" }}>
            {r.costUsd != null ? `$${r.costUsd.toFixed(4)}` : "—"}
          </span>
          <span style={{ minWidth: 60, textAlign: "right", color: "#8b949e" }}>
            {r.durationSec != null ? `${r.durationSec.toFixed(0)}s` : "—"}
          </span>
          <span style={{ minWidth: 200, marginLeft: 16, color: "#8b949e", overflow: "hidden", textOverflow: "ellipsis" }}>
            {r.cwd}
          </span>
        </div>
      ))}
    </div>
  )
}

const s = {
  pad: { padding: 16 },
  header: {
    display: "flex", padding: "8px 16px", borderBottom: "1px solid #21262d",
    color: "#8b949e", fontSize: 11, letterSpacing: "0.05em",
  },
  row: {
    display: "flex", padding: "8px 16px", borderBottom: "1px solid #161b22",
    cursor: "pointer", alignItems: "center",
    transition: "background 0.1s",
  },
}
