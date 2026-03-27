import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";

const Notifications = () => {
  const { data, isLoading, isError } = useNotifications();
  const notifications = data?.notifications || [];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
            <Bell size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Notifications
            </h2>
            <p className="text-sm text-muted-foreground">
              Role, organization, branch, and module-filtered updates.
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground shadow-sm">
          Loading notifications...
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground shadow-sm">
          Failed to load notifications.
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 bg-card p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-foreground">
            No notifications available
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            You will only see updates that match your access scope.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <article
              key={notification._id}
              className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      {notification.title}
                    </h3>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {notification.module}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {notification.message}
                  </p>
                </div>

                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(notification.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
