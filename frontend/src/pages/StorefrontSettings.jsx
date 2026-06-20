import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { uploadVendorAsset } from '../lib/storageApi';
import { getVendorContext, planBadgeLabel, vendorCan } from '../lib/plans';
import EmployeeManagement from '../components/EmployeeManagement';

function parseBanners(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export default function StorefrontSettings({ user }) {
  const ctx = getVendorContext(user);
  const vendorId = ctx?.vendorId;
  const plan = ctx?.plan || 'free';
  const isPaid = plan === 'paid';

  const [vendor, setVendor] = useState(null);
  const [banners, setBanners] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');
  const [message, setMessage] = useState('');
  const logoRef = useRef(null);
  const highlightRef = useRef(null);
  const bannerRef = useRef(null);

  useEffect(() => {
    if (!vendorId) return;
    supabase
      .from('vendors')
      .select('*')
      .eq('id', Number(vendorId))
      .single()
      .then(({ data }) => {
        if (data) {
          setVendor(data);
          setBanners(parseBanners(data.banner_images));
        }
      });
  }, [vendorId]);

  const canBio = vendorCan(user, 'bio_edit');
  const canProfile = vendorCan(user, 'profile_editor');
  const canTheme = vendorCan(user, 'theme') && isPaid;
  const canBanners = vendorCan(user, 'banners') && isPaid;
  const canEmployees = vendorCan(user, 'employees');

  const save = async () => {
    if (!vendorId || !vendor) return;
    setSaving(true);
    setMessage('');

    const payload = {
      name: vendor.name,
      bio: vendor.bio,
      category: vendor.category,
    };

    if (canBio && isPaid) payload.slogan = vendor.slogan || '';
    if (canProfile) {
      payload.logo = vendor.logo;
      payload.highlight_photo = vendor.highlight_photo;
    }
    if (canTheme) payload.theme_color = vendor.theme_color || '#083a9b';
    if (canBanners) payload.banner_images = banners;

    const { error } = await supabase.from('vendors').update(payload).eq('id', Number(vendorId));
    setSaving(false);
    setMessage(error ? error.message : 'Storefront saved.');
  };

  const handleUpload = async (file, kind) => {
    if (!file || !vendorId) return;
    setUploading(kind);
    setMessage('');
    try {
      const url = await uploadVendorAsset(file, user, vendorId, kind);
      if (kind === 'logo') {
        setVendor((v) => ({ ...v, logo: url }));
      } else if (kind === 'highlight') {
        setVendor((v) => ({ ...v, highlight_photo: url }));
      } else if (kind === 'banner') {
        setBanners((prev) => [...prev, url].slice(0, 6));
      }
      setMessage(`${kind} uploaded — click Save Changes to publish.`);
    } catch (e) {
      setMessage(e.message);
    }
    setUploading('');
  };

  const removeBanner = (idx) => {
    setBanners((prev) => prev.filter((_, i) => i !== idx));
  };

  if (!vendorId) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8">
        <p className="text-sm">No vendor profile linked to this account.</p>
        <Link to="/vendor-dashboard" className="text-[#083a9b] text-sm font-medium mt-2 inline-block">
          Go to Dashboard
        </Link>
      </div>
    );
  }

  const accent = vendor?.theme_color || '#083a9b';

  return (
    <div>
      <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Storefront Editor</h1>
          <p className="text-gray-600">
            Public profile for{' '}
            <Link to={`/vendor/${vendorId}`} className="font-medium" style={{ color: accent }}>
              your storefront page
            </Link>
          </p>
        </div>
        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'}`}>
          {planBadgeLabel(plan, 'vendor')}
        </span>
      </div>

      {!isPaid && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-900">
          Free vendors can edit bio, profile pictures, and listings. Upgrade to <strong>Paid</strong> to unlock custom colors, banner gallery, slogan, and unlimited employees.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border rounded-3xl p-8 space-y-5">
          <h2 className="font-semibold text-lg">Store details</h2>

          <div>
            <label className="text-sm font-medium">Store name</label>
            <input
              className="w-full border p-3 rounded-2xl mt-1"
              value={vendor?.name || ''}
              onChange={(e) => setVendor((v) => ({ ...v, name: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Category</label>
            <input
              className="w-full border p-3 rounded-2xl mt-1"
              value={vendor?.category || ''}
              onChange={(e) => setVendor((v) => ({ ...v, category: e.target.value }))}
            />
          </div>

          {canBio && (
            <>
              <div>
                <label className="text-sm font-medium">Bio</label>
                <textarea
                  className="w-full border p-3 rounded-2xl mt-1 min-h-[100px]"
                  value={vendor?.bio || ''}
                  onChange={(e) => setVendor((v) => ({ ...v, bio: e.target.value }))}
                  placeholder="Tell customers your story…"
                />
              </div>
              {isPaid && (
                <div>
                  <label className="text-sm font-medium">Slogan / tagline</label>
                  <input
                    className="w-full border p-3 rounded-2xl mt-1"
                    value={vendor?.slogan || ''}
                    onChange={(e) => setVendor((v) => ({ ...v, slogan: e.target.value }))}
                    placeholder="e.g. Fresh local flavors, made with care."
                  />
                </div>
              )}
            </>
          )}

          {canTheme && (
            <div>
              <label className="text-sm font-medium">Theme color (paid)</label>
              <div className="flex gap-3 mt-1 items-center">
                <input
                  type="color"
                  value={vendor?.theme_color || '#083a9b'}
                  onChange={(e) => setVendor((v) => ({ ...v, theme_color: e.target.value }))}
                  className="w-12 h-12 rounded-xl border cursor-pointer"
                />
                <input
                  className="flex-1 border p-3 rounded-2xl font-mono text-sm"
                  value={vendor?.theme_color || '#083a9b'}
                  onChange={(e) => setVendor((v) => ({ ...v, theme_color: e.target.value }))}
                />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-8 py-3 text-white rounded-3xl font-semibold disabled:opacity-60"
            style={{ backgroundColor: accent }}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          {message && <p className="text-sm text-emerald-600">{message}</p>}
        </div>

        <div className="space-y-6">
          {canProfile && (
            <div className="bg-white border rounded-3xl p-8">
              <h2 className="font-semibold text-lg mb-4">Profile pictures</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium mb-2">Logo</div>
                  <img
                    src={vendor?.logo || 'https://i.pravatar.cc/120?img=47'}
                    alt=""
                    className="w-24 h-24 rounded-2xl object-cover border mb-2"
                  />
                  <input
                    ref={logoRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleUpload(e.target.files?.[0], 'logo')}
                  />
                  <button
                    type="button"
                    onClick={() => logoRef.current?.click()}
                    disabled={uploading === 'logo'}
                    className="text-xs px-3 py-1.5 border rounded-xl"
                  >
                    {uploading === 'logo' ? 'Uploading…' : 'Upload logo'}
                  </button>
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">Highlight photo</div>
                  <img
                    src={vendor?.highlight_photo || 'https://picsum.photos/200/120'}
                    alt=""
                    className="w-full h-24 rounded-2xl object-cover border mb-2"
                  />
                  <input
                    ref={highlightRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleUpload(e.target.files?.[0], 'highlight')}
                  />
                  <button
                    type="button"
                    onClick={() => highlightRef.current?.click()}
                    disabled={uploading === 'highlight'}
                    className="text-xs px-3 py-1.5 border rounded-xl"
                  >
                    {uploading === 'highlight' ? 'Uploading…' : 'Upload highlight'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {canBanners ? (
            <div className="bg-white border rounded-3xl p-8">
              <h2 className="font-semibold text-lg mb-2">Banner gallery (paid)</h2>
              <p className="text-xs text-gray-500 mb-4">Up to 6 images rotate on your public storefront.</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {banners.map((url, i) => (
                  <div key={url} className="relative group">
                    <img src={url} alt="" className="w-full h-24 object-cover rounded-xl border" />
                    <button
                      type="button"
                      onClick={() => removeBanner(i)}
                      className="absolute top-1 right-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <input
                ref={bannerRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUpload(e.target.files?.[0], 'banner')}
              />
              <button
                type="button"
                onClick={() => bannerRef.current?.click()}
                disabled={uploading === 'banner' || banners.length >= 6}
                className="text-sm px-4 py-2 border rounded-2xl disabled:opacity-50"
              >
                {uploading === 'banner' ? 'Uploading…' : '+ Add banner image'}
              </button>
            </div>
          ) : isPaid ? null : (
            <div className="bg-gray-50 border border-dashed rounded-3xl p-6 text-sm text-gray-500">
              Banner gallery and theme colors are available on the <strong>Paid Vendor</strong> plan.
            </div>
          )}
        </div>
      </div>

      {canEmployees && (
        <div className="mt-8">
          <EmployeeManagement user={user} vendorId={vendorId} plan={plan} />
        </div>
      )}
    </div>
  );
}