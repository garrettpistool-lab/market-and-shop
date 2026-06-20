import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { uploadProfileAvatar } from '../lib/storageApi';
import {
  FREE_CUSTOMER_RATING_MIN_PURCHASES,
  getCustomerContext,
  getVendorContext,
  planBadgeLabel,
} from '../lib/plans';

export default function AccountSettings({ user, onProfileUpdate }) {
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [doordash, setDoordash] = useState(!!user?.doordash_linked);
  const [ubereats, setUbereats] = useState(!!user?.ubereats_linked);
  const [twoFA, setTwoFA] = useState({ enabled: !!user?.two_factor_enabled, secret: '', otpauth: '', token: '' });
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const API = import.meta.env.VITE_API_URL || '/api';

  const customerCtx = getCustomerContext(user);
  const vendorCtx = getVendorContext(user);
  const role = (user?.role || '').toLowerCase();

  const setup2FA = async () => {
    if (!user?.id) return alert('Login required');
    try {
      const res = await fetch(`${API}/2fa/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });
      const data = await res.json();
      setTwoFA({ ...twoFA, secret: data.secret, otpauth: data.otpauth, enabled: false });
      setStatus('Scan the otpauth link in your authenticator app.');
    } catch {
      setStatus('2FA setup failed (backend offline?)');
    }
  };

  const verify2FA = async () => {
    if (!twoFA.token || twoFA.token.length < 6 || !user?.id) return;
    try {
      const res = await fetch(`${API}/2fa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, token: twoFA.token }),
      });
      const data = await res.json();
      if (data.success) {
        setTwoFA({ ...twoFA, enabled: true });
        setStatus('2FA enabled for this account.');
        const saved = JSON.parse(localStorage.getItem('mas_user') || '{}');
        saved.two_factor_enabled = 1;
        localStorage.setItem('mas_user', JSON.stringify(saved));
      } else {
        setStatus('Invalid code. Try again.');
      }
    } catch {
      setStatus('Verify error');
    }
  };

  const disable2FA = async () => {
    await fetch(`${API}/2fa/disable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id }),
    });
    setTwoFA({ enabled: false, secret: '', otpauth: '', token: '' });
    setStatus('2FA disabled.');
  };

  const saveProfile = async () => {
    if (!user?.email) return;
    setSaving(true);
    setStatus('');
    const { error } = await supabase
      .from('users')
      .update({
        name,
        avatar,
        doordash_linked: doordash,
        ubereats_linked: ubereats,
      })
      .ilike('email', user.email.trim());

    setSaving(false);
    if (error) {
      setStatus(error.message);
      return;
    }

    const updated = {
      ...user,
      name,
      avatar,
      doordash_linked: doordash,
      ubereats_linked: ubereats,
    };
    localStorage.setItem('mas_user', JSON.stringify(updated));
    onProfileUpdate?.(updated);
    setStatus('Profile saved.');
  };

  const handleAvatarUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadProfileAvatar(file, user);
      setAvatar(url);
      setStatus('Photo uploaded — click Save Profile to apply.');
    } catch (e) {
      setStatus(e.message);
    }
    setUploading(false);
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-4xl font-bold tracking-tight mb-2">Account Settings</h1>
      <p className="text-gray-600 mb-8">Manage your profile, plan, and security.</p>

      {(role === 'customer' || role === 'guest') && customerCtx && (
        <div className="mb-6 p-4 border rounded-3xl bg-white flex justify-between items-center">
          <div>
            <div className="font-semibold">{planBadgeLabel(customerCtx.plan, 'customer')}</div>
            <div className="text-sm text-gray-600 mt-1">
              {customerCtx.plan === 'paid'
                ? 'Full access including ratings, favorites, and loyalty.'
                : `Buy, track orders, and link delivery apps. Ratings unlock after ${FREE_CUSTOMER_RATING_MIN_PURCHASES} purchases (${customerCtx.purchaseCount}/${FREE_CUSTOMER_RATING_MIN_PURCHASES}).`}
            </div>
          </div>
          {customerCtx.plan === 'free' && !customerCtx.canRate && (
            <div className="text-xs bg-amber-50 text-amber-800 px-3 py-2 rounded-2xl">
              {customerCtx.purchasesUntilRating} purchases to rate
            </div>
          )}
        </div>
      )}

      {vendorCtx && (
        <div className="mb-6 p-4 border rounded-3xl bg-white">
          <div className="font-semibold">{planBadgeLabel(vendorCtx.plan, 'vendor')}</div>
          <div className="text-sm text-gray-600 mt-1">
            {vendorCtx.isEmployee
              ? `Employee access for vendor #${vendorCtx.vendorId} — ${vendorCtx.permissions.length} permissions`
              : vendorCtx.plan === 'paid'
                ? 'Full storefront customization, analytics, and unlimited employees.'
                : 'Selling, bio, profile editor, ratings, and 1 employee seat.'}
          </div>
        </div>
      )}

      <div className="bg-white border rounded-3xl p-8 mb-6">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <img src={avatar || user?.avatar} alt="" className="w-16 h-16 rounded-2xl object-cover border" />
            <div>
              <div className="text-sm font-medium">Profile picture</div>
              <label className="text-xs text-[#083a9b] cursor-pointer hover:underline">
                {uploading ? 'Uploading…' : 'Upload new photo'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleAvatarUpload(e.target.files?.[0])}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Full Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full border p-3 rounded-2xl"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              defaultValue={user?.email || 'you@example.com'}
              readOnly
              className="mt-1 w-full border p-3 rounded-2xl bg-gray-50"
            />
          </div>

          {(role === 'customer' || customerCtx) && customerCtx?.permissions.includes('delivery_connect') && (
            <div className="border-t pt-4">
              <div className="text-sm font-medium mb-3">Delivery app connections</div>
              <label className="flex items-center gap-2 text-sm mb-2">
                <input type="checkbox" checked={doordash} onChange={(e) => setDoordash(e.target.checked)} />
                DoorDash linked
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={ubereats} onChange={(e) => setUbereats(e.target.checked)} />
                Uber Eats linked
              </label>
              <p className="text-xs text-gray-500 mt-2">Used at checkout for live tracking (OAuth integration coming).</p>
            </div>
          )}

          <button
            type="button"
            onClick={saveProfile}
            disabled={saving}
            className="px-8 py-3 bg-[#083a9b] text-white rounded-3xl font-semibold disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
          {status && <p className="text-sm text-[#083a9b]">{status}</p>}
        </div>
      </div>

      <div className="bg-white border rounded-3xl p-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-semibold text-xl">Two-Factor Authentication (2FA)</div>
            <div className="text-sm text-gray-600">Protect every account. Required on login when enabled.</div>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${twoFA.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {twoFA.enabled ? 'ENABLED' : 'OFF'}
          </div>
        </div>

        {!twoFA.enabled && !twoFA.otpauth && (
          <button type="button" onClick={setup2FA} className="px-8 py-3 bg-black text-white rounded-3xl font-semibold">
            Set Up 2FA
          </button>
        )}

        {twoFA.otpauth && (
          <div className="mt-4 p-4 bg-gray-50 border rounded-2xl text-sm">
            <div className="font-medium">1. Scan or copy into your authenticator app:</div>
            <div className="font-mono break-all mt-1 text-xs bg-white p-2 border rounded">{twoFA.otpauth}</div>
            <div className="mt-3">2. Enter the 6-digit code:</div>
            <input
              value={twoFA.token}
              onChange={(e) => setTwoFA({ ...twoFA, token: e.target.value })}
              maxLength={6}
              className="mt-1 w-40 border p-3 font-mono rounded-2xl tracking-[6px]"
              placeholder="123456"
            />
            <button type="button" onClick={verify2FA} className="ml-3 px-6 py-3 bg-emerald-700 text-white rounded-3xl text-sm">
              Verify &amp; Enable
            </button>
          </div>
        )}

        {twoFA.enabled && (
          <div>
            <div className="text-emerald-700 text-sm mb-3">2FA is active on this account.</div>
            <button type="button" onClick={disable2FA} className="text-xs px-4 py-2 border rounded-2xl">
              Disable 2FA (not recommended)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}