import { useState, useEffect } from 'react';
import StarRating from './StarRating';
import {
  fetchVendorPendingReviews,
  resolveVendorReview,
  daysUntil,
  processReviewDeadlines,
} from '../lib/reviewsApi';

export default function RatingAlertsPanel({ vendorId }) {
  const [alerts, setAlerts] = useState([]);
  const [notes, setNotes] = useState({});
  const [msg, setMsg] = useState('');

  const reload = async () => {
    await processReviewDeadlines();
    const pending = await fetchVendorPendingReviews(vendorId);
    setAlerts(pending);
  };

  useEffect(() => {
    if (vendorId) reload();
  }, [vendorId]);

  const handleResolve = async (reviewId) => {
    const note = (notes[reviewId] || '').trim();
    if (!note) {
      setMsg('Add a brief note explaining how you made it right.');
      return;
    }
    try {
      await resolveVendorReview(reviewId, vendorId, note);
      setMsg('Marked resolved — this review will not be posted publicly.');
      await reload();
    } catch (e) {
      setMsg(e.message);
    }
  };

  if (!alerts.length) return null;

  return (
    <div className="mb-8 bg-amber-50 border-2 border-amber-300 rounded-3xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">⚠️</span>
        <div>
          <h3 className="font-bold text-lg text-amber-900">Low Rating Alerts</h3>
          <p className="text-sm text-amber-800">
            {alerts.length} review{alerts.length !== 1 ? 's' : ''} need your attention. You have 3 days to make it right before they post to your public profile.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {alerts.map((r) => (
          <div key={r.id} className="bg-white border border-amber-200 rounded-2xl p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <StarRating value={r.rating} readOnly size="sm" />
                <p className="text-sm mt-2 text-gray-700">{r.comment}</p>
                <p className="text-xs text-amber-700 mt-1">
                  Auto-publishes in <strong>{daysUntil(r.grace_deadline)} day(s)</strong>
                  {r.reviewer_email && ` • from ${r.reviewer_email}`}
                </p>
              </div>
            </div>
            <textarea
              value={notes[r.id] || ''}
              onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
              placeholder="Describe your fix: refund, replacement, apology call…"
              className="w-full border p-2 rounded-xl text-sm mt-3 min-h-[60px]"
            />
            <button
              type="button"
              onClick={() => handleResolve(r.id)}
              className="mt-2 px-5 py-2 bg-emerald-700 text-white text-sm rounded-2xl font-medium"
            >
              Mark Resolved (keeps review private)
            </button>
          </div>
        ))}
      </div>
      {msg && <p className="text-sm mt-3 text-emerald-700">{msg}</p>}
    </div>
  );
}