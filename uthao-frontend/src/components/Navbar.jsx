import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import NotificationBell from "./NotificationBell";

const GHOST_BTN =
  "inline-flex items-center justify-center rounded-full text-sm font-bold px-3 py-2 bg-transparent text-black hover:bg-neutral-100 transition-colors no-underline";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="flex items-center justify-between px-8 py-3.5 bg-white border-b border-neutral-200 sticky top-0 z-10">
      <Link to="/" className="text-xl font-extrabold tracking-tight text-black no-underline">
        Uthao
      </Link>
      <nav className="flex items-center gap-5">
        {user && <NotificationBell />}
        {user && (
          <span className="flex items-center gap-2 text-sm text-neutral-600">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-black text-white text-xs font-bold shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </span>
            {user.name}
          </span>
        )}
        {user ? (
          <button className={GHOST_BTN} onClick={handleLogout}>
            Log out
          </button>
        ) : (
          <Link to="/login" className={GHOST_BTN}>
            Log in
          </Link>
        )}
      </nav>
    </header>
  );
}
