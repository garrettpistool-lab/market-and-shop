import { useState, useEffect } from 'react';
import {
  fetchVendorNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../lib/notificationsApi';

export default function VendorNotificationsPanel({ vendorId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    if (!vendorId) return;
    setLoading(true);
    const data = await fetchVendorNotifications(vendorId);
    setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    reload();
  }, [vendorId]);

  if (loading) return null;
  if (!items.length) return null;

  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="mb-8 bg-white border rounded-3xl p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-semibold text-lg">Notifications</h3>
          {unread > 0 && (
            <p className="text-xs text-[#083a9b] font-medium">{unread} unread</p>
          )}
        </div>
        {unread > 0 && (
          <button
            type="button"
            onClick={async () => {
              await markAllNotificationsRead(vendorId);
              reload();
            }}
            className="text-xs text-gray-500 underline"
          >
            Mark all read
          </button>
        )}
      </div>
      <div className="space-y-2 text-sm max-h-48 overflow-y-auto">
        {items.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={async () => {
              if (!n.read) {
                await markNotificationRead(n.id);
                reload();
              }
            }}
            className={`w-full text-left p-3 rounded-2xl border transition ${
              n.read ? 'bg-gray-50 border-gray-100' : 'bg-blue-50 border-blue-200'
            }`}
          >
            <div className="font-medium text-sm">{n.title}</div>
            {n.body && <div className="text-xs text-gray-600 mt-0.5 line-clamp-2">{n.body}</div>}
            <div className="text-[10px] text-gray-400 mt-1">
              {n.type === 'low_rating' && '📧 Email sent if Resend configured • '}
              {n.created_at?.slice?.(0, 16).replace('T', ' ')}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}