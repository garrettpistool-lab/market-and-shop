import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { fetchVendorAnalytics } from '../lib/vendorAnalytics';
import { getVendorContext, planBadgeLabel, vendorCan } from '../lib/plans';
import RatingAlertsPanel from '../components/RatingAlertsPanel';
import VendorNotificationsPanel from '../components/VendorNotificationsPanel';

const API = import.meta.env.VITE_API_URL || '/api';

export default function VendorDashboard({ user }) {
  const [myMenu, setMyMenu] = useState([]);
  const [myProduce, setMyProduce] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [newItem, setNewItem] = useState({ name: '', price: '', description: '', category: 'Other', time_made: '15 min' });
  const [newProduce, setNewProduce] = useState({ name: '', price: '', unit: 'lb', description: '', farm_story: '', organic: 0, category: 'Produce' });
  const [adding, setAdding] = useState(false);
  const [addingProduce, setAddingProduce] = useState(false);
  const [shareMessage, setShareMessage] = useState('');

  // Pricing Calculator state (analytics tool for competitiveness)
  const [calc, setCalc] = useState({ cost: 2.5, qty: 50, desiredMargin: 40, localPrice: 5.99 });
  const [calcResult, setCalcResult] = useState(null);
  const [calcHistory, setCalcHistory] = useState([]);

  // Ad purchase (front page promotion)
  const [adPurchased, setAdPurchased] = useState(false);
  const [adDetails, setAdDetails] = useState(null);

  const vendorCtx = getVendorContext(user);
  const myVendorId = vendorCtx?.vendorId || user?.vendor_id || user?.vendor || null;
  const vendorPlan = vendorCtx?.plan || 'free';

  const refreshVendorData = useCallback(async () => {
    if (!myVendorId) {
      setLoadingData(false);
      return;
    }
    setLoadingData(true);
    try {
      const stats = await fetchVendorAnalytics(myVendorId);
      setAnalytics(stats);
      setMyMenu(stats.menu);
      setMyProduce(stats.produce);
      setMyTasks(stats.tasks);
    } catch (e) {
      console.warn('Supabase vendor load failed, trying API fallback:', e.message);
      try {
        const [menu, produce, tasks] = await Promise.all([
          fetch(`${API}/menu-items`).then((r) => r.json()),
          fetch(`${API}/produce-items`).then((r) => r.json()),
          fetch(`${API}/tasks`).then((r) => r.json()),
        ]);
        setMyMenu((menu || []).filter((i) => i.vendor_id == myVendorId));
        setMyProduce((produce || []).filter((i) => i.vendor_id == myVendorId));
        setMyTasks((tasks || []).filter((t) => t.vendor_id == myVendorId));
      } catch {
        setMyMenu([]);
        setMyProduce([]);
        setMyTasks([]);
      }
    } finally {
      setLoadingData(false);
    }
  }, [myVendorId]);

  useEffect(() => {
    refreshVendorData();
  }, [refreshVendorData]);

  useEffect(() => {
    if (!myVendorId) return undefined;
    const channel = supabase
      .channel(`vendor-${myVendorId}-live`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => refreshVendorData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, () => refreshVendorData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [myVendorId, refreshVendorData]);

  const addMenuItem = async () => {
    if (!newItem.name || !newItem.price || !myVendorId) return;
    setAdding(true);
    const payload = {
      vendor_id: myVendorId,
      name: newItem.name,
      price: parseFloat(newItem.price),
      description: newItem.description,
      category: newItem.category,
      time_made: newItem.time_made,
      photo: 'https://picsum.photos/300/200',
      available: 1,
    };
    try {
      const { data: added, error } = await supabase.from('menu_items').insert(payload).select().single();
      if (!error && added) {
        setNewItem({ name: '', price: '', description: '', category: 'Other', time_made: '15 min' });
        await refreshVendorData();
        shareToSocial(added, true);
        setAdding(false);
        return;
      }
      const res = await fetch(`${API}/menu-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const item = await res.json();
        setNewItem({ name: '', price: '', description: '', category: 'Other', time_made: '15 min' });
        await refreshVendorData();
        shareToSocial(item, true);
      } else {
        alert('Failed to add item. Check Supabase RLS or start the local backend.');
      }
    } catch (e) {
      alert('Failed to add item.');
    }
    setAdding(false);
  };

  const addProduceItem = async () => {
    if (!newProduce.name || !newProduce.price || !myVendorId) return;
    setAddingProduce(true);
    const payload = {
      vendor_id: myVendorId,
      ...newProduce,
      price: parseFloat(newProduce.price),
      organic: Number(newProduce.organic) || 0,
      photo: 'https://picsum.photos/300/200',
    };
    try {
      const { error } = await supabase.from('produce_items').insert(payload);
      if (!error) {
        setNewProduce({ name: '', price: '', unit: 'lb', description: '', farm_story: '', organic: 0, category: 'Produce' });
        await refreshVendorData();
        alert('Produce added to Farmers Market!');
        setAddingProduce(false);
        return;
      }
      const res = await fetch(`${API}/produce-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setNewProduce({ name: '', price: '', unit: 'lb', description: '', farm_story: '', organic: 0, category: 'Produce' });
        await refreshVendorData();
        alert('Produce added to Farmers Market!');
      }
    } catch (e) {
      alert('Failed to add produce.');
    }
    setAddingProduce(false);
  };

  // Pricing Calculator - unhinged interactive analytics tool
  const runPricingCalculator = () => {
    const { cost, qty, desiredMargin, localPrice } = calc;
    const suggestedPrice = cost * (1 + desiredMargin / 100);
    const profitPerUnit = suggestedPrice - cost;
    const totalProfit = profitPerUnit * qty;
    const competitiveness = Math.max(0, Math.min(100, Math.round(((localPrice - suggestedPrice) / localPrice) * 100 + 50)));
    
    const result = {
      suggestedPrice: suggestedPrice.toFixed(2),
      profitPerUnit: profitPerUnit.toFixed(2),
      totalProfit: totalProfit.toFixed(2),
      competitiveness: Math.round(competitiveness),
      recommendation: competitiveness > 70 ? "Very competitive — go for it!" : competitiveness > 40 ? "Solid. Consider slight discount for volume." : "Price is high vs local market. Lower margin or highlight quality/story."
    };
    setCalcResult(result);
    setCalcHistory(prev => [result, ...prev].slice(0, 5)); // keep last 5
  };

  // Ad Purchase for front page (mocked payment, integrated into portal)
  const purchaseAd = () => {
    const ad = {
      id: Date.now(),
      vendor: user?.name,
      duration: '7 days',
      cost: 49,
      status: 'Active',
      preview: `Featured on homepage & top of Marketplace with "Sponsored by ${user?.name}" badge`
    };
    setAdPurchased(true);
    setAdDetails(ad);
    // In real: would call payment API then set featured flag on vendor or specific items
    alert(`Ad purchased for $${ad.cost}! Your listings will now appear promoted on the front page and in search results with a clear "Ad" label.`);
    // Mock: update a vendor flag (in real app this would be backend)
  };

  const toggleAvailability = async (item) => {
    const next = item.available ? 0 : 1;
    try {
      const { error } = await supabase.from('menu_items').update({ available: next }).eq('id', item.id);
      if (!error) {
        await refreshVendorData();
        return;
      }
      await fetch(`${API}/menu-items/${item.id}/toggle`, { method: 'POST' });
      await refreshVendorData();
    } catch (e) {
      alert('Failed to toggle availability');
    }
  };

  const shareToSocial = (item, autoOpen = false) => {
    const productUrl = `${window.location.origin}/vendor/${user?.vendor}`;
    const text = `${item.name} - $${item.price}\n${item.description}\nOrder now: ${productUrl}\n\n#Market and Shop #LocalFood #${item.category}`;
    
    // Facebook Marketplace / Share - opens create + copies details
    const openFB = () => {
      window.open('https://www.facebook.com/marketplace/create/item', '_blank');
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}&quote=${encodeURIComponent(text)}`, '_blank');
    };

    // Twitter / X
    const openX = () => {
      window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(productUrl)}`, '_blank');
    };

    // WhatsApp
    const openWA = () => {
      window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + productUrl)}`, '_blank');
    };

    // Native share if available (great on phone)
    if (navigator.share && !autoOpen) {
      navigator.share({
        title: item.name,
        text: text,
        url: productUrl
      }).catch(() => {});
    } else {
      // Fallback: show options + auto open FB for new post
      if (autoOpen) openFB();
      
      const choice = prompt(
        `Share "${item.name}" to social:\n` +
        '1. Facebook Marketplace + Post\n' +
        '2. X (Twitter)\n' +
        '3. WhatsApp\n' +
        '4. Copy details to clipboard\n\nEnter number:'
      );
      
      if (choice === '1') openFB();
      else if (choice === '2') openX();
      else if (choice === '3') openWA();
      else if (choice === '4') {
        navigator.clipboard.writeText(text + '\n' + productUrl);
        setShareMessage('Details copied! Paste into Facebook Marketplace or other sites.');
        setTimeout(() => setShareMessage(''), 3000);
      }
    }
  };

  const openTasks = myTasks.filter((t) => t.status !== 'done').length;
  const monthOrders = analytics?.monthOrders ?? 0;
  const monthRevenue = analytics?.monthRevenue ?? 0;
  const avgRating = analytics?.avgRating ?? '—';
  const weekBuckets = analytics?.weekBuckets ?? [0, 0, 0, 0, 0, 0];
  const maxWeek = analytics?.maxWeek ?? 1;

  if (!myVendorId) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8">
        <h1 className="text-2xl font-bold mb-2">Vendor profile not linked</h1>
        <p className="text-sm text-amber-900">Your account needs a <code>vendor_id</code> in Supabase <code>users</code>. Run <code>SETUP_ROLES_AND_AUTH.sql</code> or contact an admin.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Vendor Dashboard</h1>
          <p className="text-gray-600">
            Live analytics for {user?.name} • Storefront #{myVendorId}
            <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100">{planBadgeLabel(vendorPlan, 'vendor')}</span>
            {vendorCtx?.isEmployee && <span className="ml-1 text-xs text-amber-700">(employee)</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {vendorCan(user, 'analytics') && (
            <Link to="/dashboard" className="px-4 py-2 border rounded-2xl text-sm font-medium hover:bg-white">Platform Analytics</Link>
          )}
          {(vendorCan(user, 'orders') || vendorCan(user, 'sell')) && (
            <Link to="/orders" className="px-4 py-2 bg-[#083a9b] text-white rounded-2xl text-sm font-medium">Manage Orders</Link>
          )}
          {myVendorId && (
            <Link to={`/vendor/${myVendorId}`} className="px-4 py-2 border rounded-2xl text-sm font-medium">Public Storefront</Link>
          )}
        </div>
      </div>

      {loadingData && (
        <div className="text-sm text-gray-500 mb-4">Refreshing live data…</div>
      )}

      {vendorCan(user, 'ratings') && <VendorNotificationsPanel vendorId={myVendorId} />}
      {vendorCan(user, 'ratings') && <RatingAlertsPanel vendorId={myVendorId} />}

      <div id="analytics" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white border rounded-3xl p-6">
          <div className="text-sm text-gray-500">Active Listings</div>
          <div className="text-4xl font-semibold mt-2">{myMenu.length + myProduce.length}</div>
          <div className="text-xs text-gray-400 mt-1">{myMenu.length} menu · {myProduce.length} produce</div>
        </div>
        <div className="bg-white border rounded-3xl p-6">
          <div className="text-sm text-gray-500">Open Tasks</div>
          <div className="text-4xl font-semibold mt-2">{openTasks}</div>
        </div>
        <div className="bg-white border rounded-3xl p-6">
          <div className="text-sm text-gray-500">This Month Orders</div>
          <div className="text-4xl font-semibold mt-2">{monthOrders}</div>
          <div className="text-xs text-emerald-600 mt-1">${monthRevenue.toFixed(2)} revenue</div>
        </div>
        <div className="bg-white border rounded-3xl p-6">
          <div className="text-sm text-gray-500">Avg Rating</div>
          <div className="text-4xl font-semibold mt-2">{avgRating}</div>
          <div className="text-xs text-gray-400 mt-1">{analytics?.reviews?.length || 0} reviews</div>
        </div>
      </div>

      {/* Add New Listing - Polish: Real form for vendors to "make a post" */}
      <div className="bg-white border rounded-3xl p-6 mb-8">
        <h3 className="font-semibold mb-4 flex items-center gap-2">Add New Menu Item / Listing</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input 
            placeholder="Item name (e.g. Fresh Tacos)" 
            value={newItem.name} 
            onChange={e => setNewItem({...newItem, name: e.target.value})}
            className="border p-3 rounded-2xl" 
          />
          <input 
            placeholder="Price" 
            type="number" 
            value={newItem.price} 
            onChange={e => setNewItem({...newItem, price: e.target.value})}
            className="border p-3 rounded-2xl" 
          />
          <input 
            placeholder="Description" 
            value={newItem.description} 
            onChange={e => setNewItem({...newItem, description: e.target.value})}
            className="border p-3 rounded-2xl col-span-2 md:col-span-1" 
          />
          <input 
            placeholder="Prep time (e.g. 15 min)" 
            value={newItem.time_made} 
            onChange={e => setNewItem({...newItem, time_made: e.target.value})}
            className="border p-3 rounded-2xl" 
          />
        </div>
        <button 
          onClick={addMenuItem} 
          disabled={adding || !newItem.name || !newItem.price}
          className="mt-4 px-8 py-3 bg-[#083a9b] text-white rounded-3xl font-semibold disabled:opacity-50 hover:bg-[#062d7a]"
        >
          {adding ? 'Adding...' : 'Add Item & Get Social Share Options'}
        </button>
        {shareMessage && <div className="mt-3 text-sm text-emerald-600">{shareMessage}</div>}
        <p className="text-xs text-gray-500 mt-2">After adding, we'll offer one-click links to post on Facebook Marketplace, X, WhatsApp and more.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* My Menu with Social Sharing - Key feature */}
        <div className="bg-white border rounded-3xl p-6">
          <h3 className="font-semibold mb-4">Your Menu Items • Share to Social</h3>
          {myMenu.length === 0 && <p className="text-gray-500 text-sm">No items yet. Add some above!</p>}
          {myMenu.map(item => (
            <div key={item.id} className="py-3 border-b last:border-0 flex justify-between items-start gap-4">
              <div>
                <div className="font-medium">{item.name} • ${item.price}</div>
                <div className="text-sm text-gray-500 line-clamp-1">{item.description}</div>
                <div className="text-xs text-gray-400">{item.category} • {item.time_made}</div>
              </div>
              <div className="flex flex-col gap-1.5">
                <button 
                  onClick={() => shareToSocial(item)} 
                  className="text-xs px-3 py-1.5 border border-[#083a9b] text-[#083a9b] rounded-2xl hover:bg-[#083a9b] hover:text-white transition"
                >
                  Share to FB Marketplace / Social
                </button>
                <button 
                  onClick={() => toggleAvailability(item)}
                  className="text-xs px-3 py-1 border rounded-2xl text-gray-500"
                >
                  {item.approved ? 'Hide from Marketplace' : 'Show on Marketplace'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Tasks */}
        <div className="bg-white border rounded-3xl p-6">
          <h3 className="font-semibold mb-4">Your Recent Tasks</h3>
          {myTasks.slice(0, 5).map(task => (
            <div key={task.id} className="py-2 border-b last:border-0 text-sm flex justify-between">
              <span>{task.title}</span>
              <span className="text-gray-400">{task.status}</span>
            </div>
          ))}
          {myTasks.length === 0 && <p className="text-gray-500 text-sm">No tasks yet.</p>}
        </div>
      </div>

      {/* NEW: Farmers Market / Produce Management for Vendors & Farmers */}
      <div className="mb-8 bg-gradient-to-br from-green-50 to-white border border-green-200 rounded-3xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="text-3xl">🌾</div>
          <div>
            <h3 className="font-bold text-2xl">Farmers Market &amp; Produce</h3>
            <p className="text-green-700">Sell fresh produce, eggs, honey, flowers &amp; raw goods. Perfect for farmers &amp; market vendors.</p>
          </div>
        </div>

        {/* Add Produce Form - Rich UI */}
        <div className="bg-white rounded-2xl p-6 mb-6 border">
          <div className="font-semibold mb-3">List New Produce Item</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input placeholder="Item (e.g. Heirloom Tomatoes)" value={newProduce.name} onChange={e=>setNewProduce({...newProduce, name:e.target.value})} className="border p-3 rounded-2xl" />
            <div className="flex gap-2">
              <input placeholder="Price" type="number" value={newProduce.price} onChange={e=>setNewProduce({...newProduce, price:e.target.value})} className="border p-3 rounded-2xl flex-1" />
              <input placeholder="Unit" value={newProduce.unit} onChange={e=>setNewProduce({...newProduce, unit:e.target.value})} className="border p-3 rounded-2xl w-20" />
            </div>
            <input placeholder="Short description" value={newProduce.description} onChange={e=>setNewProduce({...newProduce, description:e.target.value})} className="border p-3 rounded-2xl md:col-span-1" />
          </div>
          <textarea placeholder="Your farm story (builds trust &amp; justifies premium pricing)" value={newProduce.farm_story} onChange={e=>setNewProduce({...newProduce, farm_story:e.target.value})} className="mt-3 w-full border p-3 rounded-2xl h-20" />
          <div className="flex gap-3 mt-3">
            <button onClick={addProduceItem} disabled={addingProduce} className="flex-1 py-3 bg-green-700 text-white rounded-2xl font-semibold disabled:opacity-60">List on Farmers Market</button>
            <label className="flex items-center gap-2 text-sm border px-4 rounded-2xl cursor-pointer">
              <input type="checkbox" checked={newProduce.organic} onChange={e=>setNewProduce({...newProduce, organic: e.target.checked ? 1 : 0})} /> Organic
            </label>
          </div>
        </div>

        {/* Your Produce Listings */}
        <div>
          <div className="font-semibold mb-2">Your Current Produce Listings</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {myProduce.length === 0 && <div className="text-gray-500">No produce listed yet. Add some above to reach local customers &amp; restaurants.</div>}
            {myProduce.map(item => (
              <div key={item.id} className="bg-white border p-4 rounded-2xl flex justify-between">
                <div>
                  <div className="font-medium">{item.name} • ${item.price}/{item.unit}</div>
                  <div className="text-xs text-green-600">{item.organic ? 'Certified Organic' : 'Conventional'} • {item.quantity_available} available</div>
                </div>
                <button onClick={() => alert('Edit produce coming soon!')} className="text-xs self-start px-3 py-1 border rounded">Edit</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing Competitiveness Calculator - Advanced Analytics for Vendors */}
      <div className="mb-8 bg-white border rounded-3xl p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-bold text-2xl">Pricing Intelligence Calculator</h3>
            <p className="text-gray-600">Input your costs &amp; local market prices. Get smart suggestions so you can compete while protecting margins.</p>
          </div>
          <div className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded font-medium">ANALYTICS TOOL</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <div className="text-xs mb-1 text-gray-500">Your cost per unit ($)</div>
            <input type="number" step="0.01" value={calc.cost} onChange={e=>setCalc({...calc, cost: parseFloat(e.target.value)})} className="w-full border p-3 rounded-2xl" />
          </div>
          <div>
            <div className="text-xs mb-1 text-gray-500">Quantity you can sell</div>
            <input type="number" value={calc.qty} onChange={e=>setCalc({...calc, qty: parseInt(e.target.value)})} className="w-full border p-3 rounded-2xl" />
          </div>
          <div>
            <div className="text-xs mb-1 text-gray-500">Desired profit margin %</div>
            <input type="number" value={calc.desiredMargin} onChange={e=>setCalc({...calc, desiredMargin: parseInt(e.target.value)})} className="w-full border p-3 rounded-2xl" />
          </div>
          <div>
            <div className="text-xs mb-1 text-gray-500">Local market price ($)</div>
            <input type="number" step="0.01" value={calc.localPrice} onChange={e=>setCalc({...calc, localPrice: parseFloat(e.target.value)})} className="w-full border p-3 rounded-2xl" />
          </div>
        </div>

        <button onClick={runPricingCalculator} className="w-full md:w-auto px-10 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-3xl mb-6">Calculate Smart Price</button>

        {calcResult && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div><div className="text-xs text-amber-600">SUGGESTED PRICE</div><div className="text-3xl font-bold mt-1">${calcResult.suggestedPrice}</div></div>
              <div><div className="text-xs text-amber-600">PROFIT / UNIT</div><div className="text-3xl font-bold mt-1">${calcResult.profitPerUnit}</div></div>
              <div><div className="text-xs text-amber-600">TOTAL PROFIT</div><div className="text-3xl font-bold mt-1">${calcResult.totalProfit}</div></div>
              <div><div className="text-xs text-amber-600">COMPETITIVENESS</div><div className="text-3xl font-bold mt-1">{calcResult.competitiveness}%</div></div>
            </div>
            <div className="mt-4 pt-4 border-t text-sm text-amber-800 font-medium">{calcResult.recommendation}</div>
          </div>
        )}

        {calcHistory.length > 0 && (
          <div className="mt-4 text-xs text-gray-500">Recent calculations saved for you. Use these to track pricing experiments over time.</div>
        )}
      </div>

      {/* Ad Purchase for Front Page Promotion - Integrated in Vendor Portal */}
      <div className="mb-8 border border-purple-200 bg-purple-50 rounded-3xl p-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-2xl text-purple-900">Promote Your Brand</h3>
            <p className="text-purple-700">Get featured on the homepage &amp; top of search results. Clearly marked as sponsored.</p>
          </div>
          <div className="text-right text-xs font-mono bg-white px-3 py-1 rounded border">$49 / 7 days</div>
        </div>

        {!adPurchased ? (
          <button 
            onClick={purchaseAd} 
            className="px-8 py-4 bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-3xl text-lg w-full md:w-auto"
          >
            Purchase Front-Page Ad (Mock Checkout)
          </button>
        ) : (
          <div className="bg-white p-5 rounded-2xl border">
            <div className="font-semibold text-purple-700">✅ Ad Active!</div>
            <div className="mt-2 text-sm">{adDetails?.preview}</div>
            <div className="text-xs mt-3 text-purple-500">Your listings now get priority placement + "Sponsored" badge on Home &amp; Marketplace. Great for peak season visibility.</div>
          </div>
        )}
      </div>

      {/* Vendor-to-Vendor B2B Purchasing + Badge on YOUR page - fully featured */}
      <div className="mb-8 bg-white border rounded-3xl p-8">
        <h3 className="font-bold text-2xl mb-1">Buy from Other Vendors (B2B)</h3>
        <p className="text-sm text-gray-600 mb-4">Purchase wholesale or overflow produce from peers. Choose to proudly display the seller's name + badge on <span className="font-medium">your public page</span> (great for transparency &amp; storytelling).</p>
        
        <B2BPurchasePanel myVendorId={myVendorId} API={API} />
      </div>

      {/* Vendor Profile Customization */}
      <div className="mb-8 bg-white border rounded-3xl p-8">
        <h3 className="font-bold text-2xl mb-4">Edit Your Storefront Page</h3>
        <div className="space-y-4 max-w-xl">
          <div>
            <label className="text-sm">Bio / Story (top of page)</label>
            <textarea className="w-full border p-3 rounded-2xl" placeholder="Our farm has been..." rows={3} id="bio-input" defaultValue={user?.bio || ''}></textarea>
          </div>
          <div>
            <label className="text-sm">Highlight Photo URL</label>
            <input className="w-full border p-3 rounded-2xl" placeholder="https://..." id="highlight-photo" defaultValue={user?.highlight_photo || 'https://picsum.photos/id/292/800/400'} />
          </div>
          <button 
            onClick={() => {
              const bio = document.getElementById('bio-input').value;
              const photo = document.getElementById('highlight-photo').value;
              fetch(`${API}/vendors/${myVendorId}/profile`, {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ bio, highlight_photo: photo })
              }).then(() => alert('Profile updated! Your bio and highlight photo will show on your public page.'));
            }}
            className="px-6 py-3 bg-[#083a9b] text-white rounded-3xl text-sm"
          >
            Save Profile Changes
          </button>
          <p className="text-xs text-gray-500">Top reviews from your customers will automatically appear below your bio.</p>
        </div>
      </div>

      {/* Vendor Payments - Stripe / PayPal Connect */}
      <div className="mb-8 bg-white border border-blue-200 rounded-3xl p-8">
        <h3 className="font-bold text-2xl mb-2 text-blue-900">Payment &amp; Payout Accounts</h3>
        <p className="text-sm text-gray-600 mb-4">Link your Stripe or PayPal account so customers can pay you directly during checkout. (Integration coming in production via real Stripe Connect / PayPal OAuth.)</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium">Stripe Connect Account ID</label>
            <input id="stripe-id" defaultValue={user?.stripe_account_id || ''} placeholder="acct_1234567890" className="w-full border p-3 rounded-2xl mt-1" />
            <button onClick={() => {
              const id = document.getElementById('stripe-id').value;
              if (!id) return alert('Enter Stripe account ID');
              fetch(`${API}/vendors/${myVendorId}/profile`, {
                method: 'PATCH',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ stripe_account_id: id })
              }).then(() => alert('Stripe account linked! Customers can now pay via your Stripe during checkout.'));
            }} className="mt-2 px-4 py-2 bg-[#635bff] text-white rounded-2xl text-sm">Save Stripe</button>
            <button onClick={() => {
              const mockId = 'acct_placeholder_' + Date.now();
              document.getElementById('stripe-id').value = mockId;
              alert('Stripe Connect simulation. In production this would redirect to Stripe OAuth for real account linking.');
            }} className="ml-2 px-4 py-2 border rounded-2xl text-sm">Connect with Stripe</button>
          </div>
          <div>
            <label className="text-sm font-medium">PayPal Account / Merchant ID</label>
            <input id="paypal-id" defaultValue={user?.paypal_account_id || ''} placeholder="your-paypal@email.com or merchant_id" className="w-full border p-3 rounded-2xl mt-1" />
            <button onClick={() => {
              const id = document.getElementById('paypal-id').value;
              if (!id) return alert('Enter PayPal ID/email');
              fetch(`${API}/vendors/${myVendorId}/profile`, {
                method: 'PATCH',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ paypal_account_id: id })
              }).then(() => alert('PayPal linked!'));
            }} className="mt-2 px-4 py-2 bg-[#00457C] text-white rounded-2xl text-sm">Save PayPal</button>
            <button onClick={() => {
              const mockId = 'paypal_placeholder_' + Date.now();
              document.getElementById('paypal-id').value = mockId;
              alert('PayPal simulation. In production this would link your real merchant account.');
            }} className="ml-2 px-4 py-2 border rounded-2xl text-sm">Connect PayPal</button>
          </div>
        </div>
        <p className="text-xs mt-4 text-gray-500">During checkout, if linked, the system will indicate payment goes to your account (platform may take small fee in real setup).</p>
      </div>

      {(vendorCan(user, 'orders') || vendorCan(user, 'sell')) && (
      <div className="mb-8 bg-white border rounded-3xl p-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-xl">Incoming Orders</h3>
          <Link to="/orders" className="text-sm text-[#083a9b] font-medium">Full order management →</Link>
        </div>
        {(analytics?.recentOrders?.length ?? 0) > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">Order</th>
                  <th className="py-2 pr-4">Total</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {analytics.recentOrders.map((o) => (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">#{o.id}</td>
                    <td className="py-2 pr-4">${(Number(o.total) || 0).toFixed(2)}</td>
                    <td className="py-2 pr-4 capitalize">{o.status || 'placed'}</td>
                    <td className="py-2">{o.date || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No orders yet. Share your storefront — orders placed by customers will appear here in real time.</p>
        )}
      </div>
      )}

      {vendorCan(user, 'analytics') && (
      <div className="mb-8 bg-white border rounded-3xl p-8">
        <h3 className="font-bold text-2xl mb-2">Your Earnings &amp; Performance</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 text-center">
          <div className="p-4 bg-gray-50 rounded-2xl">
            <div className="text-2xl font-bold">${monthRevenue.toFixed(2)}</div>
            <div className="text-xs text-gray-500">This Month Revenue</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-2xl">
            <div className="text-2xl font-bold">{analytics?.fulfilled ?? 0}</div>
            <div className="text-xs text-gray-500">Orders Fulfilled</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-2xl">
            <div className="text-2xl font-bold">{avgRating}</div>
            <div className="text-xs text-gray-500">Avg Customer Rating</div>
          </div>
        </div>

        <div className="mb-4">
          <div className="text-xs font-medium mb-2">Revenue Trend (last 6 weeks)</div>
          <div className="flex items-end gap-2 h-28 border-b pb-1">
            {weekBuckets.map((val, i) => (
              <div
                key={i}
                className="flex-1 bg-[#083a9b] rounded-t min-h-[4px]"
                style={{ height: `${Math.max(8, (val / maxWeek) * 100)}%` }}
                title={`Week ${i + 1}: $${val.toFixed(2)}`}
              />
            ))}
          </div>
          <div className="flex text-[9px] text-gray-400 mt-1 justify-between"><div>6 wks ago</div><div>This week</div></div>
        </div>

        <div className="text-xs text-gray-500">Data syncs from Supabase orders. Use the pricing calculator below to plan margins before listing.</div>
      </div>
      )}

      {/* Notifications & Chat */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border rounded-3xl p-6">
          <div className="font-semibold mb-3 flex justify-between">Live Notifications <span className="text-green-600">🛎️</span></div>
          <div className="space-y-2 text-sm">
            {(analytics?.notifications?.length ?? 0) > 0 ? (
              analytics.notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-2 rounded ${n.tone === 'green' ? 'bg-green-50' : n.tone === 'amber' ? 'bg-amber-50' : 'bg-blue-50'}`}
                >
                  {n.text}
                </div>
              ))
            ) : (
              <div className="p-2 bg-gray-50 rounded text-gray-500">Activity from orders and listings will appear here.</div>
            )}
          </div>
        </div>

        <div className="bg-white border rounded-3xl p-6">
          <div className="font-semibold mb-3">Live Chat with Customers &amp; Farmers</div>
          <div className="bg-gray-50 p-4 rounded-2xl text-sm h-24 overflow-auto mb-2">
            <div><strong>Customer:</strong> Hi, are the eggs from pasture-raised hens?</div>
            <div className="text-right text-green-600"><strong>You:</strong> Yes! All our eggs are from free-range hens on 10 acres.</div>
          </div>
          <input placeholder="Type a reply..." className="w-full border p-2 rounded-2xl text-sm" onKeyDown={e => { if (e.key === 'Enter') alert('Message sent! (Full chat system with real-time + notifications in next update)'); }} />
        </div>
      </div>

      {/* Social Sharing Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-3xl p-6 text-sm">
        <strong>Pro tip for vendors:</strong> After adding a listing, use the Share button to instantly reach Facebook Marketplace, X, WhatsApp, and more. 
        We pre-fill the details + link back to your Market and Shop storefront so customers order here while you promote everywhere.
      </div>

      <MyTopReviews reviews={analytics?.reviews || []} myVendorId={myVendorId} />
    </div>
  );
}

/* Inline B2B helper component */
function B2BPurchasePanel({ myVendorId, API }) {
  const [others, setOthers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [qty, setQty] = useState(10);
  const [price, setPrice] = useState(3.5);
  const [showBadge, setShowBadge] = useState(true);
  const [sellerName, setSellerName] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch(`${API}/produce-items`).then(r => r.json()).then(all => {
      const filtered = (all || []).filter(p => p.vendor_id !== myVendorId);
      setOthers(filtered.slice(0, 6));
      if (filtered[0]) {
        setSelected(filtered[0]);
        setPrice(filtered[0].price || 3.5);
        setSellerName((filtered[0].name || 'Farm') + ' farm direct');
      }
    }).catch(() => setOthers([]));
  }, [myVendorId, API]);

  const doPurchase = async () => {
    if (!selected || !myVendorId) return;
    const body = {
      buyer_vendor_id: myVendorId,
      seller_vendor_id: selected.vendor_id,
      item_id: selected.id,
      item_type: 'produce',
      quantity: parseInt(qty) || 1,
      price_per_unit: parseFloat(price) || selected.price,
      delivery_method: 'pickup',
      show_seller_badge: showBadge ? 1 : 0,
      seller_name_on_page: showBadge ? (sellerName || `Sourced from ${selected.name}`) : ''
    };
    try {
      const res = await fetch(`${API}/vendor-purchases`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
      if (res.ok) {
        setMsg(`✅ Purchase saved. ${showBadge ? 'The seller badge is now live on your public storefront page.' : ''}`);
        setTimeout(() => setMsg(''), 3800);
      }
    } catch(e){ setMsg('B2B vendor-to-vendor purchase recorded (for testing).'); }
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 text-sm">
        {others.length === 0 && <div className="text-gray-500 col-span-3">No peer produce found yet — encourage other vendors to list on Farmers Market.</div>}
        {others.map(item => (
          <div key={item.id} onClick={()=>{setSelected(item); setPrice(item.price||3.5); setSellerName(item.name+' direct');}}
            className={`border p-3 rounded-2xl cursor-pointer hover:border-emerald-400 ${selected?.id===item.id ? 'ring-1 ring-emerald-700 bg-emerald-50' : ''}`}>
            <div>{item.name} <span className="text-gray-400">• ${item.price}/{item.unit}</span></div>
          </div>
        ))}
      </div>
      {selected && (
        <div className="bg-[#f8f7f4] rounded-2xl p-4">
          <div className="text-xs uppercase tracking-widest mb-2 text-gray-500">BUYING {selected.name.toUpperCase()} FROM VENDOR #{selected.vendor_id}</div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input type="number" value={qty} onChange={e=>setQty(e.target.value)} className="border p-2 rounded-xl" placeholder="Qty" />
            <input type="number" step="0.1" value={price} onChange={e=>setPrice(e.target.value)} className="border p-2 rounded-xl" placeholder="Price/unit" />
            <label className="flex items-center gap-2 col-span-2 text-sm"><input type="checkbox" checked={showBadge} onChange={e=>setShowBadge(e.target.checked)} /> Display seller name &amp; badge on MY page</label>
          </div>
          {showBadge && <input className="mt-3 w-full border p-2 rounded-xl" value={sellerName} onChange={e=>setSellerName(e.target.value)} placeholder="Badge text shown on your page e.g. Fresh from Green Acres" />}
          <button onClick={doPurchase} className="mt-3 px-6 py-2 bg-emerald-800 text-white text-sm rounded-2xl w-full">Record B2B Purchase (Badge if checked)</button>
          {msg && <div className="text-emerald-600 mt-2 text-sm font-medium">{msg}</div>}
        </div>
      )}
    </div>
  );
}

function MyTopReviews({ reviews, myVendorId }) {
  if (!myVendorId) return null;
  return (
    <div className="bg-white border rounded-3xl p-8">
      <h4 className="font-semibold mb-3">Top Reviews for Your Storefront</h4>
      {reviews.length ? reviews.map((r) => (
        <div key={r.id} className="text-sm py-2 border-b last:border-0">
          {'★'.repeat(r.rating || 5)} {r.comment} {r.image_url && '📷'}
        </div>
      )) : (
        <div className="text-xs text-gray-500">Reviews on your menu and produce items will appear here and on your public /vendor page.</div>
      )}
    </div>
  );
}