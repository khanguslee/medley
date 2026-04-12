import { getAuthUrl } from "../services/strava";
import { useActivity } from "../context/ActivityContext";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export default function Home() {
  const { token, activities, loading, error, disconnect, reload } = useActivity();

  if (loading) {
    return (
      <div className="page">
        <p className="loading">Loading...</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="page">
        <h1>Medley</h1>
        <p>Connect your Strava account to see your recent activities.</p>
        <a href={getAuthUrl()} className="connect-btn">
          Connect with Strava
        </a>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="header">
        <h1>Hi{token.athlete ? `, ${token.athlete.firstname}` : ''}!</h1>
        <button onClick={disconnect} className="disconnect-btn">
          Disconnect
        </button>
      </header>

      {error && (
        <div className="error">
          <p>{error}</p>
          <button onClick={reload}>Retry</button>
        </div>
      )}

      {activities.length === 0 && !error ? (
        <p>No recent activities found.</p>
      ) : (
        <ul className="activity-list">
          {activities.map((a) => (
            <li key={a.id} className="activity-card">
              <div className="activity-card-body">
                <strong className="activity-name">{a.name}</strong>
                <div className="activity-meta">
                  <span>{a.sport_type}</span>
                  <span>{(a.distance / 1000).toFixed(2)} km</span>
                  <span>{formatDuration(a.moving_time)}</span>
                  <span>{new Date(a.start_date).toLocaleDateString()}</span>
                </div>
              </div>
              <a
                href={`https://www.strava.com/activities/${a.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="strava-link"
              >
                View on Strava
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
