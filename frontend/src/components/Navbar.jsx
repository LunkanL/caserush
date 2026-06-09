import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { isSoundEnabled, setSoundEnabled } from "../utils/sound";

function Navbar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());

  function closeMenu() {
    setMenuOpen(false);
  }

  function toggleSound() {
    const newValue = !soundOn;
    setSoundOn(newValue);
    setSoundEnabled(newValue);
  }

  function logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setMenuOpen(false);
    navigate("/login");
  }

  return (
    <nav className="navbar">
      <div className="navbar-top">
        <Link className="navbar-brand" to="/dashboard" onClick={closeMenu}>
          CaseRush
        </Link>

        <button
          className="menu-button"
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      <div className={menuOpen ? "navbar-links open" : "navbar-links"}>
        <NavLink to="/dashboard" onClick={closeMenu}>
          Dashboard
        </NavLink>

        <NavLink to="/profile" onClick={closeMenu}>
          Profile
        </NavLink>

        <NavLink to="/coinflip" onClick={closeMenu}>
          Coinflip
        </NavLink>
        <NavLink to="/roulette" onClick={closeMenu}>
          Roulette
        </NavLink>
        <NavLink to="/cases" onClick={closeMenu}>
          Cases
        </NavLink>
        <NavLink to="/inventory" onClick={closeMenu}>
          Inventory
        </NavLink>

        <NavLink to="/leaderboard" onClick={closeMenu}>
          Leaderboard
        </NavLink>

        <NavLink to="/transactions" onClick={closeMenu}>
          Transactions
        </NavLink>

        <NavLink to="/bets" onClick={closeMenu}>
          Bet History
        </NavLink>

        <button className="navbar-button" onClick={toggleSound}>
          {soundOn ? "Sound: On" : "Sound: Off"}
        </button>

        <button className="navbar-button" onClick={logout}>
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;