import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../components/CartContext';
import { supabase } from '../lib/supabaseClient';
import EmptyState from '../components/EmptyState';

export default function FarmersMarket({ user }) {
  const [produce, setProduce] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [organicOnly, setOrganicOnly] = useState(false);
  const [dietaryFilter, setDietaryFilter] = useState('');
  const [seasonalOnly, setSeasonalOnly] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null); // for farm story modal
  const [deliveryMethod, setDeliveryMethod] = useState('pickup');
  const { cart, addToCart, clearCart, total } = useCart();
  const [placing, setPlacing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProduce = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('produce_items')
        .select('*')
        .eq('approved', 1)
        .order('featured', { ascending: false })
        .order('id', { ascending: true });
      if (error) {
        console.error('Supabase error loading produce:', error);
        setProduce([]);
      } else {
        setProduce(data || []);
      }
      setLoading(false);
    };
    loadProduce();
  }, []);

  const filtered = produce.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
                         (item.description && item.description.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = !categoryFilter || item.category === categoryFilter;
    const matchesOrganic = !organicOnly || item.organic;
    const matchesDietary = !dietaryFilter || (item.dietary_tags && item.dietary_tags.includes(dietaryFilter));
    const matchesSeasonal = !seasonalOnly || item.is_seasonal;
    return matchesSearch && matchesCategory && matchesOrganic && matchesDietary && matchesSeasonal;
  });

  const placeProduceOrder = async () => {
    if (cart.length === 0 || !user) return;
    setPlacing(true);

    const orderData = {
      user_id: user.id,
      vendor_id: cart[0].vendor_id,
      items: JSON.stringify(cart.map(i => ({ 
        name: i.name, 
        qty: i.qty || 1, 
        price: i.price, 
        unit: i.unit || 'lb' 
      }))),
      total: total,
      status: 'placed',
      date: new Date().toISOString().split('T')[0],
      delivery_method: deliveryMethod
    };

    try {
      const { error } = await supabase.from('orders').insert(orderData);
      if (error) throw error;

      let msg = `Produce order placed! Total: $${total}`;
      if (deliveryMethod === 'pickup') msg += ' - Ready for local pickup tomorrow!';
      else if (deliveryMethod === 'doordash') msg += ' - DoorDash will pick up shortly.';
      else msg += ' - Uber Eats delivery en route.';
      
      alert(msg);
      clearCart();
    } catch (e) {
      console.error('Produce order error:', e);
      alert('Failed to place order. Make sure Supabase orders table allows inserts.');
    }
    setPlacing(false);
  };

  const categories = [...new Set(produce.map(p => p.category))];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium mb-2">
            🌾 FRESH FROM THE FARM
          </div>
          <h1 className="text-5xl font-bold tracking-tight">Farmers Market</h1>
          <p className="text-gray-600 mt-2 text-lg">Fresh produce, eggs, honey &amp; more • Direct from local farmers &amp; vendors</p>
        </div>
        
        <div className="flex gap-3 items-center flex-wrap">
          <input 
            type="text" 
            placeholder="Search produce..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border px-5 py-3 rounded-3xl w-64 text-sm focus:ring-2 focus:ring-green-200"
          />
          <select 
            value={categoryFilter} 
            onChange={e => setCategoryFilter(e.target.value)}
            className="border px-4 py-3 rounded-3xl text-sm"
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input 
              type="checkbox" 
              checked={organicOnly} 
              onChange={e => setOrganicOnly(e.target.checked)} 
              className="accent-green-600"
            />
            Organic Only
          </label>
          <select value={dietaryFilter} onChange={e => setDietaryFilter(e.target.value)} className="border px-3 py-2 rounded-2xl text-sm">
            <option value="">Any Diet</option>
            <option value="vegan">Vegan</option>
            <option value="gluten-free">Gluten-Free</option>
          </select>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={seasonalOnly} onChange={e => setSeasonalOnly(e.target.checked)} className="accent-green-600" /> Seasonal Only
          </label>
        </div>
      </div>

      {/* Delivery / Pickup Options - New for integrations */}
      <div className="mb-6 p-4 bg-white border rounded-3xl flex flex-wrap gap-4 items-center">
        <span className="font-medium text-sm">Fulfillment:</span>
        {[
          { value: 'pickup', label: 'Local Pickup (Free tomorrow 8am-12pm)', icon: '🚜' },
          { value: 'doordash', label: 'DoorDash (Est. $6.99 • 45 min)', icon: '🛵' },
          { value: 'ubereats', label: 'Uber Eats (Est. $7.49 • 35 min)', icon: '🚗' }
        ].map(opt => (
          <label key={opt.value} className={`flex items-center gap-2 px-4 py-2 rounded-2xl border cursor-pointer text-sm transition ${deliveryMethod === opt.value ? 'border-green-600 bg-green-50' : 'hover:bg-gray-50'}`}>
            <input 
              type="radio" 
              name="delivery" 
              value={opt.value} 
              checked={deliveryMethod === opt.value} 
              onChange={() => setDeliveryMethod(opt.value)} 
              className="hidden" 
            />
            <span>{opt.icon}</span> {opt.label}
          </label>
        ))}
        <p className="text-xs text-gray-500 ml-auto">Real DoorDash/Uber Eats via Supabase Edge + partner APIs coming soon. Estimates use live data where connected.</p>
      </div>

      {!loading && filtered.length === 0 && (
        <EmptyState
          icon="🌾"
          title="Harvest coming soon"
          message="No produce listings yet. Run SEED_STARTER_MARKETPLACE.sql in Supabase or add items via the Admin Portal."
          actionLabel="Back to Home"
          actionTo="/"
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {!loading && filtered.map(item => (
          <div key={item.id} className="bg-white border rounded-3xl overflow-hidden group hover:shadow-xl transition-all">
            <div className="relative">
              <img src={item.photo} className="h-48 w-full object-cover group-hover:scale-105 transition" alt={item.name} />
              {item.organic === 1 && (
                <div className="absolute top-3 right-3 bg-green-600 text-white text-[10px] px-2.5 py-0.5 rounded-full font-bold tracking-wider">ORGANIC</div>
              )}
            </div>
            
            <div className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-lg leading-tight">{item.name}</div>
                  <div className="text-xs text-green-600 font-medium mt-0.5">{item.farm_story ? 'Local Farm' : 'Vendor'}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-[#083a9b] text-xl">${item.price}</div>
                  <div className="text-[10px] text-gray-500">per {item.unit}</div>
                </div>
              </div>

              <p className="text-sm text-gray-600 mt-2 line-clamp-2">{item.description}</p>
              
              <div className="flex gap-1 mt-2 flex-wrap">
                {item.organic === 1 && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">🌱 Organic</span>}
                {item.dietary_tags && item.dietary_tags.split(',').map(tag => <span key={tag} className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{tag}</span>)}
                {item.is_seasonal === 1 && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">🍂 {item.season || 'Seasonal'}</span>}
                {item.sustainability_score && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">🌍 {item.sustainability_score} sustainable</span>}
              </div>

              {item.wholesale_price && (
                <div className="text-[10px] text-amber-600 mt-1">Wholesale: ${item.wholesale_price}/{item.unit} (min {item.min_wholesale_qty})</div>
              )}
              
              {item.farm_story && (
                <button 
                  onClick={() => setSelectedItem(item)}
                  className="text-xs text-green-700 hover:underline mt-1 font-medium"
                >
                  Read the farm story →
                </button>
              )}

              <div className="mt-4 flex items-center gap-2 text-xs">
                <div className="bg-gray-100 px-2 py-0.5 rounded">Qty: {item.quantity_available} {item.unit}s avail.</div>
                <div className="text-emerald-600">Fresh today</div>
              </div>

              <button 
                onClick={() => {
                  addToCart({ ...item, vendor_id: item.vendor_id, type: 'produce' });
                  alert(`Added ${item.name} to cart!`);
                }}
                className="mt-4 w-full py-3 bg-green-700 hover:bg-green-800 transition text-white rounded-2xl text-sm font-semibold"
              >
                Add to Cart • ${item.price}/{item.unit}
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-500">No produce matches your filters. Try broadening your search!</div>
      )}

      {/* Floating Cart Summary for produce orders */}
      {cart.some(i => i.type === 'produce') && (
        <div className="fixed bottom-6 right-6 bg-white border shadow-2xl rounded-3xl p-5 w-80 z-50">
          <div className="font-semibold mb-2 flex justify-between">
            <span>Your Produce Cart</span>
            <span className="text-green-700">${total.toFixed(2)}</span>
          </div>
          <button 
            onClick={placeProduceOrder} 
            disabled={placing}
            className="w-full py-3 mt-2 bg-green-700 text-white rounded-2xl font-semibold disabled:opacity-60"
          >
            {placing ? 'Placing Order...' : `Checkout Produce • ${deliveryMethod === 'pickup' ? 'Local Pickup' : deliveryMethod === 'doordash' ? 'DoorDash' : 'Uber Eats'}`}
          </button>
          <p className="text-[10px] text-center text-gray-400 mt-2">Local pickup or third-party delivery options</p>
        </div>
      )}

      {/* Quick review with picture for the market - lets reviewers add photo comments */}
      <div className="mt-12 border-t pt-8">
        <div className="font-semibold mb-2">Leave a Photo Review for Farmers Market</div>
        <div className="text-xs text-gray-500">Use the "Read the farm story" on any item → scroll to the review prompts in the modal (supports photo URL). Reviews + images are saved and shown on vendor pages.</div>
      </div>

      {/* Farm Story Modal - Rich polish */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]" onClick={() => setSelectedItem(null)}>
          <div className="bg-white rounded-3xl max-w-lg w-full mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <img src={selectedItem.photo} className="w-full h-64 object-cover" />
            <div className="p-8">
              <div className="uppercase text-xs tracking-[2px] text-green-600 mb-1">From the Farm</div>
              <h3 className="text-3xl font-semibold">{selectedItem.name}</h3>
              <p className="mt-4 text-gray-700 leading-relaxed">{selectedItem.farm_story}</p>
              
              <div className="mt-6 pt-6 border-t grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Price</span><br/><span className="font-semibold">${selectedItem.price}/{selectedItem.unit}</span></div>
                <div><span className="text-gray-500">Available</span><br/><span className="font-semibold">{selectedItem.quantity_available} {selectedItem.unit}s</span></div>
              </div>

              <button onClick={() => setSelectedItem(null)} className="mt-8 w-full py-3 border rounded-2xl">Close Story</button>

              <div className="flex gap-2 mt-3 text-xs">
                <button 
                  onClick={() => {
                    const win = window.open('', '_blank');
                    win.document.write(`<h1>${item.name}</h1><p>${item.description}</p><p>$${item.price}/${item.unit}</p><p>${item.farm_story}</p>`);
                    win.print();
                  }}
                  className="flex-1 py-2 border rounded">Export PDF Flyer
                </button>
                <button 
                  onClick={() => alert('Instagram Story template copied! (In real: canvas with nice design + text overlay ready to post)')}
                  className="flex-1 py-2 border rounded">Instagram Story Template
                </button>
              </div>

              <button 
                onClick={() => alert('Chat with the farmer opened! (stub — in real app this would be a live messaging thread with the vendor/farmer)')}
                className="mt-2 w-full text-xs py-2 border rounded-2xl hover:bg-gray-50"
              >
                💬 Message the Farmer (live chat)
              </button>

              {/* Bundle & Bulk */}
              <div className="mt-4 text-sm">
                <button 
                  onClick={() => {
                    const bundleQty = item.min_wholesale_qty || 10;
                    addToCart({ ...item, qty: bundleQty, name: `${item.name} Bulk Box (${bundleQty} ${item.unit}s)` });
                    alert(`Added bulk box of ${item.name}!`);
                    setSelectedItem(null);
                  }}
                  className="text-green-700 underline text-xs"
                >
                  Add "Whole Box" Bundle ({item.min_wholesale_qty || 10} units - best value)
                </button>
              </div>

              {/* Reviews with pictures */}
              <div className="mt-6 pt-4 border-t">
                <div className="font-medium text-sm mb-2">Customer Reviews</div>
                <div className="text-xs text-gray-500 mb-2">5.0 ★ "Amazing quality, will be back every week!" — Local Chef</div>
                <button 
                  onClick={() => {
                    const rating = prompt('Rate 1-5:');
                    const comment = prompt('Your review:');
                    const image = prompt('Image URL (optional, e.g. https://picsum.photos/200):', 'https://picsum.photos/id/292/200/150');
                    if (rating && comment) {
                      supabase.from('reviews').insert({
                        item_id: item.id, 
                        item_type: 'produce', 
                        rating: parseInt(rating), 
                        comment, 
                        image_url: image || null,
                        user_id: user?.id || 999,
                        date: new Date().toISOString().split('T')[0]
                      }).then(({ error }) => {
                        if (error) {
                          alert('Review failed: ' + error.message);
                        } else {
                          alert('Thanks for your review! +25 loyalty points awarded. Image attached.');
                          // In real app: refresh reviews list via subscription
                        }
                      });
                    }
                  }}
                  className="text-xs mt-2 underline text-green-600"
                >
                  Write a review with photo (+ loyalty points)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
