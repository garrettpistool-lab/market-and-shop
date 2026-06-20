import { supabase } from './supabaseClient';
import {
  FREE_VENDOR_EMPLOYEE_LIMIT,
  PAID_VENDOR_EMPLOYEE_LIMIT,
  VENDOR_PERMISSIONS,
  vendorPermissionsForPlan,
} from './plans';

export function availablePermissionsForVendorPlan(plan) {
  return vendorPermissionsForPlan(plan).map((key) => ({
    key,
    ...VENDOR_PERMISSIONS[key],
  }));
}

export async function fetchVendorEmployees(vendorId) {
  if (!vendorId) return [];
  const { data, error } = await supabase
    .from('vendor_employees')
    .select('*')
    .eq('vendor_id', Number(vendorId))
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('fetchVendorEmployees:', error.message);
    return [];
  }
  return (data || []).map((row) => ({
    ...row,
    permissions: Array.isArray(row.permissions) ? row.permissions : [],
  }));
}

export async function fetchEmployeeRecord(email) {
  const normalized = (email || '').trim().toLowerCase();
  if (!normalized) return null;

  const { data, error } = await supabase
    .from('vendor_employees')
    .select('*, vendors(plan)')
    .ilike('employee_email', normalized)
    .eq('active', true)
    .limit(1);

  if (error || !data?.length) return null;
  const row = data[0];
  return {
    vendor_id: row.vendor_id,
    permissions: Array.isArray(row.permissions) ? row.permissions : [],
    vendor_plan: row.vendors?.plan || 'free',
  };
}

export function employeeLimitForPlan(plan) {
  return (plan || 'free').toLowerCase() === 'paid'
    ? PAID_VENDOR_EMPLOYEE_LIMIT
    : FREE_VENDOR_EMPLOYEE_LIMIT;
}

export async function addVendorEmployee({ vendorId, email, permissions, plan }) {
  const limit = employeeLimitForPlan(plan);
  const existing = await fetchVendorEmployees(vendorId);
  const activeCount = existing.filter((e) => e.active !== false).length;

  if (activeCount >= limit) {
    throw new Error(
      limit === 1
        ? 'Free plan allows only 1 employee. Upgrade to Paid for unlimited staff.'
        : `Employee limit reached (${limit}).`
    );
  }

  const allowed = vendorPermissionsForPlan(plan);
  const filteredPerms = (permissions || []).filter((p) => allowed.includes(p));
  const normalizedEmail = email.trim().toLowerCase();

  const { data, error } = await supabase
    .from('vendor_employees')
    .upsert(
      {
        vendor_id: Number(vendorId),
        employee_email: normalizedEmail,
        permissions: filteredPerms,
        active: true,
      },
      { onConflict: 'vendor_id,employee_email' }
    )
    .select()
    .single();

  if (error) throw new Error(error.message || 'Could not add employee');
  return data;
}

export async function updateEmployeePermissions(employeeId, permissions, plan) {
  const allowed = vendorPermissionsForPlan(plan);
  const filteredPerms = (permissions || []).filter((p) => allowed.includes(p));

  const { data, error } = await supabase
    .from('vendor_employees')
    .update({ permissions: filteredPerms })
    .eq('id', employeeId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function removeVendorEmployee(employeeId) {
  const { error } = await supabase
    .from('vendor_employees')
    .update({ active: false })
    .eq('id', employeeId);

  if (error) throw new Error(error.message);
}