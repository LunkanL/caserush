import { Link } from "react-router-dom";

function NotFoundPage() {
  const hasToken = Boolean(localStorage.getItem("accessToken"));

  return (
    <div className="page">
      <div className="card not-found-card">
        <div className="not-found-code">404</div>

        <h1>Page not found</h1>

        <p className="muted">
          The page you are looking for does not exist in this demo app.
        </p>

        <Link
          className="inline-action-link"
          to={hasToken ? "/dashboard" : "/login"}
        >
          {hasToken ? "Back to Dashboard" : "Back to Login"}
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;