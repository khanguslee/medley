import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { exchangeCode } from "../services/api";
import { useActivity } from "../context/ActivityContext";

export default function Callback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { reload } = useActivity();
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

    exchangeCode(code)
      .then(() => reload())
      .then(() => navigate("/", { replace: true }))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [searchParams, navigate, reload]);

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
