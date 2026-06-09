import { useEffect, useRef, useState } from "react";
import api from "../api/api";
import { playLossSound, playWinSound } from "../utils/sound";
import { Link } from "react-router-dom";


const rarityOrder = {
  common: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

function CaseOpeningPage() {
  const [wallet, setWallet] = useState(null);
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [clientSeed, setClientSeed] = useState("case-seed");

  const [lastResult, setLastResult] = useState(null);
  const [reelItems, setReelItems] = useState([]);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const reelStageRef = useRef(null);
  const firstReelItemRef = useRef(null);

  const [winningReelIndex, setWinningReelIndex] = useState(null);
  const [reelOffset, setReelOffset] = useState(0);
  const [reelTransitionEnabled, setReelTransitionEnabled] = useState(true);

  async function fetchData() {
    try {
      const [walletResponse, casesResponse] = await Promise.all([
        api.get("/wallet/"),
        api.get("/games/cases/"),
      ]);

      const caseList = casesResponse.data.results || casesResponse.data;

      setWallet(walletResponse.data);
      setCases(caseList);
      setSelectedCase(caseList[0] || null);
      setReelItems(caseList[0]?.items || []);
    } catch (error) {
      setError("Could not load cases.");
    } finally {
      setLoading(false);
    }
  }

  function wait(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  function buildReelItems(caseItems, winningItem) {
    if (!caseItems.length || !winningItem) {
      return {
        reel: [],
        winningIndex: null,
      };
    }

    const sortedItems = [...caseItems].sort((a, b) => {
      return (rarityOrder[a.rarity] || 0) - (rarityOrder[b.rarity] || 0);
    });

    const reel = [];

    for (let i = 0; i < 32; i += 1) {
      reel.push(sortedItems[i % sortedItems.length]);
    }

    const winningIndex = reel.length;
    reel.push(winningItem);

    for (let i = 0; i < 10; i += 1) {
      reel.push(sortedItems[(i + 1) % sortedItems.length]);
    }

    return {
      reel,
      winningIndex,
    };
  }

  function calculateReelOffset(targetIndex) {
    const stage = reelStageRef.current;
    const firstItem = firstReelItemRef.current;

    if (!stage || !firstItem) {
      return 0;
    }

    const stageWidth = stage.offsetWidth;
    const itemWidth = firstItem.offsetWidth;

    const reelElement = firstItem.parentElement;
    const reelStyles = window.getComputedStyle(reelElement);
    const gap = Number.parseFloat(reelStyles.columnGap || reelStyles.gap || "0");

    const itemStep = itemWidth + gap;
    const firstItemLeft = firstItem.offsetLeft;

    const targetItemCenter =
      firstItemLeft + targetIndex * itemStep + itemWidth / 2;

    const stageCenter = stageWidth / 2;

    return stageCenter - targetItemCenter;
  }

  async function openCase() {
    if (!selectedCase || opening) {
      return;
    }

    setError("");
    setLastResult(null);
    setWinningReelIndex(null);
    setReelTransitionEnabled(false);
    setReelOffset(0);
    setOpening(true);

    try {
      const response = await api.post(`/games/cases/${selectedCase.id}/open/`, {
        client_seed: clientSeed,
      });

      const inventoryItem = response.data.inventory_item;
      const winningItem = inventoryItem.item;

      const { reel, winningIndex } = buildReelItems(
        selectedCase.items,
        winningItem
      );

      setReelItems(reel);
      setWinningReelIndex(null);

      await wait(80);

      const targetOffset = calculateReelOffset(winningIndex);

      setReelTransitionEnabled(true);
      setReelOffset(targetOffset);

      await wait(2300);

      setWinningReelIndex(winningIndex);

      setLastResult({
        bet: response.data.bet,
        inventoryItem,
      });

      setWallet({
        ...wallet,
        balance: response.data.balance,
      });

      if (response.data.bet.won) {
        playWinSound();
      } else {
        playLossSound();
      }
    } catch (error) {
      const data = error.response?.data;

      setError(
        data?.error ||
        data?.client_seed?.[0] ||
        "Could not open case."
      );
    } finally {
      setOpening(false);
    }
  }

  function getTotalWeight(items) {
    return items.reduce((total, item) => total + Number(item.weight || 0), 0);
  }

  function getItemChance(item, items) {
    const totalWeight = getTotalWeight(items);

    if (!totalWeight) {
      return "0.00";
    }

    return ((Number(item.weight) / totalWeight) * 100).toFixed(2);
  }

  function formatRarity(rarity) {
    return rarity.charAt(0).toUpperCase() + rarity.slice(1);
  }

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="page">
        <div className="card wide-card">
          <p>Loading cases...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card wide-card case-page-card">
        <h1>Case Opening</h1>

        <p className="muted">
          Open demo cases with fake items and demo coin values.
        </p>

        {wallet && (
          <p>
            Balance: <strong>{wallet.balance}</strong> demo coins
          </p>
        )}

        {error && <p className="error">{error}</p>}

        {!selectedCase ? (
          <p>No active cases found.</p>
        ) : (
          <>
            <div className="case-selector-grid">
              {cases.map((caseOption) => (
                <button
                  key={caseOption.id}
                  type="button"
                  className={
                    selectedCase?.id === caseOption.id
                      ? "case-selector-card active"
                      : "case-selector-card"
                  }
                  onClick={() => {
                    setSelectedCase(caseOption);
                    setLastResult(null);
                    setReelItems(caseOption.items || []);
                    setWinningReelIndex(null);
                    setReelTransitionEnabled(false);
                    setReelOffset(0);
                  }}
                  disabled={opening}
                >
                  <span>◆</span>
                  <strong>{caseOption.name}</strong>
                  <small>{caseOption.price} coins</small>
                </button>
              ))}
            </div>
            <div className="case-layout">
              <div className="case-preview">
                <div className="case-box">
                  <span>◆</span>
                  <h2>{selectedCase.name}</h2>
                  <p>{selectedCase.price} coins</p>
                </div>

                <p className="muted">{selectedCase.description}</p>

                <label>Client Seed</label>
                <input
                  value={clientSeed}
                  onChange={(event) => setClientSeed(event.target.value)}
                  disabled={opening}
                />

                <button onClick={openCase} disabled={opening}>
                  {opening ? "Opening..." : `Open for ${selectedCase.price}`}
                </button>
              </div>

              <div className="case-items-panel">
                <div className="section-header">
                  <h2>Possible Items</h2>
                  <span className="muted">{selectedCase.items.length} items</span>
                </div>

                <div className="case-item-list">
                  {selectedCase.items.map((item) => (
                    <div
                      className={`case-item-row rarity-${item.rarity}`}
                      key={item.id}
                    >
                      <div className="case-item-info">
                        <img
                          src={item.image_path || "/items/default-item.png"}
                          alt={item.name}
                        />

                        <div>
                          <strong>{item.name}</strong>
                          <p>{formatRarity(item.rarity)}</p>
                        </div>
                      </div>

                      <div className="case-item-values">
                        <strong>{item.demo_value}</strong>
                        <span>{getItemChance(item, selectedCase.items)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="case-reel-stage" ref={reelStageRef}>
              <div className="case-reel-pointer">▼</div>

              <div
                className={opening ? "case-reel opening" : "case-reel"}
                style={{
                  transform: `translateX(${reelOffset}px)`,
                  transition: reelTransitionEnabled
                    ? "transform 2.3s cubic-bezier(0.08, 0.74, 0.12, 1)"
                    : "none",
                }}
              >
                {(reelItems.length ? reelItems : selectedCase.items).map(
                  (item, index) => (
                    <div
                      ref={index === 0 ? firstReelItemRef : null}
                      className={
                        winningReelIndex === index
                          ? `case-reel-item rarity-${item.rarity} selected`
                          : `case-reel-item rarity-${item.rarity}`
                      }
                      key={`${item.id}-${index}`}
                    >
                      <span>{formatRarity(item.rarity)}</span>

                      <img
                        src={item.image_path || "/items/default-item.png"}
                        alt={item.name}
                      />

                      <strong>{item.name}</strong>
                      <small>{item.demo_value} coins</small>
                    </div>
                  )
                )}
              </div>
            </div>

            {lastResult && (
              <div
                className={`case-result rarity-${lastResult.inventoryItem.item.rarity}`}
              >
                <h2>You unboxed:</h2>
                <div className="case-result-art">
                  <img
                    src={
                      lastResult.inventoryItem.item.image_path ||
                      "/items/default-item.png"
                    }
                    alt={lastResult.inventoryItem.item.name}
                  />
                </div>

                <h1>{lastResult.inventoryItem.item.name}</h1>

                <p>
                  Rarity:{" "}
                  <strong>
                    {formatRarity(lastResult.inventoryItem.item.rarity)}
                  </strong>
                </p>

                <p>
                  Demo value:{" "}
                  <strong>
                    {lastResult.inventoryItem.item.demo_value} coins
                  </strong>
                </p>

                <p>
                  Case price: <strong>{lastResult.bet.amount} coins</strong>
                </p>

                <p>
                  Profit:{" "}
                  <strong
                    className={
                      Number(lastResult.bet.metadata?.profit || 0) >= 0
                        ? "positive"
                        : "negative"
                    }
                  >
                    {lastResult.bet.metadata?.profit}
                  </strong>
                </p>
                <Link className="inline-action-link" to="/inventory">
                  View Inventory
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default CaseOpeningPage;