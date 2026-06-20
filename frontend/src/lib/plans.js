/** Vendor & customer tier permissions for Market and Shop */

export const VENDOR_PERMISSIONS = {
  sell: { label: 'Selling & listings', description: 'Add menu and produce items' },
  bio_edit: { label: 'Bio editor', description: 'Edit store bio and slogan' },
  profile_editor: { label: 'Profile pictures', description: 'Logo and highlight photo' },
  ratings: { label: 'Ratings & reviews', description: 'View and respond to reviews' },
  analytics: { label: 'Analytics', description: 'Performance dashboard and charts' },
  orders: { label: 'Orders', description: 'View and manage incoming orders' },
  invoices: { label: 'Invoices', description: 'Billing and invoices' },
  tasks: { label: 'Tasks', description: 'Team task management' },
  documents: { label: 'Documents', description: 'Document storage' },
  employees: { label: 'Employees', description: 'Invite and manage staff' },
  theme: { label: 'Theme color', description: 'Customize storefront accent color (paid)' },
  banners: { label: 'Banner gallery', description: 'Upload banner images (paid)' },
};

export const FREE_VENDOR_PERMISSIONS = ['sell', 'bio_edit', 'profile_editor', 'ratings', 'employees'];
export const PAID_VENDOR_PERMISSIONS = Object.keys(VENDOR_PERMISSIONS);

export const CUSTOMER_PERMISSIONS = {
  buy: { label: 'Buy & checkout', description: 'Place orders from vendors' },
  track_orders: { label: 'Track orders', description: 'View order history and status' },
  delivery_connect: { label: 'Uber / DoorDash', description: 'Link delivery apps for tracking' },
  profile_editor: { label: 'Profile picture', description: 'Upload your avatar' },
  ratings: { label: 'Leave ratings', description: 'Rate vendors after qualifying purchases' },
  favorites: { label: 'Favorites', description: 'Save favorite vendors and items' },
  loyalty: { label: 'Loyalty rewards', description: 'Earn and redeem loyalty points' },
  support: { label: 'Priority support', description: 'Support tickets and help' },
  premium_express: { label: 'Premium express', description: 'Faster checkout options' },
};

export const FREE_CUSTOMER_PERMISSIONS = ['buy', 'track_orders', 'delivery_connect', 'profile_editor'];
export const PAID_CUSTOMER_PERMISSIONS = Object.keys(CUSTOMER_PERMISSIONS);

export const FREE_VENDOR_EMPLOYEE_LIMIT = 1;
export const PAID_VENDOR_EMPLOYEE_LIMIT = 50;
export const FREE_CUSTOMER_RATING_MIN_PURCHASES = 15;

export function vendorPermissionsForPlan(plan) {
  return (plan || 'free').toLowerCase() === 'paid'
    ? [...PAID_VENDOR_PERMISSIONS]
    : [...FREE_VENDOR_PERMISSIONS];
}

export function customerPermissionsForPlan(plan) {
  return (plan || 'free').toLowerCase() === 'paid'
    ? [...PAID_CUSTOMER_PERMISSIONS]
    : [...FREE_CUSTOMER_PERMISSIONS];
}

/** Resolve vendor context: owner, employee, or admin */
export function getVendorContext(user) {
  if (!user) return null;

  const role = (user.role || '').toLowerCase();
  if (role === 'admin') {
    const vendorId = user.vendor_id || user.vendor;
    return {
      vendorId,
      plan: user.vendor_plan || 'paid',
      permissions: PAID_VENDOR_PERMISSIONS,
      isOwner: true,
      isEmployee: false,
      isAdmin: true,
    };
  }

  if (user.employee_vendor_id) {
    const plan = user.employee_vendor_plan || 'free';
    const allowedOnPlan = vendorPermissionsForPlan(plan);
    const empPerms = (user.employee_permissions || []).filter((p) => allowedOnPlan.includes(p));
    return {
      vendorId: user.employee_vendor_id,
      plan,
      permissions: empPerms,
      isOwner: false,
      isEmployee: true,
      isAdmin: false,
    };
  }

  if (role === 'vendor') {
    const vendorId = user.vendor_id || user.vendor;
    const plan = user.vendor_plan || 'free';
    return {
      vendorId,
      plan,
      permissions: vendorPermissionsForPlan(plan),
      isOwner: true,
      isEmployee: false,
      isAdmin: false,
    };
  }

  return null;
}

export function vendorCan(user, permission) {
  const ctx = getVendorContext(user);
  if (!ctx) return false;
  if (ctx.isAdmin) return true;
  return ctx.permissions.includes(permission);
}

export function getCustomerContext(user) {
  if (!user) return null;
  const plan = user.customer_plan || 'free';
  const purchaseCount = Number(user.purchase_count) || 0;
  const perms = customerPermissionsForPlan(plan);

  const canRate =
    plan === 'paid' ||
    purchaseCount >= FREE_CUSTOMER_RATING_MIN_PURCHASES ||
    (user.role || '').toLowerCase() === 'admin';

  return {
    plan,
    purchaseCount,
    permissions: canRate ? perms : perms.filter((p) => p !== 'ratings'),
    canRate,
    purchasesUntilRating: Math.max(0, FREE_CUSTOMER_RATING_MIN_PURCHASES - purchaseCount),
  };
}

export function customerCan(user, permission) {
  if (!user) return false;
  if ((user.role || '').toLowerCase() === 'admin') return true;
  const ctx = getCustomerContext(user);
  return ctx?.permissions.includes(permission) ?? false;
}

export function planBadgeLabel(plan, type = 'vendor') {
  const p = (plan || 'free').toLowerCase();
  if (type === 'vendor') return p === 'paid' ? 'Paid Vendor' : 'Free Vendor';
  return p === 'paid' ? 'Premium Member' : 'Free Member';
}