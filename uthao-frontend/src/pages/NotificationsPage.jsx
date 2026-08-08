import { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNotifications } from "../hooks/useNotifications";
import Card from "../components/Card";
import Button from "../components/Button";
import Loader from "../components/Loader";

export default function NotificationsPage() {
  const { user } = useAuth();
  const { notifications, fetchNotifications, markRead, loading } = useNotifications();

  useEffect(() => {
    fetchNotifications(user.userId);
  }, [user.userId]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-1">
        <div>
          <p className="uppercase text-[11px] font-bold tracking-wider text-neutral-400 mb-1">
            Inbox
          </p>
          <h1 className="text-2xl font-extrabold">Notifications</h1>
        </div>
      </div>

      <Card>
        {loading ? (
          <Loader />
        ) : notifications.length === 0 ? (
          <p className="text-neutral-400 text-sm text-center py-6">No notifications yet.</p>
        ) : (
          <ul className="list-none p-0 m-0">
            {notifications.map((n) => (
              <li
                key={n.id}
                className="relative flex items-center justify-between gap-3 py-4 border-b border-neutral-200 last:border-b-0"
              >
                {!n.isRead && (
                  <span className="absolute -left-3.5 top-6 w-1.5 h-1.5 rounded-full bg-blue-600" />
                )}
                <div>
                  <p className="text-[15px] font-semibold m-0">{n.message}</p>
                  <p className="text-[13px] text-neutral-400 mt-0.5">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                {!n.isRead && (
                  <Button variant="secondary" onClick={() => markRead(n.id)}>
                    Mark read
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
