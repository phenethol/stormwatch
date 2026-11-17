import { useCallback, useEffect, useState } from 'react'

/** Loads a resource, optionally polling it; stale data stay available under an error. */
export function useResource<T>(load: (signal: AbortSignal) => Promise<T>, interval = 0) {
  const [record, setRecord] = useState<{ data?: T; error?: string; updated?: number }>({})
  const [refreshes, setRefreshes] = useState(0)
  const refresh = useCallback(() => setRefreshes(value => value + 1), [])
  useEffect(() => {
    let timer: number | undefined
    let controller: AbortController | undefined
    async function run() {
      controller?.abort()
      window.clearTimeout(timer)
      const next = new AbortController()
      controller = next
      try {
        const data = await load(next.signal)
        if (!next.signal.aborted) setRecord({ data, updated: Date.now() })
      } catch (cause) {
        if (!next.signal.aborted) setRecord(previous => ({ ...previous, error: cause instanceof Error ? cause.message : 'Dohvat nije uspio.' }))
      } finally {
        if (!next.signal.aborted && interval && !document.hidden) timer = window.setTimeout(run, interval)
      }
    }
    const wake = () => { if (!document.hidden) void run() }
    void run()
    if (interval) {
      document.addEventListener('visibilitychange', wake)
      window.addEventListener('online', wake)
    }
    return () => {
      controller?.abort()
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', wake)
      window.removeEventListener('online', wake)
    }
  }, [load, refreshes, interval])
  return { ...record, refresh }
}
