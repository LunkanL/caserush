import { useEffect, useState } from "react";
import api from "../api/api";
import Loading from "../components/Loading";
import ErrorMessage from "../components/ErrorMessage";

function ProfilePage() {
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [resetLoading, setResetLoading] = useState(false);
  const [caseStats, setCaseStats] = useState(null);

  async function fetchProfile() {
    try {
      const [userResponse, walletResponse, statsResponse, caseStatsResponse] =
        await Promise.all([
          api.get("/auth/me/"),
          api.get("/wallet/"),
          api.get("/games/profile-stats/"),
          api.get("/games/case-stats/"),
        ]);
      setUser(userResponse.data);
      setWallet(walletResponse.data);
      setStats(statsResponse.data);
      setCaseStats(caseStatsResponse.data);
    } catch (error) {
      setError("Could not load profile.");
    } finally {
      setLoading(false);
    }
  }

  async function resetDemoAccount() {
    const confirmed = window.confirm(
      "Reset this demo account? This will delete your bets and transactions."
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccessMessage("");
    setResetLoading(true);

    try {
      const response = await api.post("/wallet/reset-demo/");

      setSuccessMessage(response.data.message);

      const [walletResponse, statsResponse, caseStatsResponse] = await Promise.all([
        api.get("/wallet/"),
        api.get("/games/profile-stats/"),
        api.get("/games/case-stats/"),
      ]);

      setWallet(walletResponse.data);
      setStats(statsResponse.data);
      setCaseStats(caseStatsResponse.data);
    } catch (error) {
      setError(error.response?.data?.error || "Could not reset demo account.");
    } finally {
      setResetLoading(false);
    }
  }


  function formatRarity(rarity) {
    if (!rarity) {
      return "";
    }

    return rarity.charAt(0).toUpperCase() + rarity.slice(1);
  }

  function getNetResult() {
    const payout = Number(stats?.total_payout || 0);
    const wagered = Number(stats?.total_wagered || 0);

    return payout - wagered;
  }

  function getLossRate() {
    if (!stats?.total_bets) {
      return 0;
    }

    return 100 - Number(stats.win_rate || 0);
  }

  useEffect(() => {
    fetchProfile();
  }, []);

  return (
    <div className="page">
      <div className="card wide-card">
        <h1>Profile</h1>

        <p className="muted">
          Your demo account overview and coinflip statistics.
        </p>

        <ErrorMessage message={error} />

        {successMessage && <p className="success-message">{successMessage}</p>}

        {loading ? (
          <Loading text="Loading profile..." />
        ) : (
          <>
            <div className="profile-header">
              <div className="profile-avatar">
                {user?.username?.charAt(0).toUpperCase()}
              </div>

              <div>
                <h2>{user?.username}</h2>
                <p className="muted">{user?.email || "No email set"}</p>
              </div>
            </div>

            <div className="detail-grid">
              <div className="detail-box">
                <span>Balance</span>
                <strong>{wallet?.balance} coins</strong>
              </div>

              <div className="detail-box">
                <span>Total Bets</span>
                <strong>{stats?.total_bets}</strong>
              </div>

              <div className="detail-box">
                <span>Win Rate</span>
                <strong>{stats?.win_rate}%</strong>
              </div>

              <div className="detail-box">
                <span>Wins</span>
                <strong className="positive">{stats?.total_wins}</strong>
              </div>

              <div className="detail-box">
                <span>Losses</span>
                <strong className="negative">{stats?.total_losses}</strong>
              </div>

              <div className="detail-box">
                <span>Total Wagered</span>
                <strong>{stats?.total_wagered}</strong>
              </div>

              <div className="detail-box">
                <span>Total Payout</span>
                <strong>{stats?.total_payout}</strong>
              </div>

              <div className="detail-box">
                <span>Net Result</span>
                <strong className={getNetResult() >= 0 ? "positive" : "negative"}>
                  {getNetResult().toFixed(2)}
                </strong>
              </div>

              <div className="detail-box">
                <span>Currency</span>
                <strong>Demo coins</strong>
              </div>
            </div>

            <div className="stats-charts">
              <div className="chart-card">
                <div className="section-header">
                  <h2>Win / Loss Split</h2>
                  <span className="muted">{stats?.total_bets} bets</span>
                </div>

                <div className="split-bar">
                  <div
                    className="split-bar-win"
                    style={{ width: `${stats?.win_rate || 0}%` }}
                  ></div>

                  <div
                    className="split-bar-loss"
                    style={{ width: `${getLossRate()}%` }}
                  ></div>
                </div>

                <div className="chart-legend">
                  <span>
                    <strong className="positive">Wins:</strong>{" "}
                    {stats?.total_wins}
                  </span>

                  <span>
                    <strong className="negative">Losses:</strong>{" "}
                    {stats?.total_losses}
                  </span>
                </div>
              </div>

              <div className="chart-card">
                <div className="section-header">
                  <h2>Wagered vs Payout</h2>
                  <span
                    className={
                      getNetResult() >= 0 ? "positive" : "negative"
                    }
                  >
                    Net {getNetResult().toFixed(2)}
                  </span>
                </div>

                <div className="money-bars">
                  <div>
                    <div className="money-bar-label">
                      <span>Wagered</span>
                      <strong>{stats?.total_wagered}</strong>
                    </div>

                    <div className="money-bar-track">
                      <div
                        className="money-bar-fill wagered"
                        style={{
                          width: `${Math.min(
                            100,
                            Number(stats?.total_wagered || 0) /
                            Math.max(
                              Number(stats?.total_wagered || 0),
                              Number(stats?.total_payout || 0),
                              1
                            ) *
                            100
                          )
                            }%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="money-bar-label">
                      <span>Payout</span>
                      <strong>{stats?.total_payout}</strong>
                    </div>

                    <div className="money-bar-track">
                      <div
                        className="money-bar-fill payout"
                        style={{
                          width: `${Math.min(
                            100,
                            Number(stats?.total_payout || 0) /
                            Math.max(
                              Number(stats?.total_wagered || 0),
                              Number(stats?.total_payout || 0),
                              1
                            ) *
                            100
                          )
                            }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="case-stats-section">
              <div className="section-header">
                <div>
                  <h2>Case Opening Stats</h2>
                  <p className="muted">
                    Overview of your fake demo items and case openings.
                  </p>
                </div>
              </div>

              <div className="case-stats-grid">
                <div className="case-stat-card">
                  <span>Cases Opened</span>
                  <strong>{caseStats?.cases_opened || 0}</strong>
                </div>

                <div className="case-stat-card">
                  <span>Total Items</span>
                  <strong>{caseStats?.inventory_items || 0}</strong>
                </div>

                <div className="case-stat-card">
                  <span>Active Items</span>
                  <strong>{caseStats?.active_items || 0}</strong>
                </div>

                <div className="case-stat-card">
                  <span>Sold Items</span>
                  <strong>{caseStats?.sold_items || 0}</strong>
                </div>

                <div className="case-stat-card">
                  <span>Active Value</span>
                  <strong>{caseStats?.active_value || "0.00"}</strong>
                </div>

                <div className="case-stat-card">
                  <span>Sold Value</span>
                  <strong>{caseStats?.sold_value || "0.00"}</strong>
                </div>
              </div>

              <div className="case-profile-layout">
                <div className="case-best-card">
                  <h3>Best Unboxed Item</h3>

                  {caseStats?.best_item ? (
                    <>
                      <div className={`case-best-art rarity-${caseStats.best_item.rarity}`}>
                        <img
                          src={caseStats.best_item.image_path || "/items/default-item.png"}
                          alt={caseStats.best_item.name}
                        />
                      </div>

                      <h2>{caseStats.best_item.name}</h2>

                      <p className="muted">
                        {formatRarity(caseStats.best_item.rarity)} from{" "}
                        {caseStats.best_item.case_name || "Unknown Case"}
                      </p>

                      <strong>{caseStats.best_item.value} coins</strong>
                    </>
                  ) : (
                    <p className="muted">No case items yet.</p>
                  )}
                </div>

                <div className="case-rarity-card">
                  <h3>Rarity Breakdown</h3>

                  <div className="rarity-breakdown profile-rarity-breakdown">
                    <div className="rarity-chip rarity-common">
                      Common: {caseStats?.rarity_counts?.common || 0}
                    </div>

                    <div className="rarity-chip rarity-rare">
                      Rare: {caseStats?.rarity_counts?.rare || 0}
                    </div>

                    <div className="rarity-chip rarity-epic">
                      Epic: {caseStats?.rarity_counts?.epic || 0}
                    </div>

                    <div className="rarity-chip rarity-legendary">
                      Legendary: {caseStats?.rarity_counts?.legendary || 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="danger-zone">
              <div>
                <h2>Danger Zone</h2>
                <p className="muted">
                  Reset your demo balance to 1000 coins and delete your bet and
                  transaction history.
                </p>
              </div>

              <button
                className="danger-button"
                onClick={resetDemoAccount}
                disabled={resetLoading}
              >
                {resetLoading ? "Resetting..." : "Reset Demo Account"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;