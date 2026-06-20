import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

function AdminHome({ user, liveStats }) {
  const sections = [
    { tab: 'overview', title: 'Overview', desc: 'Platform snapshot and live activity', icon: '📊' },
    { tab: 'users', title: 'User Management', desc: 'Roles, accounts, and access control', icon: '👥' },
    { tab: 'vendors', title: 'Vendor Approvals', desc: 'Review and approve new vendors', icon: '🏪' },
    { tab: 'orders', title: 'Orders', desc: 'All transactions across the platform', icon: '📦' },
    { tab: 'content', title: 'Content', desc: 'Listings, menu items, and produce', icon: '🍽️' },
    { tab: 'reports', title: 'Analytics', desc: 'Live counts and performance reports', icon: '📈' },
    { tab: 'support', title: 'Support', desc: 'Issues, settings, and platform health', icon: '🛟' },
  ];

  return (
    <div>
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-[#083a9b]/20 bg-gradient-to-br from-[#083a9b] via-[#0a4a7a] to-[#0f172a] text-white p-10 md:p-14">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 mb-4 text-[10px] tracking-[3px] font-mono border border-white/25 px-4 py-1 rounded-full bg-white/10">
            ADMIN CONTROL CENTER
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
            Welcome back, {user?.name || 'Admin'}
          </h1>
          <p className="text-white/75 text-lg mb-8 max-w-xl">
            Manage users, vendors, orders, and platform content from one place. This is your command center — not the customer storefront.
          </p>
          <div className="flex flex-wrap gap-3 mb-6">
            <Link to="/users?tab=overview" className="px-8 py-3.5 bg-white text-[#083a9b] rounded-3xl font-semibold hover:bg-[#f1e9d8] transition">
              Open Admin Portal
            </Link>
            <Link to="/dashboard" className="px-8 py-3.5 border border-white/40 hover:bg-white/10 rounded-3xl font-medium transition">
              Vendor Dashboard View
            </Link>
          </div>
          <div className="text-[10px] tracking-widest text-white/50 font-mono">
            LIVE: {liveStats.vendors} VENDORS • {liveStats.items} ITEMS • {liveStats.orders} ORDERS
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {sections.map((s) => (
          <Link
            key={s.tab}
            to={`/users?tab=${s.tab}`}
            className="bg-white border rounded-3xl p-6 hover:shadow-md hover:border-[#083a9b]/30 transition block"
          >
            <div className="text-2xl mb-2">{s.icon}</div>
            <h3 className="font-semibold text-lg">{s.title}</h3>
            <p className="text-sm text-gray-600 mt-1">{s.desc}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 p-5 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-900">
        <strong>Testing tip:</strong> If you still see customer nav after login, clear browser storage (localStorage key <code className="text-xs">mas_user</code>) and log in again. Your Supabase <code className="text-xs">users</code> row must have <code className="text-xs">role = admin</code> for the same email.
      </div>
    </div>
  );
}

function VendorHome({ liveStats }) {
  return (
    <div>
      <div className="mb-8 rounded-3xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-10">
        <h1 className="text-4xl font-bold tracking-tight mb-3">Vendor Dashboard</h1>
        <p className="text-gray-600 mb-6 max-w-xl">Manage your storefront, listings, orders, and grow your local business.</p>
        <div className="flex flex-wrap gap-3">
          <Link to="/vendor-dashboard" className="px-8 py-3.5 bg-[#083a9b] text-white rounded-3xl font-semibold">Go to Dashboard</Link>
          <Link to="/storefront-settings" className="px-8 py-3.5 border rounded-3xl font-medium">Edit Storefront</Link>
        </div>
        <div className="mt-4 text-xs text-gray-500 font-mono tracking-wider">
          PLATFORM LIVE: {liveStats.vendors} VENDORS • {liveStats.items} ITEMS
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/vendor-dashboard" className="bg-white border rounded-3xl p-6 hover:shadow-sm transition block">
          <h3 className="font-semibold text-xl">Add Listings</h3>
          <p className="text-sm text-gray-600 mt-2">Menu items, produce, and pricing tools.</p>
        </Link>
        <Link to="/farmers-market" className="bg-white border border-green-200 rounded-3xl p-6 hover:shadow-sm transition block">
          <h3 className="font-semibold text-xl">Farmers Market</h3>
          <p className="text-sm text-gray-600 mt-2">Sell raw goods and wholesale produce.</p>
        </Link>
        <Link to="/orders" className="bg-white border rounded-3xl p-6 hover:shadow-sm transition block">
          <h3 className="font-semibold text-xl">Incoming Orders</h3>
          <p className="text-sm text-gray-600 mt-2">Track and fulfill customer orders in real time.</p>
        </Link>
      </div>
    </div>
  );
}

function CustomerHome({ liveStats }) {
  return (
    <div>
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-[#d4c9b0]/60 bg-[#0a0f0a] text-white p-10 md:p-14 lg:p-16 flex flex-col lg:flex-row gap-10 lg:gap-16 items-center">
        <div className="absolute inset-0" style={{
          background: `
            linear-gradient(145deg, #0a0f0a 0%, #132a1f 28%, #0f1c14 55%, #0a0f0a 92%),
            url('https://picsum.photos/id/1016/1800/1200') center/cover,
            url('https://picsum.photos/id/292/900/700') center/cover
          `,
          backgroundBlendMode: 'multiply, screen',
          opacity: 0.92
        }}></div>
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{
          backgroundImage: 'repeating-linear-gradient(120deg, transparent, transparent 2px, rgba(255,255,255,0.6) 2px, rgba(255,255,255,0.6) 3px)'
        }}></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.65)_82%)]"></div>

        <div className="relative z-10 flex-1 max-w-[620px]">
          <div className="inline-flex items-center gap-2 mb-5 text-[10px] tracking-[3.5px] font-mono border border-white/25 px-5 py-1 rounded-full bg-white/5">EST. JUNE 15, 2026 • DIRECT • NO MIDDLEMEN</div>
          
          <h1 className="text-[68px] md:text-[92px] leading-[0.86] font-semibold tracking-[-6.4px] mb-6 drop-shadow-sm">
            Real food.<br />Real people.<br />Real impact.
          </h1>
          <p className="text-2xl md:text-[26px] text-white/75 max-w-md tracking-[-0.2px] mb-10">Farmers and makers. No warehouses. Taste what honest food actually is.</p>
          
          <div className="flex flex-wrap gap-3">
            <Link to="/marketplace" className="inline-flex items-center justify-center px-10 py-4 bg-white text-[#0a0f0a] rounded-3xl font-semibold text-[17px] hover:bg-[#f1e9d8] active:scale-[0.985] transition shadow-xl">Shop the Market</Link>
            <Link to="/farmers-market" className="inline-flex items-center justify-center px-10 py-4 border border-white/50 hover:bg-white/10 hover:border-white/70 rounded-3xl font-medium text-[17px] transition backdrop-blur">Explore the Harvest →</Link>
          </div>
          <div className="mt-6 text-[10px] tracking-widest text-white/50 font-mono">LIVE RIGHT NOW: {liveStats.vendors} VENDORS • {liveStats.items} ITEMS AVAILABLE</div>
        </div>

        <div className="relative z-10 flex-1 max-w-lg w-full hidden lg:block">
          <div className="relative aspect-[16/11] rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10">
            <img src="https://picsum.photos/id/1016/820/620" className="absolute inset-0 w-full h-full object-cover" alt="Abundant local harvest" />
            <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/30 to-transparent mix-blend-multiply"></div>
            <img src="https://picsum.photos/id/312/420/300" className="absolute bottom-0 right-0 w-2/3 h-2/3 object-cover opacity-80 mix-blend-luminosity rounded-tl-[120px]" alt="Fresh produce detail" />
            <div className="absolute inset-0 border border-white/10 rounded-3xl"></div>
            <div className="absolute top-6 left-6 bg-black/60 backdrop-blur px-3.5 py-1 rounded-full text-xs tracking-[2px] font-mono border border-white/20">HARVESTED TODAY</div>
            <div className="absolute bottom-6 left-6 text-sm font-medium tracking-tight">SOURCED WITH INTENTION<br /><span className="text-white/60 text-xs">— from soil to your table in &lt;24 hrs</span></div>
            <div className="absolute bottom-6 right-6 px-3 py-px text-[10px] bg-emerald-600/90 text-white rounded tracking-widest font-mono">LIVE • REAL LOCAL</div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/top-vendors" className="bg-white border rounded-3xl p-6 hover:shadow-sm transition block">
          <h3 className="font-semibold text-xl">Top Vendors</h3>
          <p className="text-sm text-gray-600 mt-2">Discover the best local culinary partners.</p>
        </Link>
        <Link to="/marketplace" className="bg-white border rounded-3xl p-6 hover:shadow-sm transition block">
          <h3 className="font-semibold text-xl">Marketplace</h3>
          <p className="text-sm text-gray-600 mt-2">Browse and order from hundreds of dishes.</p>
        </Link>
        <Link to="/farmers-market" className="bg-white border border-green-200 rounded-3xl p-6 hover:shadow-sm transition block">
          <h3 className="font-semibold text-xl">🌾 Farmers Market</h3>
          <p className="text-sm text-gray-600 mt-2">Fresh produce, eggs, honey &amp; raw goods direct from farms.</p>
        </Link>
        <Link to="/customer-portal" className="bg-white border rounded-3xl p-6 hover:shadow-sm transition block">
          <h3 className="font-semibold text-xl">Customer Portal</h3>
          <p className="text-sm text-gray-600 mt-2">Your orders, favorites, and account.</p>
        </Link>
        <Link to="/faq" className="bg-white border rounded-3xl p-6 hover:shadow-sm transition block">
          <h3 className="font-semibold text-xl">FAQ &amp; Support</h3>
          <p className="text-sm text-gray-600 mt-2">Everything you need to know.</p>
        </Link>
      </div>
    </div>
  );
}

export default function Home({ user }) {
  const [liveStats, setLiveStats] = useState({ vendors: 0, items: 0, orders: 0 });
  const role = user?.role?.toLowerCase();

  useEffect(() => {
    const fetchLive = async () => {
      const [v, m, p, o] = await Promise.all([
        supabase.from('vendors').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('menu_items').select('*', { count: 'exact', head: true }).eq('approved', 1),
        supabase.from('produce_items').select('*', { count: 'exact', head: true }).eq('approved', 1),
        supabase.from('orders').select('*', { count: 'exact', head: true })
      ]);
      setLiveStats({
        vendors: v.count || 0,
        items: (m.count || 0) + (p.count || 0),
        orders: o.count || 0
      });
    };
    fetchLive();
  }, []);

  if (role === 'admin') return <AdminHome user={user} liveStats={liveStats} />;
  if (role === 'vendor') return <VendorHome liveStats={liveStats} />;
  return <CustomerHome liveStats={liveStats} />;
}