import { supabase } from './supabaseClient';

function parseOrderDate(dateStr) {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

const EMPTY = {
  menu: [],
  produce: [],
  tasks: [],
  monthOrders: 0,
  monthRevenue: 0,
  totalOrders: 0,
  fulfilled: 0,
  avgRating: null,
  weekBuckets: [0, 0, 0, 0, 0, 0],
  maxWeek: 1,
  reviews: [],
  recentOrders: [],
  notifications: [],
};

export async function fetchVendorCatalog(vendorId) {
  const vid = Number(vendorId);
  if (!vid) return { menu: [], produce: [], tasks: [] };

  const [menuRes, produceRes, tasksRes] = await Promise.all([
    supabase.from('menu_items').select('*').eq('vendor_id', vid).order('id', { ascending: false }),
    supabase.from('produce_items').select('*').eq('vendor_id', vid).order('id', { ascending: false }),
    supabase.from('tasks').select('*').eq('vendor_id', vid).order('id', { ascending: false }),
  ]);

  return {
    menu: menuRes.data || [],
    produce: produceRes.data || [],
    tasks: tasksRes.data || [],
  };
}

export async function fetchVendorAnalytics(vendorId) {
  const vid = Number(vendorId);
  if (!vid) return { ...EMPTY };

  const catalog = await fetchVendorCatalog(vid);

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .eq('vendor_id', vid)
    .order('id', { ascending: false });

  if (ordersError) {
    console.warn('Vendor orders fetch failed:', ordersError.message);
  }

  const orderList = orders || [];
  const now = new Date();
  const monthStart = startOfMonth(now);

  const monthOrders = orderList.filter((o) => {
    const d = parseOrderDate(o.date);
    return d && d >= monthStart;
  });

  const monthRevenue = monthOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const fulfilled = orderList.filter((o) =>
    ['delivered', 'completed', 'fulfilled'].includes((o.status || '').toLowerCase())
  ).length;

  const msWeek = 7 * 24 * 60 * 60 * 1000;
  const weekBuckets = [0, 0, 0, 0, 0, 0];
  orderList.forEach((o) => {
    const d = parseOrderDate(o.date);
    if (!d) return;
    const weeksAgo = Math.floor((now.getTime() - d.getTime()) / msWeek);
    if (weeksAgo >= 0 && weeksAgo < 6) {
      weekBuckets[5 - weeksAgo] += Number(o.total) || 0;
    }
  });
  const maxWeek = Math.max(...weekBuckets, 1);

  const itemIds = [
    ...catalog.menu.map((i) => i.id),
    ...catalog.produce.map((i) => i.id),
  ];

  const { data: vendorRevs } = await supabase
    .from('reviews')
    .select('*')
    .eq('vendor_id', vid)
    .eq('is_public', true);

  let reviews = vendorRevs || [];
  if (!reviews.length && itemIds.length) {
    const { data: revs } = await supabase.from('reviews').select('*').in('item_id', itemIds);
    reviews = revs || [];
  }
  reviews = reviews.sort((a, b) => (b.rating || 0) - (a.rating || 0));

  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : null;

  const recentOrders = orderList.slice(0, 8);
  const notifications = recentOrders.map((o) => ({
    id: o.id,
    type: 'order',
    text: `Order #${o.id} — $${(Number(o.total) || 0).toFixed(2)} (${o.status || 'placed'})`,
    tone: o.status === 'delivered' ? 'green' : 'blue',
  }));

  if (catalog.menu.length + catalog.produce.length > 0) {
    notifications.unshift({
      id: 'listings',
      type: 'listing',
      text: `${catalog.menu.length} menu + ${catalog.produce.length} produce listings live`,
      tone: 'amber',
    });
  }

  return {
    ...catalog,
    monthOrders: monthOrders.length,
    monthRevenue,
    totalOrders: orderList.length,
    fulfilled,
    avgRating,
    weekBuckets,
    maxWeek,
    reviews: reviews.slice(0, 6),
    recentOrders,
    notifications: notifications.slice(0, 6),
  };
}