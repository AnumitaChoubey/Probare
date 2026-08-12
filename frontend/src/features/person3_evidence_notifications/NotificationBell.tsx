import React, { useState, useEffect, useRef } from 'react';
import './evidence.css';

export interface InAppNotification {
  id: number;
  user_id: string;
  error_id?: string;
  template_code: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationBellProps {
  userId?: string;
  apiBaseUrl?: string;
  onNavigateToError?: (errorId: string) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  userId = 'user-default-1',
  apiBaseUrl = 'http://localhost:8000',
  onNavigateToError,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/notifications?user_id=${userId}&limit=20`);
      if (res.ok) {
        const data: InAppNotification[] = await res.json();
        setNotifications(data);
        const count = data.filter((n) => !n.is_read).length;
        setUnreadCount(count);
      }
    } catch (e) {
      console.error('Error fetching notifications', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // 30s polling
    return () => clearInterval(interval);
  }, [userId]);

  const handleMarkAllRead = async () => {
    try {
      await fetch(`${apiBaseUrl}/notifications/mark-all-read?user_id=${userId}`, { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error('Error marking all as read', e);
    }
  };

  const handleNotificationClick = async (notif: InAppNotification) => {
    try {
      await fetch(`${apiBaseUrl}/notifications/${notif.id}/read?user_id=${userId}`, { method: 'POST' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      console.error('Error marking notification as read', e);
    }

    setIsOpen(false);
    if (notif.error_id && onNavigateToError) {
      onNavigateToError(notif.error_id);
    }
  };

  return (
    <div className="notification-bell-wrapper" ref={dropdownRef}>
      <button className="bell-button" onClick={() => setIsOpen(!isOpen)} title="Notifications">
        🔔
        {unreadCount > 0 && <span className="badge-count">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button className="btn-mark-all" onClick={handleMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>

          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '16px', color: 'var(--text-secondary)', textAlign: 'center', fontSize: '13px' }}>
                No notifications right now.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`notif-item ${!notif.is_read ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div style={{ fontSize: '18px' }}>
                    {notif.template_code.startsWith('NT-05') ? '⚠️' : '📢'}
                  </div>
                  <div>
                    <div className="notif-message">{notif.message}</div>
                    <div className="notif-time">{new Date(notif.created_at).toLocaleString()}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
