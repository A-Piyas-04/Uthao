import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Input from "../components/Input";
import Button from "../components/Button";

export default function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const result = await login(form.email, form.password);
      if (result.role === "DRIVER") {
        navigate(result.driverId ? "/driver" : "/driver/onboarding");
      } else {
        navigate("/rider");
      }
    } catch {
      setError("Invalid email or password.");
    }
  }

  return (
    <div className="min-h-[calc(100vh-65px)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm">
        <h1 className="text-2xl font-extrabold mb-1.5">Welcome back</h1>
        <p className="text-neutral-600 text-sm mb-6">Log in to request or drive a ride.</p>
        <form onSubmit={handleSubmit}>
          <Input
            id="email"
            name="email"
            label="Email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
          />
          <Input
            id="password"
            name="password"
            label="Password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
          />
          {error && (
            <p className="bg-red-50 text-red-600 px-3 py-2.5 rounded-md text-sm -mt-1 mb-4">
              {error}
            </p>
          )}
          <Button type="submit" disabled={loading} full>
            {loading ? "Logging in…" : "Log in"}
          </Button>
        </form>
        <p className="text-center text-sm text-neutral-600 mt-4">
          No account?{" "}
          <Link to="/register" className="text-black font-bold no-underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
