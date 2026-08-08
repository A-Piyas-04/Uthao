import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Input from "../components/Input";
import Button from "../components/Button";
import { ROLES } from "../utils/constants";

export default function RegisterPage() {
  const { register, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: ROLES.RIDER });
  const [error, setError] = useState("");

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function selectRole(role) {
    setForm({ ...form, role });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const result = await register(form.name, form.email, form.password, form.role);
      navigate(result.role === "DRIVER" ? "/driver/onboarding" : "/rider");
    } catch {
      setError("Could not register. Check your details and try again.");
    }
  }

  return (
    <div className="min-h-[calc(100vh-65px)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm">
        <h1 className="text-2xl font-extrabold mb-1.5">Create your account</h1>
        <p className="text-neutral-600 text-sm mb-6">Get moving with Uthao.</p>

        <div
          className="grid grid-cols-2 bg-neutral-100 rounded-md p-1 mb-5"
          role="tablist"
          aria-label="Account type"
        >
          <button
            type="button"
            role="tab"
            aria-selected={form.role === ROLES.RIDER}
            className={`py-2.5 rounded text-sm font-bold transition-colors ${form.role === ROLES.RIDER ? "bg-white text-black shadow-sm" : "bg-transparent text-neutral-600"}`}
            onClick={() => selectRole(ROLES.RIDER)}
          >
            Rider
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={form.role === ROLES.DRIVER}
            className={`py-2.5 rounded text-sm font-bold transition-colors ${form.role === ROLES.DRIVER ? "bg-white text-black shadow-sm" : "bg-transparent text-neutral-600"}`}
            onClick={() => selectRole(ROLES.DRIVER)}
          >
            Driver
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <Input
            id="name"
            name="name"
            label="Full name"
            value={form.name}
            onChange={handleChange}
            required
          />
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
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </form>
        <p className="text-center text-sm text-neutral-600 mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-black font-bold no-underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
