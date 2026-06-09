import { useEffect, useState } from "react";
import api from "../api/api";
import Loading from "../components/Loading";
import ErrorMessage from "../components/ErrorMessage";



function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function fetchLeaderboard() {
    try {
      const response = await api.get("/wallet/leaderboard/");
      setLeaderboard(response.data);
    } catch (error) {
      setError("Could not load leaderboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  return (
    <div className="page">
      <div className="card wide-card">
        <h1>Leaderboard</h1>

        <p className="muted">
          Top demo players ranked by current wallet balance.
        </p>

        <ErrorMessage message={error} />

        {loading ? (
          <Loading text="Loading leaderboard..." />
        ) : leaderboard.length === 0 ? (
          <p>No players yet.</p>
        ) : (
          <div className="leaderboard-list">
            {leaderboard.map((player, index) => (
              <div className="leaderboard-item" key={player.id}>
                <div className="leaderboard-rank">#{index + 1}</div>

                <div className="leaderboard-user">
                  <strong>{player.username}</strong>
                  <span>Demo player</span>
                </div>

                <div className="leaderboard-balance">
                  <strong>{player.balance}</strong>
                  <span>coins</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default LeaderboardPage;