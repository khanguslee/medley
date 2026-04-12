import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useActivity } from '../context/ActivityContext'
import { getAuthUrl } from '../services/strava'
import { getStartOfPeriod, formatPeriodRange, type TimePeriod } from '../utils/dates'
import { aggregateHoursBySport } from '../utils/activities'

const PERIODS: { label: string; value: TimePeriod }[] = [
  { label: 'This week', value: 'week' },
  { label: 'This month', value: 'month' },
  { label: 'This year', value: 'year' },
  { label: 'All time', value: 'all' },
]

export default function Dashboard() {
  const { token, activities, loading } = useActivity()
  const [period, setPeriod] = useState<TimePeriod>('month')

  if (loading) {
    return (
      <div className="page">
        <p className="loading">Loading...</p>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="page">
        <h1>Medley</h1>
        <p>Connect your Strava account to see your dashboard.</p>
        <a href={getAuthUrl()} className="connect-btn">
          Connect with Strava
        </a>
      </div>
    )
  }

  const after = getStartOfPeriod(period)
  const chartData = aggregateHoursBySport(activities, after)
  const rangeLabel = formatPeriodRange(period)

  return (
    <div className="page dashboard">
      <h2>Hours by sport</h2>

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
                <Tooltip formatter={(value: number) => [`${value}h`, 'Hours']} />
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
