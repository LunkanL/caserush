import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import Loading from "../components/Loading";
import ErrorMessage from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";
import { playWinSound } from "../utils/sound";

const rarityRank = {
  legendary: 4,
  epic: 3,
  rare: 2,
  common: 1,
};

function InventoryPage() {
  const [wallet, setWallet] = useState(null);
  const [items, setItems] = useState([]);

  const [statusFilter, setStatusFilter] = useState("active");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortMode, setSortMode] = useState("newest");

  const [loading, setLoading] = useState(true);
  const [sellingId, setSellingId] = useState(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function fetchInventory() {
    try {
      const [walletResponse, inventoryResponse] = await Promise.all([
        api.get("/wallet/"),
        api.get("/games/inventory/"),
      ]);

      setWallet(walletResponse.data);
      setItems(inventoryResponse.data.results || inventoryResponse.data);
    } catch (error) {
      setError("Could not load inventory.");
    } finally {
      setLoading(false);
    }
  }

  async function sellItem(itemId) {
    const confirmed = window.confirm("Sell this demo item for demo coins?");

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccessMessage("");
    setSellingId(itemId);

    try {
      const response = await api.post(`/games/inventory/${itemId}/sell/`);

      setWallet({
        ...wallet,
        balance: response.data.balance,
      });

      setItems((currentItems) =>
        currentItems.map((inventoryItem) =>
          inventoryItem.id === itemId
            ? response.data.inventory_item
            : inventoryItem
        )
      );

      setSuccessMessage("Item sold successfully.");
      playWinSound();
    } catch (error) {
      setError(error.response?.data?.error || "Could not sell item.");
    } finally {
      setSellingId(null);
    }
  }

  function formatRarity(rarity) {
    if (!rarity) {
      return "";
    }

    return rarity.charAt(0).toUpperCase() + rarity.slice(1);
  }

  function getItemValue(inventoryItem) {
    return Number(inventoryItem.item?.demo_value || 0);
  }

  const inventoryStats = useMemo(() => {
    const activeItems = items.filter((inventoryItem) => {
      return inventoryItem.status === "active";
    });

    const soldItems = items.filter((inventoryItem) => {
      return inventoryItem.status === "sold";
    });

    const activeValue = activeItems.reduce((total, inventoryItem) => {
      return total + getItemValue(inventoryItem);
    }, 0);

    const soldValue = soldItems.reduce((total, inventoryItem) => {
      return total + Number(inventoryItem.sold_value || 0);
    }, 0);

    const rarityCounts = {
      common: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
    };

    items.forEach((inventoryItem) => {
      const rarity = inventoryItem.item?.rarity;

      if (rarityCounts[rarity] !== undefined) {
        rarityCounts[rarity] += 1;
      }
    });

    return {
      totalItems: items.length,
      activeCount: activeItems.length,
      soldCount: soldItems.length,
      activeValue,
      soldValue,
      totalValue: activeValue + soldValue,
      rarityCounts,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return items
      .filter((inventoryItem) => {
        const matchesStatus =
          statusFilter === "all" || inventoryItem.status === statusFilter;

        const matchesRarity =
          rarityFilter === "all" ||
          inventoryItem.item?.rarity === rarityFilter;

        const itemName = inventoryItem.item?.name?.toLowerCase() || "";
        const caseName = inventoryItem.case_name?.toLowerCase() || "";

        const matchesSearch =
          !normalizedSearch ||
          itemName.includes(normalizedSearch) ||
          caseName.includes(normalizedSearch);

        return matchesStatus && matchesRarity && matchesSearch;
      })
      .sort((a, b) => {
        if (sortMode === "value-high") {
          return getItemValue(b) - getItemValue(a);
        }

        if (sortMode === "value-low") {
          return getItemValue(a) - getItemValue(b);
        }

        if (sortMode === "rarity") {
          return (
            (rarityRank[b.item?.rarity] || 0) -
            (rarityRank[a.item?.rarity] || 0)
          );
        }

        return new Date(b.created_at) - new Date(a.created_at);
      });
  }, [items, statusFilter, rarityFilter, searchTerm, sortMode]);

  useEffect(() => {
    fetchInventory();
  }, []);

  return (
    <div className="page">
      <div className="card wide-card inventory-card">
        <div className="section-header">
          <div>
            <h1>Inventory</h1>
            <p className="muted">
              Your demo items from case openings. Search, sort and sell items
              for demo coins.
            </p>
          </div>

          {wallet && <div className="balance-pill">{wallet.balance} coins</div>}
        </div>

        <ErrorMessage message={error} />

        {successMessage && <p className="success-message">{successMessage}</p>}

        {loading ? (
          <Loading text="Loading inventory..." />
        ) : (
          <>
            <div className="inventory-summary-grid">
              <div className="inventory-summary-card">
                <span>Total Items</span>
                <strong>{inventoryStats.totalItems}</strong>
              </div>

              <div className="inventory-summary-card">
                <span>Active Items</span>
                <strong>{inventoryStats.activeCount}</strong>
              </div>

              <div className="inventory-summary-card">
                <span>Sold Items</span>
                <strong>{inventoryStats.soldCount}</strong>
              </div>

              <div className="inventory-summary-card">
                <span>Active Value</span>
                <strong>{inventoryStats.activeValue.toFixed(2)}</strong>
              </div>

              <div className="inventory-summary-card">
                <span>Sold Value</span>
                <strong>{inventoryStats.soldValue.toFixed(2)}</strong>
              </div>

              <div className="inventory-summary-card">
                <span>Total Value</span>
                <strong>{inventoryStats.totalValue.toFixed(2)}</strong>
              </div>
            </div>

            <div className="rarity-breakdown">
              <div className="rarity-chip rarity-common">
                Common: {inventoryStats.rarityCounts.common}
              </div>

              <div className="rarity-chip rarity-rare">
                Rare: {inventoryStats.rarityCounts.rare}
              </div>

              <div className="rarity-chip rarity-epic">
                Epic: {inventoryStats.rarityCounts.epic}
              </div>

              <div className="rarity-chip rarity-legendary">
                Legendary: {inventoryStats.rarityCounts.legendary}
              </div>
            </div>

            <div className="inventory-toolbar">
              <div className="toolbar-field">
                <label>Search</label>
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search item or case..."
                />
              </div>

              <div className="toolbar-field">
                <label>Sort</label>
                <select
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value)}
                >
                  <option value="newest">Newest first</option>
                  <option value="value-high">Value high to low</option>
                  <option value="value-low">Value low to high</option>
                  <option value="rarity">Rarity high to low</option>
                </select>
              </div>
            </div>

            <div className="filter-bar">
              <button
                className={statusFilter === "active" ? "active" : ""}
                onClick={() => setStatusFilter("active")}
              >
                Active
              </button>

              <button
                className={statusFilter === "sold" ? "active" : ""}
                onClick={() => setStatusFilter("sold")}
              >
                Sold
              </button>

              <button
                className={statusFilter === "all" ? "active" : ""}
                onClick={() => setStatusFilter("all")}
              >
                All
              </button>
            </div>

            <div className="filter-bar">
              <button
                className={rarityFilter === "all" ? "active" : ""}
                onClick={() => setRarityFilter("all")}
              >
                All Rarities
              </button>

              <button
                className={rarityFilter === "common" ? "active" : ""}
                onClick={() => setRarityFilter("common")}
              >
                Common
              </button>

              <button
                className={rarityFilter === "rare" ? "active" : ""}
                onClick={() => setRarityFilter("rare")}
              >
                Rare
              </button>

              <button
                className={rarityFilter === "epic" ? "active" : ""}
                onClick={() => setRarityFilter("epic")}
              >
                Epic
              </button>

              <button
                className={rarityFilter === "legendary" ? "active" : ""}
                onClick={() => setRarityFilter("legendary")}
              >
                Legendary
              </button>
            </div>

            {filteredItems.length === 0 ? (
              <EmptyState
                title="No items found"
                description="Open cases or adjust your search and filters."
              />
            ) : (
              <div className="inventory-grid">
                {filteredItems.map((inventoryItem) => (
                  <div
                    className={`inventory-item-card rarity-${inventoryItem.item.rarity}`}
                    key={inventoryItem.id}
                  >
                    <div className="inventory-item-top">
                      <span className="inventory-rarity">
                        {formatRarity(inventoryItem.item.rarity)}
                      </span>

                      <span
                        className={
                          inventoryItem.status === "active"
                            ? "inventory-status active"
                            : "inventory-status sold"
                        }
                      >
                        {inventoryItem.status}
                      </span>
                    </div>

                    <div className="inventory-item-art">
                      <img
                        src={inventoryItem.item.image_path || "/items/default-item.png"}
                        alt={inventoryItem.item.name}
                      />
                    </div>

                    <h2>{inventoryItem.item.name}</h2>

                    <p className="muted">
                      From {inventoryItem.case_name || "Unknown Case"}
                    </p>

                    <div className="inventory-stats">
                      <div>
                        <span>Value</span>
                        <strong>{inventoryItem.item.demo_value}</strong>
                      </div>

                      <div>
                        <span>Acquired</span>
                        <strong>{inventoryItem.acquired_value}</strong>
                      </div>

                      <div>
                        <span>Bet ID</span>
                        <strong>#{inventoryItem.bet_id}</strong>
                      </div>
                    </div>

                    {inventoryItem.status === "active" ? (
                      <button
                        onClick={() => sellItem(inventoryItem.id)}
                        disabled={sellingId === inventoryItem.id}
                      >
                        {sellingId === inventoryItem.id
                          ? "Selling..."
                          : `Sell for ${inventoryItem.item.demo_value}`}
                      </button>
                    ) : (
                      <div className="sold-box">
                        Sold for {inventoryItem.sold_value} coins
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default InventoryPage;