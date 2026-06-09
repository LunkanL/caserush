import { Navigate, Route, Routes } from "react-router-dom";

import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import CoinflipPage from "./pages/CoinflipPage";
import TransactionsPage from "./pages/TransactionsPage";
import BetHistoryPage from "./pages/BetHistoryPage";
import ProtectedLayout from "./components/ProtectedLayout";
import BetDetailPage from "./pages/BetDetailPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import ProfilePage from "./pages/ProfilePage";
import NotFoundPage from "./pages/NotFoundPage";
import RoulettePage from "./pages/RoulettePage";
import CaseOpeningPage from "./pages/CaseOpeningPage";
import InventoryPage from "./pages/InventoryPage";

function HomeRedirect() {
  const accessToken = localStorage.getItem("accessToken");

  if (accessToken) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />

      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/coinflip" element={<CoinflipPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/bets" element={<BetHistoryPage />} />
        <Route path="/bets/:id" element={<BetDetailPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/roulette" element={<RoulettePage />} />
        <Route path="/cases" element={<CaseOpeningPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;