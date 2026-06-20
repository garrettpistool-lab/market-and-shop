import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from './CartContext';
import NavDropdown from './NavDropdown';
import { customerCan, getVendorContext, planBadgeLabel, vendorCan } from '../lib/plans';

function NavLink({ to, children, onNavigate }) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className="block px-3 py-2 hover:bg-gray-50 rounded-xl hover:text-[#083a9b]"
    >
      {children}
    </Link>
  );
}

export default function Layout({ user, onLogout, children }) {
  const { cart, total } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const vendorCtx = getVendorContext(user);
  const isVendor = user?.role?.toLowerCase() === 'vendor' || !!vendorCtx;
  const isCustomer = user?.role?.toLowerCase() === 'customer';
  const isGuest = user?.role?.toLowerCase() === 'guest';

  const closeMobile = () => setMobileOpen(false);

  const mainLinks = (
    <>
      <NavLink to="/" onNavigate={closeMobile}>Home</NavLink>
      <NavLink to="/marketplace" onNavigate={closeMobile}>Marketplace</NavLink>
      <NavLink to="/farmers-market" onNavigate={closeMobile}>Farmers Market</NavLink>
      <NavLink to="/top-vendors" onNavigate={closeMobile}>Top Vendors</NavLink>
    </>
  );

  const customerMenu = useMemo(() => {
    const items = [
      { label: 'Customer Portal', to: '/customer-portal', perm: null },
      { label: 'My Orders', to: '/orders', perm: 'track_orders' },
      { label: 'Favorites', to: '/favorites', perm: 'favorites' },
      { label: 'Support & Help', to: '/support', perm: 'support' },
      { label: 'Account Settings', to: '/account-settings', perm: null },
    ];
    return items.filter((i) => !i.perm || customerCan(user, i.perm));
  }, [user]);

  const guestMenu = [
    { label: 'Top Vendors (by rating)', to: '/top-vendors' },
    { label: 'Marketplace', to: '/marketplace' },
    { label: 'FAQ', to: '/faq' },
    { label: 'Account Settings', to: '/account-settings' },
  ];

  const vendorSellMenu = useMemo(() => {
    const items = [
      { label: 'Add Listings', to: '/vendor-dashboard', perm: 'sell' },
      { label: 'Storefront', to: '/storefront-settings', perm: 'bio_edit' },
      { label: 'Farmers Market', to: '/farmers-market', perm: 'sell' },
    ];
    return items.filter((i) => vendorCan(user, i.perm));
  }, [user]);

  const vendorManageMenu = useMemo(() => {
    const items = [
      { label: 'Performance & Analytics', to: '/vendor-dashboard#analytics', perm: 'analytics' },
      { label: 'Orders', to: '/orders', perm: 'orders' },
      { label: 'Tasks', to: '/tasks', perm: 'tasks' },
      { label: 'Invoices', to: '/invoices', perm: 'invoices' },
      { label: 'Documents', to: '/documents', perm: 'documents' },
    ];
    return items.filter((i) => vendorCan(user, i.perm));
  }, [user]);

  const adminMenu = [
    { label: '📊 Admin Portal', to: '/users?tab=overview' },
    { label: '👥 Users', to: '/users?tab=users' },
    { label: '🏪 Vendors', to: '/users?tab=vendors' },
    { label: '📦 Orders', to: '/users?tab=orders' },
    { label: '🍽️ Content', to: '/users?tab=content' },
    { label: '📈 Reports', to: '/users?tab=reports' },
  ];

  return (
    <div className="min-h-screen bg-[#f8f7f4]">
      <nav className="bg-white/95 backdrop-blur-md border-b border-[#e8e4d9] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-x-3">
            <Link to="/" className="flex items-center gap-x-3 group" onClick={closeMobile}>
              <div className="w-9 h-9 bg-gradient-to-br from-[#083a9b] via-[#0a4a7a] to-[#2f5f2f] rounded-2xl flex items-center justify-center shadow-inner ring-1 ring-black/5">
                <span className="text-white text-2xl drop-shadow">🌿</span>
              </div>
              <span className="font-bold text-2xl md:text-3xl tracking-[-1.5px] heading-font text-[#0f172a] group-hover:text-[#083a9b] transition-colors">Market and Shop</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-x-6 lg:gap-x-8 text-sm font-medium">
            <Link to="/" className="hover:text-[#083a9b] font-medium">Home</Link>
            <Link to="/marketplace" className="hover:text-[#083a9b]">Marketplace</Link>
            <Link to="/farmers-market" className="hover:text-[#083a9b]">Farmers Market</Link>
            <Link to="/top-vendors" className="hover:text-[#083a9b]">Top Vendors</Link>

            {isCustomer && <NavDropdown label="My Account" items={customerMenu} />}
            {isGuest && <NavDropdown label="Explore" items={guestMenu} />}

            {isVendor && vendorSellMenu.length > 0 && <NavDropdown label="Sell" items={vendorSellMenu} />}
            {isVendor && vendorManageMenu.length > 0 && <NavDropdown label="Manage" items={vendorManageMenu} />}
            {isVendor && vendorCan(user, 'analytics') && (
              <Link to="/vendor-dashboard" className="hover:text-[#083a9b] text-sm font-medium">Analytics</Link>
            )}

            {isAdmin && <NavDropdown label="Admin Menu" items={adminMenu} className="font-medium" />}
          </div>

          <div className="flex items-center gap-x-3 md:gap-x-4">
            {isCustomer && (
              <Link
                to="/orders"
                className="flex items-center gap-x-1.5 text-sm px-3 md:px-4 py-1.5 bg-[#f8f7f4] hover:bg-white border border-[#e8e4d9] rounded-3xl transition"
                title="Cart & Orders"
              >
                🛒 <span className="font-semibold tabular-nums">{cart.reduce((s, i) => s + (i.qty || 1), 0)}</span>
                {total > 0 && <span className="hidden sm:inline text-xs text-[#083a9b] ml-0.5 font-medium">${total.toFixed(0)}</span>}
              </Link>
            )}

            {user ? (
              <>
                <div className="text-right hidden lg:block">
                  <div className="font-semibold text-sm text-[#0f172a]">{user.name}</div>
                  <div className="text-[10px] text-[#64748b] -mt-0.5 capitalize">
                    {user.role}
                    {vendorCtx && ` • ${planBadgeLabel(vendorCtx.plan, 'vendor')}`}
                    {isCustomer && user.customer_plan && ` • ${planBadgeLabel(user.customer_plan, 'customer')}`}
                  </div>
                </div>
                <img src={user.avatar} className="w-8 h-8 rounded-2xl ring-1 ring-[#e8e4d9] object-cover hidden sm:block" alt="" />
                <button type="button" onClick={onLogout} className="hidden sm:block text-sm px-3 py-1.5 hover:bg-[#f8f7f4] rounded-3xl border border-transparent hover:border-[#e8e4d9]">
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="hidden sm:block px-5 py-2 bg-[#083a9b] hover:bg-[#062d7a] text-white rounded-3xl text-sm font-semibold shadow-sm">
                Log in
              </Link>
            )}

            <button
              type="button"
              className="md:hidden p-2 rounded-xl border border-[#e8e4d9]"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-[#e8e4d9] bg-white px-4 py-4 space-y-1 text-sm max-h-[70vh] overflow-y-auto">
            {mainLinks}
            {isCustomer && (
              <>
                <div className="text-xs font-semibold text-gray-400 px-3 pt-3">My Account</div>
                {customerMenu.map((item) => (
                  <NavLink key={item.to} to={item.to} onNavigate={closeMobile}>{item.label}</NavLink>
                ))}
              </>
            )}
            {isGuest && (
              <>
                <div className="text-xs font-semibold text-gray-400 px-3 pt-3">Explore</div>
                {guestMenu.map((item) => (
                  <NavLink key={item.to} to={item.to} onNavigate={closeMobile}>{item.label}</NavLink>
                ))}
              </>
            )}
            {isVendor && (
              <>
                <div className="text-xs font-semibold text-gray-400 px-3 pt-3">Vendor</div>
                <NavLink to="/vendor-dashboard" onNavigate={closeMobile}>Analytics & Listings</NavLink>
                <NavLink to="/orders" onNavigate={closeMobile}>Orders</NavLink>
                <NavLink to="/storefront-settings" onNavigate={closeMobile}>Storefront</NavLink>
              </>
            )}
            {isAdmin && (
              <NavLink to="/users?tab=overview" onNavigate={closeMobile}>Admin Portal</NavLink>
            )}
            {user ? (
              <button type="button" onClick={() => { closeMobile(); onLogout(); }} className="w-full text-left px-3 py-2 border rounded-xl mt-3">Logout ({user.role})</button>
            ) : (
              <NavLink to="/login" onNavigate={closeMobile}>Log in</NavLink>
            )}
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
        {children}
      </main>

      <footer className="border-t bg-white mt-12 py-8 text-sm text-gray-500">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col md:flex-row justify-between gap-y-2">
          <div>© {new Date().getFullYear()} Market and Shop • Local Vendor Marketplace</div>
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <Link to="/faq">FAQ</Link>
            <Link to="/agreements">Terms</Link>
            <Link to="/top-vendors">Top Vendors</Link>
            <Link to="/customer-use-agreement">Customer Agreement</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}