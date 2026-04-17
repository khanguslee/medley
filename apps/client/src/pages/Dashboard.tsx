import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useActivity } from '../context/ActivityContext'
import { getStartOfPeriod, formatPeriodRange, toDateInputValue, type TimePeriod, type CustomRange } from '../utils/dates'
import { aggregateHoursBySport } from '../utils/activities'

const PERIODS: { label: string; value: TimePeriod }[] = [
  { label: 'This week', value: 'week' },
  { label: 'This month', value: 'month' },
  { label: 'This year', value: 'year' },
  { label: 'All time', value: 'all' },
  { label: 'Custom', value: 'custom' },
]

function defaultCustomStart(): string {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return toDateInputValue(d)
}

function defaultCustomEnd(): string {
  return toDateInputValue(new Date())
}

export default function Dashboard() {
  const { isAuthenticated, authUrl, activities, loading, loadedCount } = useActivity()
  const [period, setPeriod] = useState<TimePeriod>('month')
  const [customStart, setCustomStart] = useState<string>(defaultCustomStart)
  const [customEnd, setCustomEnd] = useState<string>(defaultCustomEnd)

  if (loading && loadedCount === 0) {
    return (
      <div className="page">
        <p className="loading">Connecting to Strava…</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="page">
        <h1>Medley</h1>
        <p>Connect your Strava account to see your dashboard.</p>
        <a href={authUrl ?? '#'} className="connect-btn">
          Connect with Strava
        </a>
      </div>
    )
  }

  let after: Date | null
  let before: Date | null = null
  let customRange: CustomRange | undefined

  if (period === 'custom') {
    const parsedStart = customStart ? new Date(`${customStart}T00:00:00`) : null
    const parsedEnd = customEnd ? new Date(`${customEnd}T23:59:59`) : null
    after = parsedStart && !isNaN(parsedStart.getTime()) ? parsedStart : null
    before = parsedEnd && !isNaN(parsedEnd.getTime()) ? parsedEnd : null
    if (after && before) {
      customRange = { start: after, end: before }
    }
  } else {
    after = getStartOfPeriod(period)
  }

  const chartData = aggregateHoursBySport(activities, after, before)
  const rangeLabel = formatPeriodRange(period, new Date(), customRange)

  return (
    <div className="page dashboard">
      <h2>Hours by sport</h2>

      {loading && loadedCount > 0 && (
        <p className="loading">Loaded {loadedCount} activities…</p>
      )}

      <div className="time-filters">
        {PERIODS.map(({ label, value }) => (
          <button
            key={value}
            className={period === value ? 'active' : ''}
            onClick={() => setPeriod(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {period === 'custom' && (
        <div className="custom-range">
          <label>
            From
            <input
              type="date"
              value={customStart}
              max={customEnd}
              onChange={e => setCustomStart(e.target.value)}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={customEnd}
              min={customStart}
              onChange={e => setCustomEnd(e.target.value)}
            />
          </label>
        </div>
      )}

      {rangeLabel && <p className="period-range">{rangeLabel}</p>}

      {chartData.length === 0 ? (
        <p className="no-activities">No activities for this period.</p>
      ) : (
        <>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
                <XAxis dataKey="sport" tick={{ fontSize: 13 }} />
                <YAxis unit="h" tick={{ fontSize: 13 }} />
                <Tooltip formatter={(value) => [`${value}h`, 'Hours']} />
                <Bar dataKey="hours" fill="#aa3bff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <ul className="summary-list">
            {chartData.map(({ sport, hours }) => (
              <li key={sport} className="summary-item">
                <span className="summary-sport">{sport}</span>
                <span className="summary-hours">{hours}h</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
