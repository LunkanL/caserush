import { useEffect, useState } from "react";
import api from "../api/api";
import { playLossSound, playWinSound } from "../utils/sound";

function CoinflipPage() {
  const [wallet, setWallet] = useState(null);
  const [choice, setChoice] = useState("heads");
  const [amount, setAmount] = useState("100.00");
  const [clientSeed, setClientSeed] = useState("my-seed");

  const [lastBet, setLastBet] = useState(null);
  const [pendingBet, setPendingBet] = useState(null);

  const [coinSide, setCoinSide] = useState("heads");
  const [isFlipping, setIsFlipping] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function fetchWallet() {
    try {
      const response = await api.get("/wallet/");
      setWallet(response.data);
    } catch (error) {
      setError("Could not load wallet.");
    }
  }

  function wait(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  async function placeBet(event) {
    event.preventDefault();

    if (loading || isFlipping) {
      return;
    }

    setError("");
    setLastBet(null);
    setPendingBet(null);
    setLoading(true);
    setIsFlipping(true);

    try {
      const response = await api.post("/games/coinflip/bet/", {
        choice,
        amount,
        client_seed: clientSeed,
      });

      const bet = response.data.bet;

      setPendingBet(bet);

      // Minimum animation time so the flip feels intentional.
      await wait(1400);

      setCoinSide(bet.result);
      setLastBet(bet);

      if (bet.won) {
        playWinSound();
      } else {
        playLossSound();
      }

      setWallet({
        ...wallet,
        balance: response.data.balance,
      });
    } catch (error) {
      const data = error.response?.data;

      setError(
        data?.error ||
          data?.amount?.[0] ||
          data?.choice?.[0] ||
          data?.client_seed?.[0] ||
          "Could not place bet."
      );
    } finally {
      setLoading(false);
      setIsFlipping(false);
      setPendingBet(null);
    }
  }

  useEffect(() => {
    fetchWallet();
  }, []);

  return (
    <div className="page">
      <div className="card coinflip-card">
        <h1>Coinflip</h1>

        <p className="muted">
          Pick a side, place your demo bet and watch the coin flip.
        </p>

        {wallet ? (
          <p>
            Balance: <strong>{wallet.balance}</strong> demo coins
          </p>
        ) : (
          <p>Loading wallet...</p>
        )}

        {error && <p className="error">{error}</p>}

        <div className="coin-stage">
          <div
            className={
              isFlipping
                ? "coin flipping"
                : coinSide === "heads"
                ? "coin heads"
                : "coin tails"
            }
          >
            <div className="coin-face coin-front">
              <span>H</span>
              <small>Heads</small>
            </div>

            <div className="coin-face coin-back">
              <span>T</span>
              <small>Tails</small>
            </div>
          </div>
        </div>

        <div className="coin-status">
          {isFlipping ? (
            <p>Flipping...</p>
          ) : lastBet ? (
            <p>
              Landed on <strong>{lastBet.result}</strong>
            </p>
          ) : (
            <p>Ready to flip</p>
          )}
        </div>

        <form onSubmit={placeBet}>
          <label>Amount</label>
          <input
            type="number"
            min="1"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            disabled={loading || isFlipping}
            required
          />

          <label>Client Seed</label>
          <input
            value={clientSeed}
            onChange={(event) => setClientSeed(event.target.value)}
            placeholder="Enter your seed"
            disabled={loading || isFlipping}
          />

          <label>Choose side</label>

          <div className="choice-grid">
            <button
              type="button"
              className={choice === "heads" ? "choice active" : "choice"}
              onClick={() => setChoice("heads")}
              disabled={loading || isFlipping}
            >
              Heads
            </button>

            <button
              type="button"
              className={choice === "tails" ? "choice active" : "choice"}
              onClick={() => setChoice("tails")}
              disabled={loading || isFlipping}
            >
              Tails
            </button>
          </div>

          <button type="submit" disabled={loading || isFlipping}>
            {isFlipping ? "Flipping..." : "Place Bet"}
          </button>
        </form>

        {lastBet && (
          <div className={lastBet.won ? "result win animated-result" : "result loss animated-result"}>
            <h2>{lastBet.won ? "You won!" : "You lost!"}</h2>

            <p>
              You picked: <strong>{lastBet.choice}</strong>
            </p>

            <p>
              Result: <strong>{lastBet.result}</strong>
            </p>

            <p>
              Amount: <strong>{lastBet.amount}</strong>
            </p>

            <p>
              Payout: <strong>{lastBet.payout}</strong>
            </p>

            <hr />

            <h3>Provably Fair</h3>

            <p>
              Server Seed Hash:
              <br />
              <code>{lastBet.server_seed_hash}</code>
            </p>

            <p>
              Server Seed:
              <br />
              <code>{lastBet.server_seed}</code>
            </p>

            <p>
              Client Seed:
              <br />
              <code>{lastBet.client_seed}</code>
            </p>

            <p>
              Nonce:
              <br />
              <code>{lastBet.nonce}</code>
            </p>
          </div>
        )}

        {pendingBet && isFlipping && (
          <p className="muted small-text">
            Result received. Revealing after animation...
          </p>
        )}
      </div>
    </div>
  );
}

export default CoinflipPage;