import { createContext, useContext, useEffect, useState } from 'react'
import {
  getValidToken,
  clearToken,
  fetchAllActivities,
  type StravaToken,
  type StravaActivity,
} from '../services/strava'

interface ActivityContextValue {
  token: StravaToken | null
  activities: StravaActivity[]
  loading: boolean
  error: string | null
  disconnect: () => void
  reload: () => void
}

const ActivityContext = createContext<ActivityContextValue | null>(null)

export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<StravaToken | null>(null)
  const [activities, setActivities] = useState<StravaActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void loadData()
  }, [])

  async function loadData(force = false) {
    setLoading(true)
    setError(null)
    try {
      const validToken = await getValidToken()
      setToken(validToken)
      if (validToken && (force || activities.length === 0)) {
        const data = await fetchAllActivities(validToken.access_token)
        setActivities(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function disconnect() {
    clearToken()
    setToken(null)
    setActivities([])
  }

  function reload() {
    void loadData(true)
  }

  return (
    <ActivityContext.Provider value={{ token, activities, loading, error, disconnect, reload }}>
      {children}
    </ActivityContext.Provider>
  )
}

export function useActivity(): ActivityContextValue {
  const ctx = useContext(ActivityContext)
  if (!ctx) throw new Error('useActivity must be used within ActivityProvider')
  return ctx
}
