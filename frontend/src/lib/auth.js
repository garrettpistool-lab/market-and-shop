import { supabase } from './supabaseClient';
import { fetchEmployeeRecord } from './employeesApi';

const API_BASE = import.meta.env.VITE_API_URL || '';

function normalizeProfile(raw) {
  if (!raw) return null;
  return {
    ...raw,
    role: (raw.role || 'guest').toLowerCase(),
    vendor: raw.vendor_id || raw.vendor || null,
    vendor_id: raw.vendor_id || raw.vendor || null,
    vendor_plan: raw.vendor_plan || 'free',
    customer_plan: raw.customer_plan || 'free',
    purchase_count: Number(raw.purchase_count) || 0,
    doordash_linked: !!raw.doordash_linked,
    ubereats_linked: !!raw.ubereats_linked,
    avatar: raw.avatar || `https://i.pravatar.cc/32?u=${encodeURIComponent(raw.email || raw.name || 'user')}`,
    employee_vendor_id: raw.employee_vendor_id || null,
    employee_permissions: raw.employee_permissions || [],
    employee_vendor_plan: raw.employee_vendor_plan || null,
  };
}

async function enrichProfile(profile) {
  if (!profile?.email) return profile;

  const { data: row } = await supabase
    .from('users')
    .select('customer_plan, purchase_count, doordash_linked, ubereats_linked, avatar, vendor_id')
    .ilike('email', profile.email.trim())
    .maybeSingle();

  if (row) {
    profile.customer_plan = row.customer_plan || profile.customer_plan;
    profile.purchase_count = Number(row.purchase_count) || 0;
    profile.doordash_linked = !!row.doordash_linked;
    profile.ubereats_linked = !!row.ubereats_linked;
    if (row.avatar) profile.avatar = row.avatar;
    if (row.vendor_id) {
      profile.vendor_id = row.vendor_id;
      profile.vendor = row.vendor_id;
    }
  }

  const vendorId = profile.vendor_id || profile.vendor;
  if (profile.role === 'vendor' && vendorId) {
    const { data: vendor } = await supabase
      .from('vendors')
      .select('plan')
      .eq('id', Number(vendorId))
      .maybeSingle();
    profile.vendor_plan = vendor?.plan || 'free';
  }

  const emp = await fetchEmployeeRecord(profile.email);
  if (emp && profile.role !== 'vendor') {
    profile.employee_vendor_id = emp.vendor_id;
    profile.employee_permissions = emp.permissions;
    profile.employee_vendor_plan = emp.vendor_plan;
  }

  return profile;
}

export function getPostLoginPath(role) {
  switch ((role || '').toLowerCase()) {
    case 'admin':
      return '/users?tab=overview';
    case 'vendor':
      return '/vendor-dashboard';
    case 'customer':
      return '/customer-portal';
    default:
      return '/';
  }
}

async function fetchSupabaseProfile(email) {
  const normalized = email.trim().toLowerCase();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .ilike('email', normalized)
    .limit(1);

  if (error) {
    console.warn('Supabase profile lookup failed:', error.message);
    return null;
  }
  if (!data?.[0]) return null;
  const base = normalizeProfile(data[0]);
  return enrichProfile(base);
}

async function fetchBackendProfile(email) {
  try {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.needs2FA) return normalizeProfile(data.user);
    return data.user ? normalizeProfile(data.user) : null;
  } catch (e) {
    console.warn('Backend login unavailable:', e.message);
    return null;
  }
}

export async function resolveProfile(email, authUserId) {
  const supabaseProfile = await fetchSupabaseProfile(email);
  if (supabaseProfile) return supabaseProfile;

  const backendProfile = await fetchBackendProfile(email);
  if (backendProfile && backendProfile.role !== 'guest') {
    return enrichProfile(normalizeProfile(backendProfile));
  }

  if (authUserId) {
    return enrichProfile(
      normalizeProfile({
        id: authUserId,
        name: email.split('@')[0] || 'User',
        email: email.trim().toLowerCase(),
        role: 'customer',
      })
    );
  }

  const fallback = backendProfile || normalizeProfile({ id: 999, name: 'Guest', email, role: 'guest' });
  return enrichProfile(fallback);
}

export async function signIn(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const authMode = (import.meta.env.VITE_AUTH_MODE || 'hybrid').toLowerCase();

  if (authMode === 'backend') {
    const profile = await fetchBackendProfile(normalizedEmail);
    if (!profile || profile.role === 'guest') {
      throw new Error('No account found. Start the backend (npm start in /backend) or use Supabase auth.');
    }
    return profile;
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (authError) {
    if (authMode === 'supabase') {
      throw authError;
    }
    const backendProfile = await fetchBackendProfile(normalizedEmail);
    if (backendProfile && backendProfile.role !== 'guest') {
      return backendProfile;
    }
    const fallbackProfile = await fetchSupabaseProfile(normalizedEmail);
    if (fallbackProfile) return fallbackProfile;
    throw new Error(authError.message || 'Sign in failed. Check your email and password.');
  }

  return resolveProfile(normalizedEmail, authData.user?.id);
}

export async function restoreSession() {
  const cached = localStorage.getItem('mas_user');
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed?.email && parsed.auth_provider === 'auth0') {
        return enrichProfile(normalizeProfile(parsed));
      }
    } catch {
      /* ignore bad cache */
    }
  }

  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user?.email) {
    const profile = await resolveProfile(session.user.email, session.user.id);
    localStorage.setItem('mas_user', JSON.stringify(profile));
    return profile;
  }

  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed?.email) return enrichProfile(normalizeProfile(parsed));
    } catch {
      /* ignore */
    }
  }

  return null;
}

export async function signOut() {
  localStorage.removeItem('mas_user');
  await supabase.auth.signOut();
}