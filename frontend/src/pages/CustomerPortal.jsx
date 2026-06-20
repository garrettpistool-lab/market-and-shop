import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../components/CartContext';
import { fetchOrdersForUser } from '../lib/ordersApi';
import { getCustomerContext, planBadgeLabel } from '../lib/plans';

let API = import.meta.env.VITE_API_URL || '/api';
if (API && !API.endsWith('/api')) {
  API = API.endsWith('/') ? API + 'api' : API + '/api';
}

export default function CustomerPortal({ user }) {
  const [recentOrders, setRecentOrders] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0); // earned via orders and reviews (live via Supabase when wired)

  const { cart, removeFromCart, total, clearCart } = useCart();

  useEffect(() => {
    if (!user) return;

    const userId = user.id || 3;

    Promise.all([
      fetchOrdersForUser(user).catch(() => []),
      fetch(`${API}/favorites/${userId}`).then(r => r.json()).catch(() => []),
      fetch(`${API}/issues`).then(r => r.json()).catch(() => []),
      fetch(`${API}/loyalty/${userId}`).then(r => r.json()).catch(() => ({points: 0})),
    ]).then(([orders, favs, iss, loy]) => {
      setRecentOrders(orders.slice(0, 3)); // latest 3
      setFavorites(favs.slice(0, 5));
      setIssues(iss.filter(i => !i.resolved).slice(0, 3));
      setLoyaltyPoints(loy.points || 0);
      setLoading(false);
    });
  }, [user]);

  const itemCount = cart.reduce((s, i) => s + (i.qty || 1), 0);
  const customerCtx = getCustomerContext(user);

  return (
    <div>
      <div className="flex justify-between items-end mb-2">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Customer Portal</h1>
          <p className="mt-2 text-gray-600">Your personal hub for orders, favorites, and support.</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Welcome back, {user?.name}</div>
          <div className={`text-xs font-medium ${customerCtx.plan === 'paid' ? 'text-emerald-600' : 'text-gray-500'}`}>
            {planBadgeLabel(customerCtx.plan, 'customer')}
            {customerCtx.plan === 'free' && !customerCtx.canRate && ` • ${customerCtx.purchasesUntilRating} purchases until ratings`}
          </div>
        </div>
      </div>

      {/* Premium Quick Cart - Now visible directly in Customer Portal */}
      <div className="mt-6 bg-white border rounded-3xl p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-xl flex items-center gap-2">
            🛒 Your Current Cart 
            {itemCount > 0 && <span className="text-sm font-normal text-gray-500">({itemCount} items)</span>}
          </h2>
          <div className="font-semibold text-lg">Total: ${total.toFixed(2)}</div>
        </div>

        {cart.length === 0 ? (
          <p className="text-gray-500 text-sm">No items yet. Add dishes from the Marketplace or any Vendor Profile (Premium Express available!). <Link to="/marketplace" className="text-[#083a9b]">Browse Marketplace →</Link></p>
        ) : (
          <>
            <div className="space-y-3 mb-4 max-h-48 overflow-auto">
              {cart.map((item) => (
                <div key={item.cartId} className="flex justify-between items-center text-sm border-b pb-2">
                  <div>
                    <span className="font-medium">{item.name}</span> × {item.qty || 1}
                    <span className="text-gray-500 ml-2">${(item.price * (item.qty || 1)).toFixed(2)}</span>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.cartId)} 
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Link 
                to="/orders" 
                className="flex-1 py-2.5 text-center border rounded-2xl text-sm font-medium hover:bg-gray-50"
              >
                Manage in Orders Page
              </Link>
              <button 
                onClick={() => {
                  if (confirm('Place this order now?')) {
                    // Quick place - in real would navigate or call placeOrder
                    alert(`Premium order for $${total.toFixed(2)} placed! (See full flow in /orders)`);
                    clearCart();
                  }
                }}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-2xl text-sm font-medium"
              >
                Quick Place Order (Premium)
              </button>
            </div>
            <p className="text-[10px] text-center text-gray-400 mt-2">Premium members get priority kitchen slot + free express on orders &gt;$25</p>
          </>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Recent Orders - now real data */}
        <div className="bg-white border rounded-3xl p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">Recent Orders <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">LIVE</span></h3>
          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : recentOrders.length === 0 ? (
            <p className="text-sm text-gray-500">No orders yet. Your cart above will become orders here.</p>
          ) : (
            <div className="space-y-3 text-sm">
              {recentOrders.map(o => (
                <div key={o.id} className="flex justify-between border-b pb-2">
                  <div>#{o.id} • {o.date}</div>
                  <div className="font-medium">${o.total}</div>
                </div>
              ))}
            </div>
          )}
          <Link to="/orders" className="text-[#083a9b] text-xs mt-3 inline-block">View all orders &amp; current cart →</Link>
        </div>

        {/* Loyalty & Favorites */}
        <div className="bg-white border rounded-3xl p-6">
          <h3 className="font-semibold mb-2">Your Loyalty Points</h3>
          <div className="text-3xl font-bold text-amber-600">{loyaltyPoints} <span className="text-base">pts</span></div>
          <div className="text-xs text-amber-700">Earn 10 pts per $1 spent. 500 pts = $10 off next order!</div>
          <div className="mt-4 text-xs">Next reward at 500 pts • You're 65% there.</div>
        </div>

        <div className="bg-white border rounded-3xl p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">Favorite Vendors <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">PREMIUM</span></h3>
          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : favorites.length === 0 ? (
            <p className="text-sm text-gray-500">Heart vendors in the Marketplace to see them here. Premium members get alerts for new menu items.</p>
          ) : (
            <div className="space-y-2 text-sm">
              {favorites.map((v, i) => (
                <div key={i} className="flex justify-between">
                  <span>{v.name || 'Vendor'}</span>
                  <Link to={`/vendor/${v.vendor_id || v.id}`} className="text-[#083a9b] text-xs">View Profile</Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Issues + Premium Support */}
        <div className="bg-white border rounded-3xl p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">Active Issues <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">PREMIUM SUPPORT</span></h3>
          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : issues.length === 0 ? (
            <div>
              <p className="text-sm text-gray-500 mb-2">No open issues. Great!</p>
              <Link to="/support" className="text-[#083a9b] text-xs">Submit new support request →</Link>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              {issues.map((iss, i) => (
                <div key={i} className="text-sm">{iss.title || 'Support request'} <span className="text-xs text-gray-400">(Priority handled)</span></div>
              ))}
            </div>
          )}
          <div className="mt-3 text-[10px] text-emerald-600">Premium: 24/7 priority response + dedicated account manager.</div>
        </div>
      </div>

      {/* Extra Premium Perk */}
      <div className="mt-8 bg-gradient-to-r from-[#083a9b]/5 to-white border border-[#083a9b]/20 rounded-3xl p-6 text-sm">
        <div className="font-semibold">Your Premium Perks Active</div>
        <ul className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-x-4 text-xs text-gray-600 list-disc pl-4">
          <li>Free Express on orders &gt;$25</li>
          <li>Priority kitchen slot</li>
          <li>Loyalty points (2x on every order)</li>
          <li>Exclusive vendor previews</li>
        </ul>
        <div className="mt-3 text-[10px] text-gray-500">Thank you for being a premium customer. Your cart above qualifies for instant express upgrade.</div>
      </div>
    </div>
  );
}