import { Link } from "react-router-dom";
import { useNotifications } from "../hooks/useNotifications";

export default function NotificationBell() {
  const { unreadCount } = useNotifications();
  return (
    <Link
      to="/notifications"
      className="relative inline-flex text-lg"
      aria-label="Notifications"
    >
      <span>🔔</span>
      {unreadCount > 0 && (
        <span className="absolute -top-1.5 -right-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center leading-none">
          {unreadCount}
        </span>
      )}
    </Link>
  );
}
