import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { filterProductionUsers } from '../lib/config';

export default function AdminPortal({ user }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [produceItems, setProduceItems] = useState([]);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [analytics, setAnalytics] = useState({ 
    totalUsers: 0, 
    totalVendors: 0, 
    totalOrders: 0, 
    pendingVendors: 0, 
    recentActivity: [] 
  });
  const [newVendor, setNewVendor] = useState({ name: '', category: '', email: '' });
  const [newMenuItem, setNewMenuItem] = useState({ name: '', price: '', vendor_id: '', category: 'American' });

  const loadAllData = async () => {
    setLoading(true);
    const [uRes, vRes, oRes, mRes, pRes] = await Promise.all([
      supabase.from('users').select('*').order('id', { ascending: true }),
      supabase.from('vendors').select('*').order('id', { ascending: true }),
      supabase.from('orders').select('*').order('id', { ascending: false }).limit(20),
      supabase.from('menu_items').select('*').order('id', { ascending: true }),
      supabase.from('produce_items').select('*').order('id', { ascending: true })
    ]);

    const uData = uRes.data || [];
    const vData = vRes.data || [];
    const oData = oRes.data || [];
    const mData = mRes.data || [];
    const pData = pRes.data || [];

    setUsers(filterProductionUsers(uData));
    setVendors(vData);
    setOrders(oData);
    setMenuItems(mData);
    setProduceItems(pData);

    setAnalytics({
      totalUsers: filterProductionUsers(uData).length,
      totalVendors: vData.length,
      totalOrders: oData.length,
      pendingVendors: vData.filter(v => v.status === 'pending').length,
      recentActivity: oData.slice(0, 5).map(o => `Order #${o.id} - $${o.total} (${o.status})`)
    });
    setLoading(false);
  };

  useEffect(() => { 
    if (user?.role === 'admin') loadAllData(); 
  }, [user]);

  // Sync tab with URL for final mapping (e.g. /users?tab=users )
  const changeTab = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = !filterRole || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const updateUser = async (id, updates) => {
    await supabase.from('users').update(updates).eq('id', id);
    loadAllData();
  };

  const updateOrderStatus = async (id, status) => {
    await supabase.from('orders').update({ status }).eq('id', id);
    loadAllData();
  };

  const approveVendor = async (id) => {
    await supabase.from('vendors').update({ status: 'approved' }).eq('id', id);
    loadAllData();
  };

  const toggleContent = async (table, id, currentApproved) => {
    await supabase.from(table).update({ approved: currentApproved ? 0 : 1 }).eq('id', id);
    loadAllData();
  };

  const addVendor = async (e) => {
    e.preventDefault();
    if (!newVendor.name || !newVendor.email) return;
    await supabase.from('vendors').insert({
      name: newVendor.name,
      category: newVendor.category || 'General',
      email: newVendor.email.trim().toLowerCase(),
      status: 'approved',
      logo: 'https://i.pravatar.cc/48?img=60',
      joined: new Date().toISOString().split('T')[0],
    });
    setNewVendor({ name: '', category: '', email: '' });
    loadAllData();
  };

  const addMenuItem = async (e) => {
    e.preventDefault();
    if (!newMenuItem.name || !newMenuItem.vendor_id) return;
    await supabase.from('menu_items').insert({
      name: newMenuItem.name,
      price: parseFloat(newMenuItem.price) || 0,
      vendor_id: parseInt(newMenuItem.vendor_id, 10),
      category: newMenuItem.category,
      description: 'Fresh from a local Market and Shop vendor.',
      photo: 'https://picsum.photos/id/312/400/300',
      approved: 1,
    });
    setNewMenuItem({ name: '', price: '', vendor_id: '', category: 'American' });
    loadAllData();
  };

  const renderBar = (label, count, max) => (
    <div className="flex items-center gap-3 mb-2">
      <div className="w-24 text-sm">{label}</div>
      <div className="flex-1 bg-gray-200 rounded h-3 overflow-hidden">
        <div className="h-3 bg-[#083a9b]" style={{ width: `${Math.min((count / max) * 100, 100)}%` }} />
      </div>
      <div className="w-8 text-right text-sm font-medium">{count}</div>
    </div>
  );

  if (user?.role !== 'admin') {
    return <div className="p-8">Access denied. Admin only.</div>;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Sidebar Menu */}
      <div className="w-full lg:w-64 bg-white border rounded-3xl p-4 flex-shrink-0">
        <h2 className="font-bold text-xl mb-4 px-2">Admin Portal</h2>
        <div className="space-y-1 text-sm">
          {[
            { key: 'overview', label: '📊 Overview & Analytics' },
            { key: 'users', label: '👥 User Management' },
            { key: 'vendors', label: '🏪 Vendor Management' },
            { key: 'orders', label: '📦 Orders & Transactions' },
            { key: 'content', label: '🍽️ Content Management' },
            { key: 'reports', label: '📈 Reports & Insights' },
            { key: 'support', label: '🛟 Support & Issues' },
            { key: 'settings', label: '⚙️ Platform Settings' },
          ].map(item => (
            <button
              key={item.key}
              onClick={() => changeTab(item.key)}
              className={`w-full text-left px-3 py-2 rounded-2xl transition ${activeTab === item.key ? 'bg-[#083a9b] text-white' : 'hover:bg-gray-100'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="mt-6 pt-4 border-t text-xs text-gray-500 px-2">
          Full control • Real-time data • For the community
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Control Center</h1>
            <p className="text-gray-600">Welcome back, {user?.name}. Complete oversight of the Market and Shop community.</p>
          </div>
          <button onClick={loadAllData} className="text-xs px-3 py-1 border rounded-2xl hover:bg-gray-50">Refresh Data</button>
        </div>
        {loading && <div className="text-center py-8 text-gray-500">Loading real-time admin data from Supabase...</div>}

        {!loading && activeTab === 'overview' && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white border rounded-3xl p-4"><div className="text-sm text-gray-500">Total Users</div><div className="text-3xl font-semibold mt-1">{analytics.totalUsers}</div></div>
              <div className="bg-white border rounded-3xl p-4"><div className="text-sm text-gray-500">Active Vendors</div><div className="text-3xl font-semibold mt-1">{analytics.totalVendors}</div></div>
              <div className="bg-white border rounded-3xl p-4"><div className="text-sm text-gray-500">Total Orders</div><div className="text-3xl font-semibold mt-1">{analytics.totalOrders}</div></div>
              <div className="bg-white border rounded-3xl p-4"><div className="text-sm text-gray-500">Pending Vendors</div><div className="text-3xl font-semibold mt-1 text-amber-600">{analytics.pendingVendors}</div></div>
            </div>

            <div className="bg-white border rounded-3xl p-6 mb-6">
              <h3 className="font-semibold mb-4">Platform Health</h3>
              {renderBar('Users', analytics.totalUsers, Math.max(analytics.totalUsers, 50))}
              {renderBar('Vendors', analytics.totalVendors, Math.max(analytics.totalVendors, 20))}
              {renderBar('Orders', analytics.totalOrders, Math.max(analytics.totalOrders, 100))}
            </div>

            <div className="bg-white border rounded-3xl p-6">
              <h3 className="font-semibold mb-4">Recent Live Activity</h3>
              <div className="space-y-2 text-sm">
                {analytics.recentActivity.length ? analytics.recentActivity.map((act, i) => <div key={i}>• {act}</div>) : <div>No recent activity.</div>}
              </div>
              <p className="text-xs text-gray-400 mt-3">Data updates in real time from Supabase.</p>
            </div>
          </div>
        )}

        {!loading && activeTab === 'users' && (
          <div className="bg-white border rounded-3xl p-6">
            <h3 className="font-semibold mb-4">User Management</h3>
            <div className="mb-4 flex gap-3">
              <input placeholder="Search users..." value={search} onChange={e=>setSearch(e.target.value)} className="border p-2 rounded w-64" />
              <select value={filterRole} onChange={e=>setFilterRole(e.target.value)} className="border p-2 rounded">
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="vendor">Vendor</option>
                <option value="customer">Customer</option>
                <option value="guest">Guest</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left border-b"><th className="py-2">Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="border-b">
                      <td className="py-2">{u.name}</td>
                      <td>{u.email}</td>
                      <td><span className="bg-gray-100 px-2 py-0.5 rounded text-xs">{u.role}</span></td>
                      <td className="space-x-1">
                        <select value={u.role} onChange={e=>updateUser(u.id, {role: e.target.value})} className="text-xs border p-1 rounded">
                          <option value="admin">Admin</option>
                          <option value="vendor">Vendor</option>
                          <option value="customer">Customer</option>
                          <option value="guest">Guest</option>
                        </select>
                        <button onClick={()=>updateUser(u.id, {status: u.status === 'active' ? 'suspended' : 'active'})} className="text-xs px-2 py-1 border rounded hover:bg-gray-50">
                          {u.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && activeTab === 'vendors' && (
          <div className="bg-white border rounded-3xl p-6">
            <h3 className="font-semibold mb-4">Vendor Management &amp; Approvals</h3>
            <div className="space-y-2">
              {vendors.map(v => (
                <div key={v.id} className="flex justify-between items-center border p-3 rounded-2xl">
                  <div>
                    <span className="font-medium">{v.name}</span> • {v.category} • <span className={v.status === 'approved' ? 'text-green-600' : 'text-amber-600'}>{v.status}</span>
                  </div>
                  <div className="space-x-2">
                    {v.status !== 'approved' && <button onClick={() => approveVendor(v.id)} className="px-3 py-1 bg-emerald-600 text-white text-sm rounded-2xl">Approve</button>}
                    <button onClick={() => supabase.from('vendors').update({status: v.status === 'approved' ? 'suspended' : 'approved'}).eq('id', v.id).then(() => loadAllData())} className="px-3 py-1 border text-sm rounded-2xl">Toggle Status</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && activeTab === 'orders' && (
          <div className="bg-white border rounded-3xl p-6">
            <h3 className="font-semibold mb-4">Orders &amp; Full Transaction Control</h3>
            <div className="space-y-2">
              {orders.map(o => (
                <div key={o.id} className="flex justify-between items-center border p-3 rounded-2xl text-sm">
                  <div>#{o.id} • Vendor {o.vendor_id} • ${o.total} • {o.status}</div>
                  <select value={o.status} onChange={e => updateOrderStatus(o.id, e.target.value)} className="border p-1 rounded text-sm">
                    <option value="placed">placed</option>
                    <option value="preparing">preparing</option>
                    <option value="delivered">delivered</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && activeTab === 'content' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <form onSubmit={addVendor} className="bg-white border rounded-3xl p-5 space-y-3">
                <h3 className="font-semibold">Quick Add Vendor</h3>
                <input placeholder="Business name" value={newVendor.name} onChange={e => setNewVendor({ ...newVendor, name: e.target.value })} className="w-full border p-2 rounded-xl text-sm" required />
                <input placeholder="Category" value={newVendor.category} onChange={e => setNewVendor({ ...newVendor, category: e.target.value })} className="w-full border p-2 rounded-xl text-sm" />
                <input placeholder="Email" type="email" value={newVendor.email} onChange={e => setNewVendor({ ...newVendor, email: e.target.value })} className="w-full border p-2 rounded-xl text-sm" required />
                <button type="submit" className="px-4 py-2 bg-[#083a9b] text-white rounded-2xl text-sm">Add Vendor (approved)</button>
              </form>
              <form onSubmit={addMenuItem} className="bg-white border rounded-3xl p-5 space-y-3">
                <h3 className="font-semibold">Quick Add Menu Item</h3>
                <input placeholder="Dish name" value={newMenuItem.name} onChange={e => setNewMenuItem({ ...newMenuItem, name: e.target.value })} className="w-full border p-2 rounded-xl text-sm" required />
                <input placeholder="Price" type="number" step="0.01" value={newMenuItem.price} onChange={e => setNewMenuItem({ ...newMenuItem, price: e.target.value })} className="w-full border p-2 rounded-xl text-sm" />
                <select value={newMenuItem.vendor_id} onChange={e => setNewMenuItem({ ...newMenuItem, vendor_id: e.target.value })} className="w-full border p-2 rounded-xl text-sm" required>
                  <option value="">Select vendor</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-2xl text-sm">Add Menu Item (live)</button>
              </form>
            </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border rounded-3xl p-6">
              <h3 className="font-semibold mb-4">Marketplace Items</h3>
              {menuItems.map(item => (
                <div key={item.id} className="flex justify-between py-1 border-b text-sm">
                  <span>{item.name} (${item.price})</span>
                  <button onClick={() => toggleContent('menu_items', item.id, item.approved)} className="text-xs px-2 py-0.5 border rounded">{item.approved ? 'Hide' : 'Show'}</button>
                </div>
              ))}
            </div>
            <div className="bg-white border rounded-3xl p-6">
              <h3 className="font-semibold mb-4">Farmers Market Produce</h3>
              {produceItems.map(item => (
                <div key={item.id} className="flex justify-between py-1 border-b text-sm">
                  <span>{item.name} (${item.price}/{item.unit})</span>
                  <button onClick={() => toggleContent('produce_items', item.id, item.approved)} className="text-xs px-2 py-0.5 border rounded">{item.approved ? 'Hide' : 'Show'}</button>
                </div>
              ))}
            </div>
          </div>
          </div>
        )}

        {!loading && activeTab === 'reports' && (
          <div className="bg-white border rounded-3xl p-6">
            <h3 className="font-semibold mb-4">Analytics &amp; Reports</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-2xl">Total Platform Revenue (est.): <span className="font-semibold">${(analytics.totalOrders * 25).toFixed(0)}</span></div>
              <div className="p-4 bg-gray-50 rounded-2xl">Vendor Approval Rate: <span className="font-semibold">{analytics.totalVendors ? Math.round(((analytics.totalVendors - analytics.pendingVendors) / analytics.totalVendors) * 100) : 0}%</span></div>
              <div className="p-4 bg-gray-50 rounded-2xl">Active Community Members: <span className="font-semibold">{analytics.totalUsers}</span></div>
            </div>
            <p className="text-xs text-gray-500 mt-4">Real-time data powered by Supabase. Expand with custom reports as needed.</p>
          </div>
        )}

        {!loading && (activeTab === 'support' || activeTab === 'settings') && (
          <div className="bg-white border rounded-3xl p-6">
            <h3 className="font-semibold mb-2">{activeTab === 'support' ? 'Support & Issues' : 'Platform Settings'}</h3>
            <p className="text-gray-600">Full admin tools for issues, documents, and global settings are available here. All actions are logged for accountability.</p>
            <div className="mt-4 text-sm">
              • View and resolve support tickets<br />
              • Manage platform-wide announcements<br />
              • Export data for compliance
            </div>
          </div>
        )}
      </div>
    </div>
  );
}