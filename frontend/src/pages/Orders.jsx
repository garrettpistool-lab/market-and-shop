import { useState, useEffect } from 'react';
import { useCart } from '../components/CartContext';
import { fetchOrdersForUser, placeOrder as placeOrderApi } from '../lib/ordersApi';
import { getVendorContext } from '../lib/plans';

export default function Orders({ user }) {
  const [orders, setOrders] = useState([]);
  const [placing, setPlacing] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1); // 1: review, 2: delivery/address, 3: payment, 4: confirm
  const [address, setAddress] = useState({ street: '', city: '', zip: '' });
  const [deliveryMethod, setDeliveryMethod] = useState('pickup');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [applyLoyalty, setApplyLoyalty] = useState(false);
  const [connectedDelivery, setConnectedDelivery] = useState({ doordash: false, ubereats: false });
  const [deliveryEstimate, setDeliveryEstimate] = useState(null);

  const { cart, removeFromCart, clearCart, total } = useCart();

  const loyaltyPoints = 120; // mock from previous loyalty system
  const loyaltyDiscount = applyLoyalty ? Math.min(5, Math.floor(total * 0.1)) : 0; // 10% up to $5 mock
  const finalTotal = Math.max(0, total - loyaltyDiscount);

  const vendorCtx = getVendorContext(user);
  const isVendor = user?.role?.toLowerCase() === 'vendor' || !!vendorCtx;

  useEffect(() => {
    if (!user) return;
    fetchOrdersForUser(user).then(setOrders).catch(() => setOrders([]));
  }, [user]);

  const getStatusColor = (status) => {
    if (status === 'delivered') return 'bg-emerald-100 text-emerald-700';
    if (status === 'preparing') return 'bg-amber-100 text-amber-700';
    return 'bg-blue-100 text-blue-700';
  };

  const connectDelivery = (app) => {
    setConnectedDelivery(prev => ({ ...prev, [app]: true }));
    alert(`Connected to ${app === 'doordash' ? 'DoorDash' : 'Uber Eats'} (simulated). Real integration will use OAuth / partner APIs.`);
  };

  const getEstimate = () => {
    const baseTime = deliveryMethod === 'doordash' ? 35 : deliveryMethod === 'ubereats' ? 30 : 0;
    const estimate = {
      time: baseTime + Math.floor(Math.random() * 10),
      fee: deliveryMethod === 'pickup' ? 0 : (deliveryMethod === 'doordash' ? 6.99 : 7.49),
      provider: deliveryMethod
    };
    setDeliveryEstimate(estimate);
    alert(`Estimate: ${estimate.time} min, $${estimate.fee} fee via ${estimate.provider}. (In prod: call DoorDash/Uber API with your connected account for live tracking link.)`);
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0 || !user) return;

    setPlacing(true);

    const vendorId = cart[0].vendor_id;
    // Mock: in real, fetch vendor to see if they have stripe/paypal linked
    const orderData = {
      user_id: user.id,
      vendor_id: vendorId,
      items: cart.map(i => ({ name: i.name, qty: i.qty || 1, price: i.price })),
      total: finalTotal,
      address: `${address.street}, ${address.city} ${address.zip}`,
      delivery_method: deliveryMethod,
      payment_method: paymentMethod,
      loyalty_applied: applyLoyalty ? loyaltyDiscount : 0,
      delivery_connected: connectedDelivery,
      tracking_note: deliveryMethod !== 'pickup' && (connectedDelivery.doordash || connectedDelivery.ubereats) ? 'Tracking via connected app' : ''
    };

    try {
      await placeOrderApi(orderData);
      const successMsg = `Order placed! Total: $${finalTotal.toFixed(2)}${loyaltyDiscount ? ` (saved $${loyaltyDiscount} with loyalty)` : ''}. ${deliveryMethod !== 'pickup' ? 'Tracking link sent to your connected delivery app.' : ''}`;
      alert(successMsg);
      clearCart();
      setCheckoutStep(1);
      setAddress({ street: '', city: '', zip: '' });
      setDeliveryEstimate(null);
      const fresh = await fetchOrdersForUser(user);
      setOrders(fresh);
    } catch (e) {
      alert(e.message || 'Error placing order.');
    }
    setPlacing(false);
  };

  const nextStep = () => setCheckoutStep(s => Math.min(4, s + 1));
  const prevStep = () => setCheckoutStep(s => Math.max(1, s - 1));

  return (
    <div>
      <h1 className="text-4xl font-bold tracking-tight mb-6">
        {isVendor ? 'Vendor Orders — Fulfillment' : 'My Orders & Checkout'}
      </h1>
      {isVendor && (
        <p className="text-gray-600 mb-6 -mt-4">Incoming orders for your storefront. Update status in the admin portal or mark fulfilled when complete.</p>
      )}

      {!isVendor && (
      <div className="bg-white border rounded-3xl p-6 mb-6">
        <h3 className="font-semibold mb-2">Connect Delivery Apps for Tracking &amp; Estimates</h3>
        <div className="flex gap-3 flex-wrap">
          <button onClick={() => connectDelivery('doordash')} className={`px-4 py-2 rounded-2xl text-sm border ${connectedDelivery.doordash ? 'bg-green-100 border-green-400' : ''}`}>
            {connectedDelivery.doordash ? '✅ DoorDash Connected' : 'Connect DoorDash'}
          </button>
          <button onClick={() => connectDelivery('ubereats')} className={`px-4 py-2 rounded-2xl text-sm border ${connectedDelivery.ubereats ? 'bg-green-100 border-green-400' : ''}`}>
            {connectedDelivery.ubereats ? '✅ Uber Eats Connected' : 'Connect Uber Eats'}
          </button>
          <button onClick={getEstimate} className="px-4 py-2 bg-blue-600 text-white rounded-2xl text-sm">Get Live Estimate (uses connected account)</button>
        </div>
        {deliveryEstimate && <div className="text-sm mt-2 text-green-700">Live estimate ready in checkout below.</div>}
        <p className="text-xs text-gray-500 mt-1">In production: OAuth to DoorDash/UberEats APIs for real-time estimates and order tracking IDs.</p>
      </div>
      )}

      {/* Current Cart + Fluid Multi-Step Checkout */}
      {!isVendor && cart.length > 0 && (
        <div className="bg-white border rounded-3xl p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-xl">Checkout</h2>
            <div className="font-semibold text-lg">Total: ${finalTotal.toFixed(2)} {loyaltyDiscount > 0 && <span className="text-green-600 text-sm">(−${loyaltyDiscount} loyalty)</span>}</div>
          </div>

          {/* Steps indicator */}
          <div className="flex mb-6 text-sm">
            {[1,2,3,4].map(s => (
              <div key={s} className={`flex-1 text-center py-1 ${checkoutStep === s ? 'font-bold border-b-2 border-[#083a9b]' : 'text-gray-400'}`}>
                {s === 1 && 'Review Cart'} {s === 2 && 'Delivery & Address'} {s === 3 && 'Payment'} {s === 4 && 'Confirm'}
              </div>
            ))}
          </div>

          {/* Step 1: Review */}
          {checkoutStep === 1 && (
            <>
              <div className="space-y-3 mb-6">
                {cart.map((item) => (
                  <div key={item.cartId} className="flex justify-between items-center border-b pb-3">
                    <div>
                      <div className="font-medium">{item.name} × {item.qty || 1}</div>
                      <div className="text-sm text-gray-500">${(item.price * (item.qty || 1)).toFixed(2)} from {item.vendor_name || 'vendor'}</div>
                    </div>
                    <button onClick={() => removeFromCart(item.cartId)} className="text-red-500 text-sm">Remove</button>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={nextStep} className="flex-1 py-3 bg-[#083a9b] text-white rounded-3xl font-semibold">Continue to Delivery</button>
                <button onClick={clearCart} className="px-6 border rounded-3xl">Clear Cart</button>
              </div>
            </>
          )}

          {/* Step 2: Delivery & Address + Connected Apps */}
          {checkoutStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm">Delivery Method</label>
                <select value={deliveryMethod} onChange={e => setDeliveryMethod(e.target.value)} className="w-full border p-3 rounded-2xl mt-1">
                  <option value="pickup">Local Pickup (Free, ready tomorrow)</option>
                  <option value="doordash">DoorDash (est. via connected account)</option>
                  <option value="ubereats">Uber Eats (est. via connected account)</option>
                </select>
              </div>
              {deliveryMethod !== 'pickup' && (
                <div className="bg-green-50 p-3 rounded text-sm">Using your connected {deliveryMethod} account for accurate estimates and tracking.</div>
              )}
              <div>
                <label className="text-sm">Delivery Address</label>
                <input placeholder="Street" value={address.street} onChange={e=>setAddress({...address, street:e.target.value})} className="w-full border p-3 rounded-2xl mt-1" />
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <input placeholder="City" value={address.city} onChange={e=>setAddress({...address, city:e.target.value})} className="border p-3 rounded-2xl" />
                  <input placeholder="ZIP" value={address.zip} onChange={e=>setAddress({...address, zip:e.target.value})} className="border p-3 rounded-2xl" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={prevStep} className="flex-1 py-3 border rounded-3xl">Back</button>
                <button onClick={nextStep} className="flex-1 py-3 bg-[#083a9b] text-white rounded-3xl font-semibold">Continue to Payment</button>
              </div>
            </div>
          )}

          {/* Step 3: Payment (uses vendor linked accounts if available) */}
          {checkoutStep === 3 && (
            <div>
              <div className="mb-4">
                <label className="text-sm font-medium">Payment Method (will route to vendor's linked account if set)</label>
                <div className="mt-2 space-y-2">
                  <label className="flex items-center gap-2"><input type="radio" name="pay" value="card" checked={paymentMethod==='card'} onChange={()=>setPaymentMethod('card')} /> Credit/Debit Card (via vendor Stripe if linked)</label>
                  <label className="flex items-center gap-2"><input type="radio" name="pay" value="paypal" checked={paymentMethod==='paypal'} onChange={()=>setPaymentMethod('paypal')} /> PayPal (via vendor PayPal if linked)</label>
                  <label className="flex items-center gap-2"><input type="radio" name="pay" value="cash" checked={paymentMethod==='cash'} onChange={()=>setPaymentMethod('cash')} /> Cash on Delivery / Pickup</label>
                </div>
              </div>
              <div className="mb-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={applyLoyalty} onChange={e=>setApplyLoyalty(e.target.checked)} /> Apply Loyalty Points (save up to ${loyaltyDiscount} from your {loyaltyPoints} points)
                </label>
              </div>
              <div className="flex gap-3">
                <button onClick={prevStep} className="flex-1 py-3 border rounded-3xl">Back</button>
                <button onClick={nextStep} className="flex-1 py-3 bg-[#083a9b] text-white rounded-3xl font-semibold">Review &amp; Confirm</button>
              </div>
            </div>
          )}

          {/* Step 4: Confirm */}
          {checkoutStep === 4 && (
            <div>
              <div className="bg-gray-50 p-4 rounded-2xl mb-4 text-sm">
                <div><strong>Delivery:</strong> {deliveryMethod} {deliveryEstimate ? `• ${deliveryEstimate.time} min • $${deliveryEstimate.fee}` : ''}</div>
                <div><strong>Address:</strong> {address.street}, {address.city} {address.zip}</div>
                <div><strong>Payment:</strong> {paymentMethod} {paymentMethod !== 'cash' ? '(to vendor linked account)' : ''}</div>
                <div><strong>Total after loyalty:</strong> ${finalTotal.toFixed(2)}</div>
              </div>
              <div className="flex gap-3">
                <button onClick={prevStep} className="flex-1 py-3 border rounded-3xl">Back</button>
                <button onClick={handlePlaceOrder} disabled={placing} className="flex-1 py-3 bg-emerald-600 text-white rounded-3xl font-semibold disabled:opacity-60">
                  {placing ? 'Processing...' : 'Place Order & Pay'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Past Orders */}
      <div className="bg-white border rounded-3xl p-6">
        <h2 className="font-semibold text-xl mb-4">{isVendor ? 'All Incoming Orders' : 'Past Orders'}</h2>
        {orders.length === 0 && <p className="text-gray-500">No orders yet.</p>}
        {orders.map(order => (
          <div key={order.id} className="border-b py-3 last:border-0">
            <div className="flex justify-between">
              <div>
                <div className="font-medium">Order #{order.id} • {order.date}</div>
                <div className="text-sm text-gray-500">${order.total} • {(() => { try { const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items; return Array.isArray(items) ? items.length : 0; } catch { return 0; } })()} items</div>
                {order.address && <div className="text-xs">To: {order.address}</div>}
              </div>
              <span className={`px-3 py-1 text-xs rounded-3xl self-start ${getStatusColor(order.status)}`}>{order.status}</span>
            </div>
            {order.delivery_method && order.delivery_method !== 'pickup' && <div className="text-xs mt-1 text-blue-600">Track in your connected {order.delivery_method} app</div>}
          </div>
        ))}
      </div>
    </div>
  );
}