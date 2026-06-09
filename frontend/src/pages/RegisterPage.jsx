import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/api";

function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");

  function handleChange(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    try {
      await api.post("/auth/register/", form);
      navigate("/login");
    } catch (error) {
      setError(
        error.response?.data?.username?.[0] ||
          error.response?.data?.email?.[0] ||
          error.response?.data?.password?.[0] ||
          "Could not register user."
      );
    }
  }

  return (
    <div className="page">
      <div className="card">
        <h1>Register</h1>

        {error && <p className="error">{error}</p>}

        <form onSubmit={handleSubmit}>
          <label>Username</label>
          <input
            name="username"
            value={form.username}
            onChange={handleChange}
            required
          />

          <label>Email</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
          />

          <label>Password</label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
          />

          <button type="submit">Create account</button>
        </form>

        <p>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;