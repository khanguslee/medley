import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { exchangeCodeForToken } from "../services/strava";

export default function Callback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const hasExchanged = useRef(false);

  useEffect(() => {
    if (hasExchanged.current) return;
    hasExchanged.current = true;

    const code = searchParams.get("code");
    if (!code) {
      setError("No authorization code received from Strava.");
      return;
    }

    exchangeCodeForToken(code)
      .then(() => navigate("/", { replace: true }))
      .catch((err) => setError(err.message));
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="page callback-page">
        <p className="error">{error}</p>
        <a href="/">Back to Home</a>
      </div>
    );
  }

  return (
    <div className="page callback-page">
      <p className="loading">Connecting to Strava...</p>
    </div>
  );
}
