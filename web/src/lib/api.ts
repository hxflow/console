// Token stored in sessionStorage after first auth via ?token= query param
function getToken(): string {
  const params = new URLSearchParams(window.location.search)
  const qToken = params.get("token")
  if (qToken) {
    sessionStorage.setItem("hx_token", qToken)
    // Remove token from URL
    params.delete("token")
    const newUrl = `${window.location.pathname}${params.toString() ? "?" + params.toString() : ""}`
    window.history.replaceState({}, "", newUrl)
    return qToken
  }
  return sessionStorage.getItem("hx_token") ?? ""
}

function headers(): HeadersInit {
  return { Authorization: `Bearer ${getToken()}` }
}

export async function fetchRuns(limit = 50) {
  const r = await fetch(`/api/runs?limit=${limit}`, { headers: headers() })
  if (!r.ok) throw new Error(`${r.status}`)
  return r.json()
}

export async function fetchRun(id: string) {
  const r = await fetch(`/api/runs/${id}`, { headers: headers() })
  if (!r.ok) throw new Error(`${r.status}`)
  return r.json()
}

export async function fetchDiff(id: string): Promise<string> {
  const r = await fetch(`/api/runs/${id}/diff`, { headers: headers() })
  if (!r.ok) return ""
  return r.text()
}

export function openStream(id: string, onEvent: (entry: unknown) => void, onClose: () => void) {
  const token = getToken()
  const es = new EventSource(`/api/runs/${id}/stream?token=${token}`)
  es.onmessage = (e) => { try { onEvent(JSON.parse(e.data)) } catch {} }
  es.onerror = () => { es.close(); onClose() }
  return () => es.close()
}
