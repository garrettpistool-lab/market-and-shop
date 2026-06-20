import { supabase } from './supabaseClient';
import { FREE_CUSTOMER_RATING_MIN_PURCHASES, getCustomerContext } from './plans';

const GRACE_DAYS = 3;
const EDIT_DAYS = 5;
const MS_DAY = 24 * 60 * 60 * 1000;
const QUALIFYING_ORDER_STATUSES = ['placed', 'preparing', 'delivered', 'completed', 'fulfilled'];

function addDays(date, days) {
  return new Date(date.getTime() + days * MS_DAY);
}

function toIso(d) {
  return d instanceof Date ? d.toISOString() : d;
}

function normalizeReview(row) {
  if (!row) return null;
  return {
    ...row,
    rating: Number(row.rating) || 0,
    is_public: row.is_public !== false && row.is_public !== 0,
    locked: row.locked === true || row.locked === 1,
  };
}

export function isReviewEditable(review) {
  if (!review || review.locked) return false;
  if (!review.editable_until) return true;
  return new Date(review.editable_until) > new Date();
}

export function daysUntil(dateStr) {
  if (!dateStr) return 0;
  const diff = new Date(dateStr) - new Date();
  return Math.max(0, Math.ceil(diff / MS_DAY));
}

export function formatStars(rating) {
  const n = Math.round(Number(rating) || 0);
  return '★'.repeat(Math.min(5, Math.max(0, n))) + '☆'.repeat(Math.max(0, 5 - n));
}

/** Prefer server pg_cron; RPC fallback; then client-side for legacy DBs */
export async function processReviewDeadlines() {
  const { error: rpcError } = await supabase.rpc('process_review_deadlines_rpc');
  if (!rpcError) return;

  const now = new Date().toISOString();

  const { data: pending } = await supabase
    .from('reviews')
    .select('*')
    .eq('status', 'pending_resolution')
    .lt('grace_deadline', now);

  for (const review of pending || []) {
    await supabase
      .from('reviews')
      .update({ status: 'published', is_public: true, locked: false })
      .eq('id', review.id);
    if (review.vendor_id) await refreshVendorRatingCache(review.vendor_id);
  }

  const { data: expired } = await supabase
    .from('reviews')
    .select('id')
    .eq('locked', false)
    .lt('editable_until', now);

  for (const review of expired || []) {
    await supabase.from('reviews').update({ locked: true }).eq('id', review.id);
  }
}

/** Order-gated + plan-gated reviews (free customers need 15 purchases) */
export async function customerCanReviewVendor(vendorId, user) {
  if (!user) return { allowed: false, reason: 'Sign in as a customer to review.' };
  if ((user.role || '').toLowerCase() === 'admin') return { allowed: true };

  const customerCtx = getCustomerContext(user);
  if (!customerCtx.canRate) {
    const remaining = customerCtx.purchasesUntilRating;
    return {
      allowed: false,
      reason: `Free members can rate vendors after ${FREE_CUSTOMER_RATING_MIN_PURCHASES} purchases. You have ${customerCtx.purchaseCount} — ${remaining} more to unlock ratings. Upgrade to Premium for immediate access.`,
    };
  }

  const { data: rpcAllowed, error: rpcErr } = await supabase.rpc('can_review_vendor', {
    p_vendor_id: vendorId,
  });

  if (!rpcErr && rpcAllowed === true) return { allowed: true };
  if (!rpcErr && rpcAllowed === false) {
    const email = (user.email || '').trim().toLowerCase();
    const { data: profile } = await supabase
      .from('users')
      .select('id, customer_plan, purchase_count')
      .ilike('email', email)
      .maybeSingle();

    if (profile && (profile.customer_plan || 'free') === 'free' && (profile.purchase_count || 0) < FREE_CUSTOMER_RATING_MIN_PURCHASES) {
      const remaining = FREE_CUSTOMER_RATING_MIN_PURCHASES - (profile.purchase_count || 0);
      return {
        allowed: false,
        reason: `Complete ${remaining} more purchase${remaining !== 1 ? 's' : ''} to unlock ratings on the free plan.`,
      };
    }
  }

  const email = (user.email || '').trim().toLowerCase();
  const { data: profile } = await supabase
    .from('users')
    .select('id, customer_plan, purchase_count')
    .ilike('email', email)
    .maybeSingle();

  if (!profile?.id) {
    return {
      allowed: false,
      reason: 'Place an order with this vendor first — only verified customers can leave reviews.',
    };
  }

  if ((profile.customer_plan || 'free') === 'free' && (profile.purchase_count || 0) < FREE_CUSTOMER_RATING_MIN_PURCHASES) {
    const remaining = FREE_CUSTOMER_RATING_MIN_PURCHASES - (profile.purchase_count || 0);
    return {
      allowed: false,
      reason: `Complete ${remaining} more purchase${remaining !== 1 ? 's' : ''} to unlock ratings on the free plan.`,
    };
  }

  const { data: orders } = await supabase
    .from('orders')
    .select('id, status')
    .eq('vendor_id', vendorId)
    .eq('user_id', profile.id);

  const hasOrder = (orders || []).some((o) =>
    QUALIFYING_ORDER_STATUSES.includes((o.status || 'placed').toLowerCase())
  );

  return hasOrder
    ? { allowed: true }
    : {
        allowed: false,
        reason: 'Place an order with this vendor first — only verified customers can leave reviews.',
      };
}

export async function refreshVendorRatingCache(vendorId) {
  const { data: publicReviews } = await supabase
    .from('reviews')
    .select('rating')
    .eq('vendor_id', vendorId)
    .eq('is_public', true);

  const ratings = (publicReviews || []).map((r) => Number(r.rating) || 0);
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

  await supabase
    .from('vendors')
    .update({ avg_rating: Math.round(avg * 10) / 10, review_count: ratings.length })
    .eq('id', vendorId);
}

export async function fetchPublicReviews(vendorId) {
  await processReviewDeadlines();
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('vendor_id', vendorId)
    .eq('is_public', true)
    .order('rating', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('fetchPublicReviews:', error.message);
    return [];
  }
  return (data || []).map(normalizeReview);
}

export async function fetchUserReviewForVendor(vendorId, user) {
  if (!user?.email && !user?.id) return null;
  const email = (user.email || '').trim().toLowerCase();

  let query = supabase.from('reviews').select('*').eq('vendor_id', vendorId);
  if (email) {
    query = query.ilike('reviewer_email', email);
  } else {
    query = query.eq('user_id', user.id);
  }

  const { data } = await query.order('created_at', { ascending: false }).limit(1);
  return data?.[0] ? normalizeReview(data[0]) : null;
}

export async function fetchVendorPendingReviews(vendorId) {
  await processReviewDeadlines();
  const { data } = await supabase
    .from('reviews')
    .select('*')
    .eq('vendor_id', vendorId)
    .eq('status', 'pending_resolution')
    .order('grace_deadline', { ascending: true });

  return (data || []).map(normalizeReview);
}

export async function submitVendorReview({ vendorId, user, rating, comment, imageUrl }) {
  if (!user?.email && !user?.id) {
    throw new Error('Sign in as a customer to leave a review.');
  }
  const role = (user.role || '').toLowerCase();
  if (role !== 'customer' && role !== 'admin') {
    throw new Error('Only signed-in customers can rate vendors.');
  }

  const gate = await customerCanReviewVendor(vendorId, user);
  if (!gate.allowed) throw new Error(gate.reason);

  const stars = Math.min(5, Math.max(1, Number(rating) || 5));
  const now = new Date();
  const editableUntil = addDays(now, EDIT_DAYS);
  const isLow = stars <= 3;

  const existing = await fetchUserReviewForVendor(vendorId, user);
  if (existing) {
    return updateVendorReview(existing.id, user, { rating: stars, comment, imageUrl });
  }

  const payload = {
    vendor_id: vendorId,
    item_id: vendorId,
    item_type: 'vendor',
    user_id: user.id || null,
    reviewer_email: (user.email || '').trim().toLowerCase(),
    rating: stars,
    comment: (comment || '').trim(),
    image_url: imageUrl || null,
    date: now.toISOString().slice(0, 10),
    created_at: toIso(now),
    editable_until: toIso(editableUntil),
    locked: false,
    vendor_notified: isLow,
    status: isLow ? 'pending_resolution' : 'published',
    is_public: !isLow,
    grace_deadline: isLow ? toIso(addDays(now, GRACE_DAYS)) : null,
  };

  const { data, error } = await supabase.from('reviews').insert(payload).select().single();
  if (error) throw new Error(error.message || 'Could not save review');

  if (!isLow) await refreshVendorRatingCache(vendorId);
  return normalizeReview(data);
}

export async function updateVendorReview(reviewId, user, { rating, comment, imageUrl }) {
  const { data: existing, error: fetchErr } = await supabase
    .from('reviews')
    .select('*')
    .eq('id', reviewId)
    .single();

  if (fetchErr || !existing) throw new Error('Review not found');
  if (!isReviewEditable(existing)) throw new Error('This review is permanent and can no longer be edited.');

  const email = (user?.email || '').trim().toLowerCase();
  if (email && existing.reviewer_email && existing.reviewer_email.toLowerCase() !== email) {
    throw new Error('You can only edit your own review.');
  }

  const stars = Math.min(5, Math.max(1, Number(rating) || existing.rating));
  const isLow = stars <= 3;
  const now = new Date();

  const updates = {
    rating: stars,
    comment: comment !== undefined ? String(comment).trim() : existing.comment,
    image_url: imageUrl !== undefined ? imageUrl : existing.image_url,
  };

  if (isLow) {
    updates.status = existing.status === 'resolved' ? 'resolved' : 'pending_resolution';
    updates.is_public = false;
    updates.grace_deadline = toIso(addDays(now, GRACE_DAYS));
    updates.vendor_notified = true;
  } else {
    updates.status = 'published';
    updates.is_public = true;
    updates.grace_deadline = null;
    updates.resolved_at = existing.resolved_at;
  }

  const { data, error } = await supabase
    .from('reviews')
    .update(updates)
    .eq('id', reviewId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  if (existing.vendor_id) await refreshVendorRatingCache(existing.vendor_id);
  return normalizeReview(data);
}

export async function resolveVendorReview(reviewId, vendorId, resolutionNote) {
  const { data, error } = await supabase
    .from('reviews')
    .update({
      status: 'resolved',
      is_public: false,
      resolution_note: (resolutionNote || '').trim(),
      resolved_at: new Date().toISOString(),
      vendor_response: (resolutionNote || '').trim(),
    })
    .eq('id', reviewId)
    .eq('vendor_id', vendorId)
    .select()
    .single();

  if (error) throw new Error(error.message || 'Could not mark review resolved');
  return normalizeReview(data);
}

export async function fetchVendorsWithRatings({ minRating = 0, search = '' } = {}) {
  await processReviewDeadlines();

  let query = supabase
    .from('vendors')
    .select('*')
    .eq('status', 'approved')
    .order('avg_rating', { ascending: false })
    .order('review_count', { ascending: false });

  const { data, error } = await query;
  if (error) return [];

  let vendors = data || [];
  if (minRating > 0) {
    vendors = vendors.filter((v) => (Number(v.avg_rating) || 0) >= minRating);
  }
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    vendors = vendors.filter(
      (v) =>
        (v.name || '').toLowerCase().includes(q) ||
        (v.category || '').toLowerCase().includes(q)
    );
  }
  return vendors;
}