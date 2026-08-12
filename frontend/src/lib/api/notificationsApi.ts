const API_BASE = 'http://localhost:8000';

export async function fetchUserNotifications(userId: string = 'user-default-1', unreadOnly: boolean = false) {
  const res = await fetch(`${API_BASE}/notifications?user_id=${userId}&unread_only=${unreadOnly}`);
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return res.json();
}

export async function markNotificationAsRead(notificationId: number, userId: string = 'user-default-1') {
  const res = await fetch(`${API_BASE}/notifications/${notificationId}/read?user_id=${userId}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to mark notification as read');
  return res.json();
}

export async function markAllNotificationsAsRead(userId: string = 'user-default-1') {
  const res = await fetch(`${API_BASE}/notifications/mark-all-read?user_id=${userId}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to mark all notifications as read');
  return res.json();
}
