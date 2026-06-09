import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";

function DashboardPage() {
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [bets, setBets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState("");
  const [bonusMessage, setBonusMessage] = useState("");
  const [bonusLoading, setBonusLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activityFeed, setActivityFeed] = useState([]);

  async function fetchDashboard({ silent = false } = {}) {
    try {
      const [
        userResponse,
        walletResponse,
        betsResponse,
        transactionsResponse,
        activityFeedResponse,
      ] = await Promise.all([
        api.get("/auth/me/"),
        api.get("/wallet/"),
        api.get("/games/bets/"),
        api.get("/wallet/transactions/"),
        api.get("/games/activity-feed/"),
      ]);

      setUser(userResponse.data);
      setWallet(walletResponse.data);

      setBets((betsResponse.data.results || betsResponse.data).slice(0, 5));

      setTransactions(
        (transactionsResponse.data.results || transactionsResponse.data).slice(
          0,
          5
        )
      );

      setActivityFeed(activityFeedResponse.data.results || activityFeedResponse.data);

      setLastUpdated(new Date());

      if (!silent) {
        setError("");
      }
    } catch (error) {
      if (!silent) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";
      }
    }
  }

  async function claimDailyBonus() {
    setError("");
    setBonusMessage("");
    setBonusLoading(true);

    try {
      const response = await api.post("/wallet/daily-bonus/");

      setWallet({
        ...wallet,
        balance: response.data.balance,
        last_daily_bonus_claimed_at: response.data.last_daily_bonus_claimed_at,
      });

      setBonusMessage(`Daily bonus claimed: +${response.data.amount} coins`);

      await fetchDashboard({ silent: true });
    } catch (error) {
      setError(error.response?.data?.error || "Could not claim daily bonus.");
    } finally {
      setBonusLoading(false);
    }
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleString();
  }

  function formatTime(date) {
    if (!date) {
      return "Not updated yet";
    }

    return date.toLocaleTimeString();
  }

  function formatGameName(gameType) {
    if (gameType === "coinflip") return "Coinflip";
    if (gameType === "roulette") return "Roulette";
    if (gameType === "case_opening") return "Case Opening";

    return gameType;
  }

  function getActivityText(activity) {
    if (activity.game_type === "case_opening") {
      return `${activity.username} unboxed ${activity.result}`;
    }

    if (activity.won) {
      return `${activity.username} won ${activity.payout} coins`;
    }

    return `${activity.username} lost ${activity.amount} coins`;
  }

  function getActivityMeta(activity) {
    if (activity.game_type === "case_opening") {
      return `${activity.choice} · ${activity.metadata?.rarity || "item"}`;
    }

    return `${formatGameName(activity.game_type)} · picked ${activity.choice}, result ${activity.result}`;
  }

  function getGameStats(gameType) {
    const gameActivities = activityFeed.filter(
      (activity) => activity.game_type === gameType
    );

    const wins = gameActivities.filter((activity) => activity.won).length;
    const losses = gameActivities.filter((activity) => !activity.won).length;

    return {
      total: gameActivities.length,
      wins,
      losses,
    };
  }

  function getGameCardDescription(gameType) {
    if (gameType === "coinflip") {
      return "Classic heads or tails demo betting.";
    }

    if (gameType === "roulette") {
      return "CT/T/Green roulette with 14x green payout.";
    }

    if (gameType === "case_opening") {
      return "Open fake demo cases and collect items.";
    }

    if (gameType === "inventory") {
      return "View and sell your demo items.";
    }

    return "";
  }

  function hasClaimedToday() {
    if (!wallet?.last_daily_bonus_claimed_at) {
      return false;
    }

    const lastClaim = new Date(wallet.last_daily_bonus_claimed_at);
    const today = new Date();

    return lastClaim.toDateString() === today.toDateString();
  }

  useEffect(() => {
    fetchDashboard();

    const intervalId = setInterval(() => {
      fetchDashboard({ silent: true });
    }, 10000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="page">
      <div className="dashboard-container">
        <div className="card dashboard-card">
          <div className="dashboard-title-row">
            <div>
              <h1>Dashboard</h1>

              <p className="muted">
                Demo project only. No real money, no skins, no deposits, no
                withdrawals.
              </p>
            </div>

            <div className="live-badge">
              <span></span>
              Live
            </div>
          </div>

          <p className="muted small-text">
            Last updated: {formatTime(lastUpdated)}
          </p>

          {error && <p className="error">{error}</p>}

          {bonusMessage && <p className="success-message">{bonusMessage}</p>}

          {!user || !wallet ? (
            <p>Loading...</p>
          ) : (
            <>
              <div className="stats-grid">
                <div className="stat-box">
                  <span>User</span>
                  <strong>{user.username}</strong>
                </div>

                <div className="stat-box">
                  <span>Balance</span>
                  <strong>{wallet.balance} coins</strong>
                </div>
              </div>

              <div className="bonus-card">
                <div>
                  <h2>Daily Bonus</h2>
                  <p className="muted">Claim 250 demo coins once per day.</p>
                </div>

                <button
                  onClick={claimDailyBonus}
                  disabled={bonusLoading || hasClaimedToday()}
                >
                  {bonusLoading
                    ? "Claiming..."
                    : hasClaimedToday()
                      ? "Already Claimed"
                      : "Claim +250"}
                </button>
              </div>

              <div className="actions">
                <Link to="/profile">Profile</Link>
                <Link to="/leaderboard">Leaderboard</Link>
                <Link to="/transactions">Transactions</Link>
                <Link to="/bets">Bet History</Link>
              </div>
              <div className="game-cards-grid">
                <Link className="game-card coinflip-game-card" to="/coinflip">
                  <div className="game-card-icon">H/T</div>

                  <div>
                    <h2>Coinflip</h2>
                    <p>{getGameCardDescription("coinflip")}</p>
                  </div>

                  <div className="game-card-stats">
                    <span>{getGameStats("coinflip").total} recent</span>
                    <span className="positive">{getGameStats("coinflip").wins} wins</span>
                    <span className="negative">{getGameStats("coinflip").losses} losses</span>
                  </div>
                </Link>

                <Link className="game-card roulette-game-card" to="/roulette">
                  <div className="game-card-icon">CT</div>

                  <div>
                    <h2>Roulette</h2>
                    <p>{getGameCardDescription("roulette")}</p>
                  </div>

                  <div className="game-card-stats">
                    <span>{getGameStats("roulette").total} recent</span>
                    <span className="positive">{getGameStats("roulette").wins} wins</span>
                    <span className="negative">{getGameStats("roulette").losses} losses</span>
                  </div>
                </Link>

                <Link className="game-card cases-game-card" to="/cases">
                  <div className="game-card-icon">◆</div>

                  <div>
                    <h2>Cases</h2>
                    <p>{getGameCardDescription("case_opening")}</p>
                  </div>

                  <div className="game-card-stats">
                    <span>{getGameStats("case_opening").total} recent</span>
                    <span className="positive">{getGameStats("case_opening").wins} profit</span>
                    <span className="negative">{getGameStats("case_opening").losses} loss</span>
                  </div>
                </Link>

                <Link className="game-card inventory-game-card" to="/inventory">
                  <div className="game-card-icon">INV</div>

                  <div>
                    <h2>Inventory</h2>
                    <p>{getGameCardDescription("inventory")}</p>
                  </div>

                  <div className="game-card-stats">
                    <span>Fake items</span>
                    <span>Sell for coins</span>
                    <span>Demo only</span>
                  </div>
                </Link>
              </div>
            </>
          )}
        </div>

        <div className="dashboard-grid">
          <div className="card dashboard-list-card">
            <div className="section-header">
              <h2>Latest Bets</h2>
              <Link to="/bets">View all</Link>
            </div>

            {bets.length === 0 ? (
              <p>No bets yet.</p>
            ) : (
              <div className="mini-list">
                {bets.map((bet) => (
                  <div className="mini-list-item" key={bet.id}>
                    <div>
                      <strong className={bet.won ? "positive" : "negative"}>
                        {bet.won ? "Won" : "Lost"}
                      </strong>
                      <p>
                        {bet.game_type}: picked {bet.choice}, result {bet.result}
                      </p>
                    </div>

                    <div className="mini-list-right">
                      <strong>{bet.amount}</strong>
                      <span>{formatDate(bet.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>



          <div className="card dashboard-list-card">
            <div className="section-header">
              <h2>Latest Transactions</h2>
              <Link to="/transactions">View all</Link>
            </div>

            {transactions.length === 0 ? (
              <p>No transactions yet.</p>
            ) : (
              <div className="mini-list">
                {transactions.map((transaction) => (
                  <div className="mini-list-item" key={transaction.id}>
                    <div>
                      <strong>{transaction.transaction_type}</strong>
                      <p>{transaction.description}</p>
                    </div>

                    <div className="mini-list-right">
                      <strong
                        className={
                          Number(transaction.amount) >= 0
                            ? "positive"
                            : "negative"
                        }
                      >
                        {transaction.amount}
                      </strong>
                      <span>{formatDate(transaction.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        <div className="card dashboard-list-card global-feed-card">
          <div className="section-header">
            <h2>Global Activity Feed</h2>
            <span className="muted">Latest activity from all demo players</span>
          </div>

          {activityFeed.length === 0 ? (
            <p>No global activity yet.</p>
          ) : (
            <div className="activity-feed">
              {activityFeed.map((activity) => (
                <div className="activity-feed-item" key={activity.id}>
                  <div className="activity-icon">
                    {activity.game_type === "case_opening"
                      ? "◆"
                      : activity.won
                        ? "↑"
                        : "↓"}
                  </div>

                  <div>
                    <strong className={activity.won ? "positive" : "negative"}>
                      {getActivityText(activity)}
                    </strong>

                    <p>{getActivityMeta(activity)}</p>
                  </div>

                  <span>{formatDate(activity.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;