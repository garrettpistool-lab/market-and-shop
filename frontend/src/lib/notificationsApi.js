import { supabase } from './supabaseClient';

export async function fetchVendorNotifications(vendorId, { unreadOnly = false } = {}) {
  if (!vendorId) return [];

  let query = supabase
    .from('vendor_notifications')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (unreadOnly) query = query.eq('read', false);

  const { data, error } = await query;
  if (error) {
    if (error.code === '42P01') return [];
    console.warn('fetchVendorNotifications:', error.message);
    return [];
  }
  return data || [];
}

export async function markNotificationRead(notificationId) {
  const { error } = await supabase
    .from('vendor_notifications')
    .update({ read: true })
    .eq('id', notificationId);

  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead(vendorId) {
  const { error } = await supabase
    .from('vendor_notifications')
    .update({ read: true })
    .eq('vendor_id', vendorId)
    .eq('read', false);

  if (error) throw new Error(error.message);
}