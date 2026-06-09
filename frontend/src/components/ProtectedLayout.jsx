import { Outlet } from "react-router-dom";
import Footer from "./Footer";
import Navbar from "./Navbar";

function ProtectedLayout() {
  return (
    <>
      <Navbar />

      <main className="app-main">
        <Outlet />
      </main>

      <Footer />
    </>
  );
}

export default ProtectedLayout;