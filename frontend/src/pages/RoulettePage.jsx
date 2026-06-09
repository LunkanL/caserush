import { useEffect, useMemo, useRef, useState } from "react";
import api from "../api/api";
import { playLossSound, playWinSound } from "../utils/sound";

const baseRouletteSlots = [
  "green",
  "ct",
  "t",
  "ct",
  "t",
  "ct",
  "t",
  "ct",
  "t",
  "ct",
  "t",
  "ct",
  "t",
  "ct",
  "t",
];


function RoulettePage() {
  const [wallet, setWallet] = useState(null);
  const [choice, setChoice] = useState("ct");
  const [amount, setAmount] = useState("100.00");
  const [clientSeed, setClientSeed] = useState("roulette-seed");

  const [lastBet, setLastBet] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [trackOffset, setTrackOffset] = useState(0);

  const stageRef = useRef(null);
  const firstSlotRef = useRef(null);

  const [trackTransitionEnabled, setTrackTransitionEnabled] = useState(true);

  const rouletteSlots = useMemo(() => {
    const repeatedSlots = [];

    for (let i = 0; i < 8; i += 1) {
      repeatedSlots.push(...baseRouletteSlots);
    }

    return repeatedSlots;
  }, []);

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

  function calculateTargetOffset(targetIndex) {
    const stage = stageRef.current;
    const firstSlot = firstSlotRef.current;

    if (!stage || !firstSlot) {
      return 0;
    }

    const stageWidth = stage.offsetWidth;
    const slotWidth = firstSlot.offsetWidth;

    const trackStyles = window.getComputedStyle(firstSlot.parentElement);
    const gap = Number.parseFloat(trackStyles.columnGap || trackStyles.gap || "0");

    const slotStep = slotWidth + gap;
    const firstSlotLeft = firstSlot.offsetLeft;

    const targetSlotCenter =
      firstSlotLeft + targetIndex * slotStep + slotWidth / 2;

    const stageCenter = stageWidth / 2;

    return stageCenter - targetSlotCenter;
  }

  async function placeBet(event) {
    event.preventDefault();

    if (loading || isSpinning) {
      return;
    }

    setError("");
    setLastBet(null);
    setSelectedSlot(null);
    setLoading(true);
    setIsSpinning(true);

    // Reset visually before each spin without animating back.
    setTrackTransitionEnabled(false);
    setTrackOffset(0);

    try {
      const response = await api.post("/games/roulette/bet/", {
        choice,
        amount,
        client_seed: clientSeed,
      });

      const bet = response.data.bet;
      const winningBaseSlot = Number(bet.metadata?.slot || 0);

      // Pick a winning occurrence deep into the repeated track.
      // 6 full rounds * 15 slots = index 90, then add backend slot.
      const targetIndex = 90 + winningBaseSlot;

      await wait(80);

      const targetOffset = calculateTargetOffset(targetIndex);

      setTrackTransitionEnabled(true);
      setTrackOffset(targetOffset);

      await wait(2300);

      setSelectedSlot(targetIndex);
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
        "Could not place roulette bet."
      );
    } finally {
      setLoading(false);
      setIsSpinning(false);
    }
  }

  function getChoiceLabel(value) {
    if (value === "ct") return "CT";
    if (value === "t") return "T";
    return "Green";
  }

  useEffect(() => {
    fetchWallet();
  }, []);

  return (
    <div className="page">
      <div className="card wide-card roulette-card">
        <h1>Roulette</h1>

        <p className="muted">
          Demo roulette: CT pays 2x, T pays 2x, Green pays 14x.
        </p>

        {wallet ? (
          <p>
            Balance: <strong>{wallet.balance}</strong> demo coins
          </p>
        ) : (
          <p>Loading wallet...</p>
        )}

        {error && <p className="error">{error}</p>}

        <div className="roulette-stage precise-roulette-stage" ref={stageRef}>
          <div
            className={isSpinning ? "roulette-track precise spinning" : "roulette-track precise"}
            style={{
              transform: `translateX(${trackOffset}px)`,
              transition: trackTransitionEnabled
                ? "transform 2.3s cubic-bezier(0.08, 0.74, 0.12, 1)"
                : "none",
            }}
          >
            {rouletteSlots.map((slot, index) => (
              <div
                key={`${slot}-${index}`}
                ref={index === 0 ? firstSlotRef : null}
                className={
                  selectedSlot === index
                    ? `roulette-slot ${slot} selected`
                    : `roulette-slot ${slot}`
                }
              >
                <span>{getChoiceLabel(slot)}</span>
                <small>#{index % 15}</small>
              </div>
            ))}
          </div>

          <div className="roulette-pointer">▼</div>
        </div>

        <div className="roulette-status">
          {isSpinning ? (
            <p>Spinning...</p>
          ) : lastBet ? (
            <p>
              Landed on <strong>{getChoiceLabel(lastBet.result)}</strong>
            </p>
          ) : (
            <p>Ready to spin</p>
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
            disabled={loading || isSpinning}
            required
          />

          <label>Client Seed</label>
          <input
            value={clientSeed}
            onChange={(event) => setClientSeed(event.target.value)}
            disabled={loading || isSpinning}
          />

          <label>Choose</label>

          <div className="roulette-choice-grid">
            <button
              type="button"
              className={choice === "ct" ? "roulette-choice ct active" : "roulette-choice ct"}
              onClick={() => setChoice("ct")}
              disabled={loading || isSpinning}
            >
              CT 2x
            </button>

            <button
              type="button"
              className={choice === "t" ? "roulette-choice t active" : "roulette-choice t"}
              onClick={() => setChoice("t")}
              disabled={loading || isSpinning}
            >
              T 2x
            </button>

            <button
              type="button"
              className={
                choice === "green"
                  ? "roulette-choice green active"
                  : "roulette-choice green"
              }
              onClick={() => setChoice("green")}
              disabled={loading || isSpinning}
            >
              Green 14x
            </button>
          </div>

          <button type="submit" disabled={loading || isSpinning}>
            {isSpinning ? "Spinning..." : "Place Bet"}
          </button>
        </form>

        {lastBet && (
          <div className={lastBet.won ? "result win animated-result" : "result loss animated-result"}>
            <h2>{lastBet.won ? "You won!" : "You lost!"}</h2>

            <p>
              You picked: <strong>{getChoiceLabel(lastBet.choice)}</strong>
            </p>

            <p>
              Result: <strong>{getChoiceLabel(lastBet.result)}</strong>
            </p>

            <p>
              Slot: <strong>{lastBet.metadata?.slot}</strong>
            </p>

            <p>
              Amount: <strong>{lastBet.amount}</strong>
            </p>

            <p>
              Payout: <strong>{lastBet.payout}</strong>
            </p>

            <p>
              Multiplier: <strong>{lastBet.metadata?.payout_multiplier}x</strong>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default RoulettePage;