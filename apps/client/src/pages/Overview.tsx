import { useMemo, useState } from 'react';
import { useActivity } from '../context/ActivityContext';
import { buildHeatmapGrid, getAvailableYears } from '../utils/heatmap';
import HeatmapCalendar from '../components/HeatmapCalendar';

export default function Overview() {
  const { isAuthenticated, authUrl, activities, loading, loadedCount } = useActivity();
  const [sportFilter, setSportFilter] = useState<string | null>(null);
  const [year, setYear] = useState(() => new Date().getFullYear());

  // Derive unique sport types
  const sportTypes = useMemo(
    () => Array.from(new Set(activities.map((a) => a.sport_type))).sort(),
    [activities]
  );

  // Years that have activities, always includes current year
  const availableYears = useMemo(() => getAvailableYears(activities), [activities]);

  // Build full-year heatmap grid
  const grid = useMemo(
    () => buildHeatmapGrid(activities, sportFilter, year),
    [activities, sportFilter, year]
  );

  if (loading && loadedCount === 0) {
    return (
      <div className="page">
        <p className="loading">Connecting to Strava…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="page">
        <h1>Medley</h1>
        <p>Connect your Strava account to see your activity calendar.</p>
        <a href={authUrl ?? '#'} className="connect-btn">
          Connect with Strava
        </a>
      </div>
    );
  }

  return (
    <div className="page overview">
      <div className="overview-heading">
        <h2>Activity calendar</h2>
        <div className="overview-filters">
          <select
            className="sport-filter"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            className="sport-filter"
            value={sportFilter ?? ''}
            onChange={(e) => setSportFilter(e.target.value || null)}
          >
            <option value="">All sports</option>
            {sportTypes.map((sport) => (
              <option key={sport} value={sport}>
                {sport}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && activities.length > 0 && <span className="sync-badge">Syncing…</span>}

      <HeatmapCalendar grid={grid} />
    </div>
  );
}
