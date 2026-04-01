import { useEffect, useState } from "react";
import {
  getAuthUrl,
  getValidToken,
  clearToken,
  fetchActivities,
  type StravaToken,
  type StravaActivity,
} from "../services/strava";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export default function Home() {
  const [token, setToken] = useState<StravaToken | null>(null);
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const validToken = await getValidToken();
      setToken(validToken);
      if (validToken) {
        const data = await fetchActivities(validToken.access_token);
        setActivities(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleDisconnect() {
    clearToken();
    setToken(null);
    setActivities([]);
  }

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
        <h1>Hi, {token.athlete.firstname}</h1>
        <button onClick={handleDisconnect} className="disconnect-btn">
          Disconnect
        </button>
      </header>

      {error && (
        <div className="error">
          <p>{error}</p>
          <button onClick={loadData}>Retry</button>
        </div>
      )}

      {activities.length === 0 && !error ? (
        <p>No recent activities found.</p>
      ) : (
        <ul className="activity-list">
          {activities.map((a) => (
            <li key={a.id} className="activity-card">
              <strong className="activity-name">{a.name}</strong>
              <div className="activity-meta">
                <span>{a.sport_type}</span>
                <span>{(a.distance / 1000).toFixed(2)} km</span>
                <span>{formatDuration(a.moving_time)}</span>
                <span>{new Date(a.start_date).toLocaleDateString()}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
