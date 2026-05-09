import { useState } from "react"
import { RunList } from "./views/RunList.tsx"
import { RunDetail } from "./views/RunDetail.tsx"

export function App() {
  const [selectedRun, setSelectedRun] = useState<string | null>(null)

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Nav */}
      <div style={s.nav}>
        <span onClick={() => setSelectedRun(null)} style={{ cursor: "pointer", fontWeight: 600 }}>
          hxflow
        </span>
        {selectedRun && (
          <span style={{ color: "#8b949e", marginLeft: 8 }}>/ {selectedRun}</span>
        )}
      </div>

      {/* Content */}
      {selectedRun ? (
        <RunDetail runId={selectedRun} onBack={() => setSelectedRun(null)} />
      ) : (
        <RunList onSelect={setSelectedRun} />
      )}
    </div>
  )
}

const s = {
  nav: {
    padding: "10px 16px",
    borderBottom: "1px solid #21262d",
    background: "#161b22",
    color: "#e6edf3",
  },
}
