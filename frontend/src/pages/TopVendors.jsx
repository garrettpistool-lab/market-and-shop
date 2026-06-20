import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import StarRating from '../components/StarRating';
import { fetchVendorsWithRatings } from '../lib/reviewsApi';

export default function TopVendors() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const minRating = Number(searchParams.get('min') || 0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await fetchVendorsWithRatings({ minRating, search });
      setVendors(data);
      setLoading(false);
    };
    load();
  }, [minRating, search]);

  const setMinRating = (val) => {
    const next = new URLSearchParams(searchParams);
    if (val > 0) next.set('min', String(val));
    else next.delete('min');
    setSearchParams(next);
  };

  return (
    <div>
      <h1 className="text-4xl font-bold tracking-tight mb-2">Top Vendors</h1>
      <p className="text-gray-600 mb-6">Search and filter by star rating — only public reviews count toward scores.</p>

      <div className="flex flex-wrap gap-3 mb-8 items-center">
        <input
          type="search"
          placeholder="Search vendors by name or category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-4 py-2.5 rounded-2xl text-sm flex-1 min-w-[200px] max-w-md"
        />
        <div className="flex flex-wrap gap-2 items-center text-sm">
          <span className="text-gray-500">Min rating:</span>
          {[
            { label: 'All', value: 0 },
            { label: '3+ ★', value: 3 },
            { label: '4+ ★', value: 4 },
            { label: '5 ★', value: 5 },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setMinRating(opt.value)}
              className={`px-3 py-1.5 rounded-2xl border transition ${
                minRating === opt.value
                  ? 'bg-[#083a9b] text-white border-[#083a9b]'
                  : 'bg-white hover:border-[#083a9b]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="text-gray-500 text-sm">Loading vendors…</div>}

      {!loading && vendors.length === 0 && (
        <EmptyState
          icon="🏪"
          title="No vendors match"
          message={minRating > 0 ? `No approved vendors with ${minRating}+ stars yet. Try a lower filter or leave a review after ordering.` : 'Approved vendors will appear here.'}
          actionLabel="Browse Marketplace"
          actionTo="/marketplace"
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {vendors.map((vendor) => {
          const rating = Number(vendor.avg_rating) || 0;
          const count = Number(vendor.review_count) || 0;
          return (
            <Link
              key={vendor.id}
              to={`/vendor/${vendor.id}`}
              className="bg-white border rounded-3xl p-6 hover:shadow-md hover:border-[#083a9b]/30 transition block"
            >
              <div className="flex gap-4">
                <img src={vendor.logo || 'https://i.pravatar.cc/56?img=47'} alt="" className="w-14 h-14 rounded-2xl object-cover shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-lg truncate">{vendor.name}</div>
                  <div className="text-sm text-gray-500">{vendor.category}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <StarRating value={Math.round(rating)} readOnly size="sm" />
                    <span className="text-xs font-semibold text-amber-700">
                      {rating ? rating.toFixed(1) : 'New'}
                    </span>
                    {count > 0 && <span className="text-xs text-gray-400">({count})</span>}
                  </div>
                </div>
              </div>
              <div className="mt-3 text-xs px-3 py-1 bg-emerald-100 text-emerald-700 inline-block rounded-3xl capitalize">
                {vendor.status}
              </div>
            </Link>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 mt-8 max-w-xl">
        Tip: After a purchase, rate vendors from their storefront Reviews tab. Low ratings (3★ or below) give vendors 3 days to respond before posting publicly.
      </p>
    </div>
  );
}