import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../components/CartContext';
import { supabase } from '../lib/supabaseClient';
import EmptyState from '../components/EmptyState';

export default function Marketplace({ user }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [maxPrice, setMaxPrice] = useState(50);
  const [placing, setPlacing] = useState(false);
  const [loading, setLoading] = useState(true);

  const { cart, addToCart, removeFromCart, clearCart, total } = useCart();

  useEffect(() => {
    const loadItems = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('approved', 1)
        .order('featured', { ascending: false })
        .order('id', { ascending: true });
      if (error) {
        console.error('Supabase error loading menu:', error);
        setItems([]);
      } else {
        setItems(data || []);
      }
      setLoading(false);
    };
    loadItems();
  }, []);

  const filtered = items.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) &&
    (!categoryFilter || item.category === categoryFilter) &&
    item.price <= maxPrice
  );

  const placeOrder = async () => {
    if (cart.length === 0) return;
    if (!user) {
      alert('Please log in to place an order.');
      return;
    }

    setPlacing(true);

    const deliverySelect = document.getElementById('delivery-select');
    const chosenDelivery = deliverySelect ? deliverySelect.value : 'pickup';

    const orderData = {
      user_id: user.id,
      vendor_id: cart[0].vendor_id,
      items: JSON.stringify(cart.map(i => ({ name: i.name, qty: i.qty || 1, price: i.price }))),
      total: total,
      status: 'placed',
      date: new Date().toISOString().split('T')[0],
      delivery_method: chosenDelivery
    };

    try {
      const { error } = await supabase.from('orders').insert(orderData);
      if (error) throw error;

      let msg = `Order placed successfully! Total: $${total}`;
      if (chosenDelivery === 'pickup') msg += ' — Ready for local pickup!';
      else if (chosenDelivery === 'doordash') msg += ' — DoorDash will handle delivery.';
      else msg += ' — Uber Eats delivery confirmed.';
      alert(msg);
      clearCart();
    } catch (e) {
      console.error('Order error:', e);
      alert('Failed to place order. Make sure Supabase tables are set up and RLS allows inserts.');
    }
    setPlacing(false);
  };

  return (
    <div>
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Marketplace</h1>
          <p className="text-gray-600">Fresh dishes from local vendors</p>
          <Link to="/top-vendors" className="text-sm text-[#083a9b] font-medium mt-1 inline-block">Find vendors by star rating →</Link>
        </div>
        <input 
          type="text" 
          placeholder="Search dishes..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border px-5 py-3 rounded-3xl w-72 text-sm"
        />
        <select 
          value={categoryFilter} 
          onChange={e => setCategoryFilter(e.target.value)}
          className="border px-4 py-3 rounded-3xl text-sm"
        >
          <option value="">All Categories</option>
          <option value="Mexican">Mexican</option>
          <option value="Italian">Italian</option>
          <option value="Asian">Asian</option>
          <option value="American">American</option>
        </select>
        <div className="flex items-center gap-2 text-sm">
          <span>Max ${maxPrice}</span>
          <input 
            type="range" 
            min="5" max="50" 
            value={maxPrice} 
            onChange={e => setMaxPrice(parseInt(e.target.value))} 
          />
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-white border rounded-3xl overflow-hidden animate-pulse">
              <div className="h-44 bg-gray-200" />
              <div className="p-5 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <EmptyState
          icon="🍽️"
          title="No dishes listed yet"
          message="Vendors are getting set up. Check back soon — or browse the Farmers Market for fresh produce."
          actionLabel="Browse Farmers Market"
          actionTo="/farmers-market"
        />
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {!loading && filtered.map(item => (
          <div key={item.id} className="bg-white border rounded-3xl overflow-hidden group">
            <img src={item.photo} className="h-44 w-full object-cover group-hover:scale-105 transition" />
            <div className="p-5">
              <div className="flex justify-between">
                <div className="font-semibold">{item.name}</div>
                <div className="font-semibold text-[#083a9b]">${item.price}</div>
              </div>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.description}</p>
              <div className="mt-4 flex gap-2">
                <button 
                  onClick={() => addToCart(item)}
                  className="flex-1 py-2.5 bg-[#083a9b] text-white rounded-2xl text-sm font-medium"
                >
                  Add to Order
                </button>
                <button 
                  onClick={() => {
                    const url = `${window.location.origin}/marketplace`;
                    const txt = `${item.name} - $${item.price} from local vendor on Market and Shop!`;
                    if (navigator.share) {
                      navigator.share({ title: item.name, text: txt, url });
                    } else {
                      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(txt)}`, '_blank');
                    }
                  }}
                  className="px-4 py-2.5 text-sm border rounded-2xl"
                  title="Share to social / Facebook"
                >
                  Share
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Cart with Delivery Options (Local Pickup + 3rd party) */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 right-6 bg-white border shadow-2xl rounded-3xl p-5 w-80 z-50">
          <div className="font-semibold mb-3">Your Cart ({cart.length})</div>
          <select className="w-full border p-2 rounded mb-3 text-sm" id="delivery-select" defaultValue="pickup">
            <option value="pickup">Local Pickup (Free, next day)</option>
            <option value="doordash">DoorDash (+$6.99, ~45min)</option>
            <option value="ubereats">Uber Eats (+$7.49, ~35min)</option>
          </select>
          <div className="max-h-48 overflow-auto space-y-2 text-sm mb-4">
            {cart.map((item) => (
              <div key={item.cartId} className="flex justify-between items-center">
                <span>{item.name} × {item.qty || 1}</span>
                <div className="flex items-center gap-2">
                  <span>${(item.price * (item.qty || 1)).toFixed(2)}</span>
                  <button onClick={() => removeFromCart(item.cartId)} className="text-red-500 text-xs">✕</button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between font-semibold border-t pt-3">
            <span>Total</span>
            <span>${total}</span>
          </div>
          {user ? (
            <button 
              onClick={placeOrder} 
              disabled={placing}
              className="mt-4 w-full py-2.5 bg-emerald-600 text-white rounded-2xl font-medium disabled:opacity-70"
            >
              {placing ? 'Placing Order...' : 'Place Order'}
            </button>
          ) : (
            <Link to="/login" className="mt-4 block w-full py-2.5 bg-[#083a9b] text-white rounded-2xl font-medium text-center">
              Log in to order
            </Link>
          )}
        </div>
      )}
    </div>
  );
}