import { useEffect, useState } from "react";
import api from "../api/api";
import Loading from "../components/Loading";
import ErrorMessage from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";

function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [filterType, setFilterType] = useState("all");
  const [pagination, setPagination] = useState({
    count: 0,
    next: null,
    previous: null,
    page: 1,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function fetchTransactions(page = 1, type = filterType) {
    setLoading(true);
    setError("");

    try {
      const typeQuery = type !== "all" ? `&type=${type}` : "";
      const response = await api.get(
        `/wallet/transactions/?page=${page}${typeQuery}`
      );

      setTransactions(response.data.results);
      setPagination({
        count: response.data.count,
        next: response.data.next,
        previous: response.data.previous,
        page,
      });
    } catch (error) {
      setError("Could not load transactions.");
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(event) {
    const newType = event.target.value;
    setFilterType(newType);
    fetchTransactions(1, newType);
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleString();
  }

  useEffect(() => {
    fetchTransactions();
  }, []);

  return (
    <div className="page">
      <div className="card wide-card">
        <h1>Transactions</h1>

        <div className="filter-bar">
          <label htmlFor="transaction-filter">Filter</label>

          <select
            id="transaction-filter"
            value={filterType}
            onChange={handleFilterChange}
          >
            <option value="all">All transactions</option>
            <option value="bonus">Starting bonus</option>
            <option value="daily_bonus">Daily bonus</option>
            <option value="bet">Bets</option>
            <option value="win">Wins</option>
            <option value="refund">Refunds</option>
          </select>
        </div>

        <ErrorMessage message={error} />

        {loading ? (
          <Loading text="Loading transactions..." />
        ) : transactions.length === 0 ? (
          <EmptyState
            title="No transactions found"
            description="Transactions will appear here after bonuses, bets, wins, or item sales."
          />
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Balance After</th>
                    <th>Description</th>
                    <th>Date</th>
                  </tr>
                </thead>

                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>{transaction.transaction_type}</td>
                      <td
                        className={
                          Number(transaction.amount) >= 0
                            ? "positive"
                            : "negative"
                        }
                      >
                        {transaction.amount}
                      </td>
                      <td>{transaction.balance_after}</td>
                      <td>{transaction.description}</td>
                      <td>{formatDate(transaction.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <button
                onClick={() => fetchTransactions(pagination.page - 1)}
                disabled={!pagination.previous}
              >
                Previous
              </button>

              <span>
                Page {pagination.page} · {pagination.count} total
              </span>

              <button
                onClick={() => fetchTransactions(pagination.page + 1)}
                disabled={!pagination.next}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default TransactionsPage;