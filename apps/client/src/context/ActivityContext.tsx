import { createContext, useContext, useEffect, useState } from 'react'
import {
  deleteStravaToken,
  fetchActivities,
  fetchAuthUrl,
  fetchMe,
  type StravaActivity,
  type StravaAthlete,
} from '../services/api'

export interface ActivityContextValue {
  athlete: StravaAthlete | null
  isAuthenticated: boolean
  authUrl: string | null
  activities: StravaActivity[]
  loading: boolean
  error: string | null
  disconnect: () => Promise<void>
  reload: () => Promise<void>
}

const ActivityContext = createContext<ActivityContextValue | null>(null)

export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const [athlete, setAthlete] = useState<StravaAthlete | null>(null)
  const [authUrl, setAuthUrl] = useState<string | null>(null)
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
      const [url, me] = await Promise.all([fetchAuthUrl(), fetchMe()])
      setAuthUrl(url)
      setAthlete(me)
      if (me && (force || activities.length === 0)) {
        const data = await fetchActivities()
        setActivities(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function disconnect() {
    await deleteStravaToken()
    setAthlete(null)
    setActivities([])
  }

  function reload(): Promise<void> {
    return loadData(true)
  }

  return (
    <ActivityContext.Provider
      value={{
        athlete,
        isAuthenticated: athlete !== null,
        authUrl,
        activities,
        loading,
        error,
        disconnect,
        reload,
      }}
    >
      {children}
    </ActivityContext.Provider>
  )
}

export function useActivity(): ActivityContextValue {
  const ctx = useContext(ActivityContext)
  if (!ctx) throw new Error('useActivity must be used within ActivityProvider')
  return ctx
}
