import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";

const Notifications = () => {
  const { data, isLoading, isError } = useNotifications();
  const notifications = data?.notifications || [];

  return (
    <div className="ntf-root animate-fade-in">
      <div className="add-branch-header ntf-header">
        <div className="add-branch-header-icon-wrap">
          <Bell className="add-branch-header-icon" />
        </div>
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">
            Role, organization, branch, and module-filtered updates.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="luxury-card ntf-state-card">
          <div className="ntf-state-icon-wrap">
            <Bell className="ntf-state-icon" />
          </div>
          <div>
            <p className="ntf-state-title">Loading notifications</p>
            <p className="ntf-state-copy">
              Pulling the latest updates for your current access scope.
            </p>
          </div>
        </div>
      ) : isError ? (
        <div className="luxury-card ntf-state-card ntf-state-card-error">
          <div className="ntf-state-icon-wrap">
            <Bell className="ntf-state-icon" />
          </div>
          <div>
            <p className="ntf-state-title">Failed to load notifications</p>
            <p className="ntf-state-copy">
              We could not fetch updates right now. Please try again shortly.
            </p>
          </div>
        </div>
      ) : notifications.length === 0 ? (
        <div className="luxury-card ntf-empty-card">
          <div className="ntf-empty-icon-wrap">
            <Bell className="ntf-empty-icon" />
          </div>
          <div>
            <p className="ntf-empty-title">No notifications available</p>
            <p className="ntf-empty-copy">
              You will only see updates that match your access scope.
            </p>
          </div>
        </div>
      ) : (
        <div className="luxury-card ntf-panel">
          <div className="ntf-panel-header">
            <div>
              <div className="bo-section-label ntf-section-label">Inbox</div>
              <h2 className="ntf-panel-title">Recent activity</h2>
            </div>
            <div className="ntf-count-badge">
              {notifications.length} update{notifications.length === 1 ? "" : "s"}
            </div>
          </div>

          <div className="ntf-list">
            {notifications.map((notification) => (
              <article key={notification._id} className="ntf-item">
                <div className="ntf-item-accent" />
                <div className="ntf-item-body">
                  <div className="ntf-item-top">
                    <div className="ntf-item-heading">
                      <h3 className="ntf-item-title">{notification.title}</h3>
                      <span className="ntf-item-module">
                        {notification.module}
                      </span>
                    </div>

                    <span className="ntf-item-time">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>

                  <p className="ntf-item-message">{notification.message}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
