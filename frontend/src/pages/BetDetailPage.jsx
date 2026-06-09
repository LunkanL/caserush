import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/api";
import Loading from "../components/Loading";
import ErrorMessage from "../components/ErrorMessage";
import { verifyBetResult } from "../utils/provablyFair";

function BetDetailPage() {
  const { id } = useParams();

  const [bet, setBet] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [verification, setVerification] = useState(null);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationError, setVerificationError] = useState("");

  async function fetchBet() {
    try {
      const response = await api.get(`/games/bets/${id}/`);
      setBet(response.data);
      setVerification(null);
      setVerificationError("");
    } catch (error) {
      setError("Could not load bet.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyResult() {
    if (!bet) {
      return;
    }

    setVerificationError("");
    setVerificationLoading(true);

    try {
      const result = await verifyBetResult(bet);
      setVerification(result);
    } catch (error) {
      setVerificationError(
        "Could not verify this bet in your browser."
      );
    } finally {
      setVerificationLoading(false);
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

  function formatChoice(value) {
    if (value === "ct") return "CT";
    if (value === "t") return "T";
    if (value === "green") return "Green";
    if (value === "heads") return "Heads";
    if (value === "tails") return "Tails";

    return value;
  }

  function formatRarity(rarity) {
    if (!rarity) {
      return "";
    }

    return rarity.charAt(0).toUpperCase() + rarity.slice(1);
  }

  function renderGameSpecificDetails() {
    if (!bet) {
      return null;
    }

    if (bet.game_type === "coinflip") {
      return (
        <div className="game-detail-card coinflip-detail-card">
          <h2>Coinflip Details</h2>

          <div className="detail-grid">
            <div className="detail-box">
              <span>You Picked</span>
              <strong>{formatChoice(bet.choice)}</strong>
            </div>

            <div className="detail-box">
              <span>Coin Landed On</span>
              <strong>{formatChoice(bet.result)}</strong>
            </div>

            <div className="detail-box">
              <span>Multiplier</span>
              <strong>{bet.metadata?.payout_multiplier || "1.90"}x</strong>
            </div>
          </div>
        </div>
      );
    }

    if (bet.game_type === "roulette") {
      return (
        <div className="game-detail-card roulette-detail-card">
          <h2>Roulette Details</h2>

          <div className="detail-grid">
            <div className="detail-box">
              <span>You Picked</span>
              <strong>{formatChoice(bet.choice)}</strong>
            </div>

            <div className="detail-box">
              <span>Result</span>
              <strong>{formatChoice(bet.result)}</strong>
            </div>

            <div className="detail-box">
              <span>Slot</span>
              <strong>#{bet.metadata?.slot}</strong>
            </div>

            <div className="detail-box">
              <span>Multiplier</span>
              <strong>{bet.metadata?.payout_multiplier}x</strong>
            </div>

            <div className="detail-box">
              <span>Rules</span>
              <strong>
                CT 2x / T 2x / Green 14x
              </strong>
            </div>
          </div>
        </div>
      );
    }

    if (bet.game_type === "case_opening") {
      return (
        <div className={`game-detail-card case-detail-card rarity-${bet.metadata?.rarity}`}>
          <h2>Case Opening Details</h2>

          <div className="case-detail-hero">
            <div className="case-detail-art">
              <img
                src={bet.metadata?.image_path || "/items/default-item.png"}
                alt={bet.metadata?.item_name || bet.result}
              />
            </div>

            <div>
              <p className="muted">You unboxed</p>
              <h1>{bet.metadata?.item_name || bet.result}</h1>
              <p>
                <strong>{formatRarity(bet.metadata?.rarity)}</strong> item from{" "}
                <strong>{bet.metadata?.case_name || bet.choice}</strong>
              </p>
            </div>
          </div>

          <div className="detail-grid">
            <div className="detail-box">
              <span>Case</span>
              <strong>{bet.metadata?.case_name || bet.choice}</strong>
            </div>

            <div className="detail-box">
              <span>Case Price</span>
              <strong>{bet.metadata?.case_price}</strong>
            </div>

            <div className="detail-box">
              <span>Item</span>
              <strong>{bet.metadata?.item_name || bet.result}</strong>
            </div>

            <div className="detail-box">
              <span>Rarity</span>
              <strong>{formatRarity(bet.metadata?.rarity)}</strong>
            </div>

            <div className="detail-box">
              <span>Item Value</span>
              <strong>{bet.metadata?.item_value}</strong>
            </div>

            <div className="detail-box">
              <span>Profit</span>
              <strong
                className={
                  Number(bet.metadata?.profit || 0) >= 0
                    ? "positive"
                    : "negative"
                }
              >
                {bet.metadata?.profit}
              </strong>
            </div>
          </div>

          <Link className="inline-action-link" to="/inventory">
            View Inventory
          </Link>
        </div>
      );
    }

    return null;
  }

  useEffect(() => {
    fetchBet();
  }, [id]);

  return (
    <div className="page">
      <div className="card wide-card bet-detail-page-card">
        <h1>Bet Detail</h1>

        <p className="muted">
          Detailed information about this demo game result.
        </p>

        <ErrorMessage message={error} />

        {loading ? (
          <Loading text="Loading bet..." />
        ) : !bet ? (
          <p>Bet not found.</p>
        ) : (
          <>
            <div className="detail-grid">
              <div className="detail-box">
                <span>Status</span>
                <strong className={bet.won ? "positive" : "negative"}>
                  {bet.won ? "Won" : "Lost"}
                </strong>
              </div>

              <div className="detail-box">
                <span>Game</span>
                <strong>{formatGameName(bet.game_type)}</strong>
              </div>

              <div className="detail-box">
                <span>Amount</span>
                <strong>{bet.amount}</strong>
              </div>

              <div className="detail-box">
                <span>Payout / Value</span>
                <strong>{bet.payout}</strong>
              </div>

              <div className="detail-box">
                <span>Date</span>
                <strong>{formatDate(bet.created_at)}</strong>
              </div>
            </div>

            {renderGameSpecificDetails()}

            <div className="game-detail-card">
              <h2>Provably Fair Data</h2>

              <p className="muted">
                These values can be used to verify how the demo result was generated.
              </p>

              <div className="proof-grid">
                <div>
                  <span>Server Seed Hash</span>
                  <code>{bet.server_seed_hash}</code>
                </div>

                <div>
                  <span>Server Seed</span>
                  <code>{bet.server_seed}</code>
                </div>

                <div>
                  <span>Client Seed</span>
                  <code>{bet.client_seed}</code>
                </div>

                <div>
                  <span>Nonce</span>
                  <code>{bet.nonce}</code>
                </div>
              </div>
            </div>

            <div className="game-detail-card verify-card">
              <div className="section-header">
                <div>
                  <h2>Verify Result</h2>
                  <p className="muted">
                    Recalculate the result in your browser using the server seed,
                    client seed and nonce.
                  </p>
                </div>

                <button
                  className="small-action-button"
                  onClick={handleVerifyResult}
                  disabled={verificationLoading}
                >
                  {verificationLoading ? "Verifying..." : "Verify Result"}
                </button>
              </div>

              {verificationError && <p className="error">{verificationError}</p>}

              {verification && !verification.supported && (
                <div className="verification-result warning">
                  <h3>Partial verification only</h3>

                  <p>
                    Server seed hash verification is supported for this bet, but full
                    game-result verification is not available yet for{" "}
                    <strong>{verification.gameType}</strong>.
                  </p>
                </div>
              )}

              {verification && (
                <>
                  <div className="verification-grid">
                    <div className="verification-box">
                      <span>Server Seed Hash</span>

                      <strong
                        className={
                          verification.serverSeedHashMatches ? "positive" : "negative"
                        }
                      >
                        {verification.serverSeedHashMatches ? "Matches" : "Mismatch"}
                      </strong>
                    </div>

                    <div className="verification-box">
                      <span>Result Check</span>

                      <strong
                        className={verification.resultMatches ? "positive" : "negative"}
                      >
                        {verification.supported
                          ? verification.resultMatches
                            ? "Matches"
                            : "Mismatch"
                          : "Not supported"}
                      </strong>
                    </div>

                    <div className="verification-box">
                      <span>Expected Result</span>
                      <strong>{formatChoice(verification.expectedResult)}</strong>
                    </div>

                    <div className="verification-box">
                      <span>Calculated Result</span>
                      <strong>
                        {verification.gameType === "case_opening"
                          ? verification.calculatedResult || "-"
                          : verification.calculatedLabel ||
                          formatChoice(verification.calculatedResult) ||
                          "-"}
                      </strong>
                    </div>

                    {verification.gameType === "roulette" && (
                      <>
                        <div className="verification-box">
                          <span>Expected Slot</span>
                          <strong>#{verification.expectedSlot}</strong>
                        </div>

                        <div className="verification-box">
                          <span>Calculated Slot</span>
                          <strong>#{verification.calculatedSlot}</strong>
                        </div>
                      </>
                    )}

                    {verification.gameType === "case_opening" && verification.supported && (
                      <>
                        <div className="verification-box">
                          <span>Roll</span>
                          <strong>{verification.calculatedRoll}</strong>
                        </div>

                        <div className="verification-box">
                          <span>Total Weight</span>
                          <strong>{verification.totalWeight}</strong>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="verification-proof">
                    <h3>Calculation</h3>

                    <p>
                      Message:
                      <br />
                      <code>{verification.message || "-"}</code>
                    </p>

                    <p>
                      HMAC SHA-256 digest:
                      <br />
                      <code>{verification.digest || "-"}</code>
                    </p>

                    <p>
                      Recalculated server seed hash:
                      <br />
                      <code>{verification.serverSeedHash}</code>
                    </p>
                    {verification.gameType === "case_opening" &&
                      verification.supported &&
                      verification.calculatedItem && (
                        <p>
                          Calculated item:
                          <br />
                          <code>
                            {verification.calculatedItem.name} ·{" "}
                            {verification.calculatedItem.rarity} · weight{" "}
                            {verification.calculatedItem.weight}
                          </code>
                        </p>
                      )}
                  </div>
                </>
              )}
            </div>
            <div className="game-detail-card">
              <h2>Raw Metadata</h2>

              <pre>{JSON.stringify(bet.metadata, null, 2)}</pre>
            </div>

            <Link className="inline-action-link" to="/bets">
              Back to Bet History
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default BetDetailPage;