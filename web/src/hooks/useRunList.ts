import { useEffect, useState } from "react"
import { fetchRuns } from "../lib/api.ts"

export function useRunList(limit = 50) {
  const [runs, setRuns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = () =>
    fetchRuns(limit)
      .then(setRuns)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))

  useEffect(() => {
    load()
    const id = setInterval(load, 5000)
    return () => clearInterval(id)
  }, [limit])

  return { runs, loading, error, reload: load }
}
