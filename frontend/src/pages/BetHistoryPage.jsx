import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";
import Loading from "../components/Loading";
import ErrorMessage from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";

function BetHistoryPage() {
  const [bets, setBets] = useState([]);
  const [resultFilter, setResultFilter] = useState("all");
  const [gameFilter, setGameFilter] = useState("all");

  const [page, setPage] = useState(1);
  const [nextPage, setNextPage] = useState(null);
  const [previousPage, setPreviousPage] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchBets(selectedPage = 1) {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      params.set("page", selectedPage);

      if (resultFilter !== "all") {
        params.set("result", resultFilter);
      }

      if (gameFilter !== "all") {
        params.set("game_type", gameFilter);
      }

      const response = await api.get(`/games/bets/?${params.toString()}`);

      setBets(response.data.results || response.data);
      setNextPage(response.data.next);
      setPreviousPage(response.data.previous);
      setPage(selectedPage);
    } catch (error) {
      setError("Could not load bet history.");
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleString();
  }

  function formatGameName(gameType) {
    if (gameType === "coinflip") return "Coinflip";
    if (gameType === "roulette") return "Roulette";
    if (gameType === "case_opening") return "Case Opening";

    return gameType;
  }

  function getResultLabel(bet) {
    if (bet.game_type === "case_opening") {
      return bet.metadata?.rarity || "item";
    }

    return bet.result;
  }

  useEffect(() => {
    fetchBets(1);
  }, [resultFilter, gameFilter]);

  return (
    <div className="page">
      <div className="card wide-card">
        <h1>Bet History</h1>

        <p className="muted">
          View your demo betting history across all games.
        </p>

        <ErrorMessage message={error} />

        <div className="filter-section">
          <div>
            <p className="filter-label">Result</p>

            <div className="filter-bar">
              <button
                className={resultFilter === "all" ? "active" : ""}
                onClick={() => setResultFilter("all")}
              >
                All
              </button>

              <button
                className={resultFilter === "won" ? "active" : ""}
                onClick={() => setResultFilter("won")}
              >
                Won
              </button>

              <button
                className={resultFilter === "lost" ? "active" : ""}
                onClick={() => setResultFilter("lost")}
              >
                Lost
              </button>
            </div>
          </div>

          <div>
            <p className="filter-label">Game</p>

            <div className="filter-bar">
              <button
                className={gameFilter === "all" ? "active" : ""}
                onClick={() => setGameFilter("all")}
              >
                All Games
              </button>

              <button
                className={gameFilter === "coinflip" ? "active" : ""}
                onClick={() => setGameFilter("coinflip")}
              >
                Coinflip
              </button>

              <button
                className={gameFilter === "roulette" ? "active" : ""}
                onClick={() => setGameFilter("roulette")}
              >
                Roulette
              </button>

              <button
                className={gameFilter === "case_opening" ? "active" : ""}
                onClick={() => setGameFilter("case_opening")}
              >
                Case Opening
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <Loading text="Loading bets..." />
        ) : bets.length === 0 ? (
          <EmptyState
            title="No bets found"
            description="Try changing the filters or play one of the demo games."
          />
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Game</th>
                    <th>Choice</th>
                    <th>Result</th>
                    <th>Amount</th>
                    <th>Payout/Value</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Details</th>
                  </tr>
                </thead>

                <tbody>
                  {bets.map((bet) => (
                    <tr key={bet.id}>
                      <td>#{bet.id}</td>
                      <td>{formatGameName(bet.game_type)}</td>
                      <td>{bet.choice}</td>
                      <td>{getResultLabel(bet)}</td>
                      <td>{bet.amount}</td>
                      <td>{bet.payout}</td>
                      <td className={bet.won ? "positive" : "negative"}>
                        {bet.won ? "Won" : "Lost"}
                      </td>
                      <td>{formatDate(bet.created_at)}</td>
                      <td>
                        <Link to={`/bets/${bet.id}`}>Open</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <button
                onClick={() => fetchBets(page - 1)}
                disabled={!previousPage}
              >
                Previous
              </button>

              <span>Page {page}</span>

              <button onClick={() => fetchBets(page + 1)} disabled={!nextPage}>
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default BetHistoryPage;