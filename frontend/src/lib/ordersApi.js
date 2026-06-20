import { supabase } from './supabaseClient';

const API = import.meta.env.VITE_API_URL || '/api';

function apiUrl(path) {
  const base = API.endsWith('/') ? API.slice(0, -1) : API;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

async function tryBackend(path, options) {
  try {
    const res = await fetch(apiUrl(path), options);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchOrdersForUser(user) {
  if (!user) return [];

  const role = (user.role || '').toLowerCase();

  const employeeVendorId = user.employee_vendor_id ? Number(user.employee_vendor_id) : null;
  if (role === 'vendor' || employeeVendorId) {
    const vendorId = Number(user.vendor_id || user.vendor || employeeVendorId);
    if (!vendorId) return [];
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('id', { ascending: false });
    if (!error && data) return data;
    return (await tryBackend(`/orders?vendorId=${vendorId}`)) || [];
  }

  if (role === 'admin') {
    const { data, error } = await supabase.from('orders').select('*').order('id', { ascending: false });
    if (!error && data) return data;
    return (await tryBackend('/orders')) || [];
  }

  const userId = user.id;
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('id', { ascending: false });
  if (!error && data?.length) return data;

  return (await tryBackend(`/orders?userId=${userId}`)) || [];
}

export async function placeOrder(orderData) {
  const backendResult = await tryBackend('/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  });
  if (backendResult) return backendResult;

  const payload = {
    user_id: orderData.user_id,
    vendor_id: orderData.vendor_id,
    items: typeof orderData.items === 'string' ? orderData.items : JSON.stringify(orderData.items || []),
    total: orderData.total,
    status: 'placed',
    date: new Date().toISOString().slice(0, 10),
    delivery_method: orderData.delivery_method || 'pickup',
  };

  const { data, error } = await supabase.from('orders').insert(payload).select().single();
  if (error) throw new Error(error.message || 'Failed to place order');
  return data;
}