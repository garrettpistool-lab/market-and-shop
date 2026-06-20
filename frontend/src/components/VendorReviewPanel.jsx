import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StarRating from './StarRating';
import {
  submitVendorReview,
  updateVendorReview,
  fetchUserReviewForVendor,
  fetchPublicReviews,
  customerCanReviewVendor,
  isReviewEditable,
  daysUntil,
  formatStars,
} from '../lib/reviewsApi';
import ReviewPhotoUpload from './ReviewPhotoUpload';

export default function VendorReviewPanel({ vendorId, user, vendorName }) {
  const [publicReviews, setPublicReviews] = useState([]);
  const [myReview, setMyReview] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewGate, setReviewGate] = useState({ allowed: true, reason: '' });

  const isCustomer = ['customer', 'admin'].includes((user?.role || '').toLowerCase());
  const canEdit = myReview && isReviewEditable(myReview);

  const reload = async () => {
    setLoading(true);
    const [pub, mine] = await Promise.all([
      fetchPublicReviews(vendorId),
      user ? fetchUserReviewForVendor(vendorId, user) : Promise.resolve(null),
    ]);
    setPublicReviews(pub);
    setMyReview(mine);
    if (user && isCustomer && !mine) {
      const gate = await customerCanReviewVendor(vendorId, user);
      setReviewGate(gate);
    } else {
      setReviewGate({ allowed: true, reason: '' });
    }
    if (mine) {
      setRating(mine.rating);
      setComment(mine.comment || '');
      setImageUrl(mine.image_url || '');
    }
    setLoading(false);
  };

  useEffect(() => {
    reload();
  }, [vendorId, user?.email]);

  const handleSubmit = async () => {
    if (!comment.trim()) {
      setMessage('Please add a short comment.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      if (myReview) {
        await updateVendorReview(myReview.id, user, { rating, comment, imageUrl });
        setMessage('Review updated.');
      } else {
        const result = await submitVendorReview({
          vendorId,
          user,
          rating,
          comment,
          imageUrl,
        });
        if (result.status === 'pending_resolution') {
          setMessage(
            `Thanks — your ${rating}-star review was sent privately. The vendor has 3 days to respond before it may appear publicly. You can edit for up to 5 days.`
          );
        } else {
          setMessage('Thank you! Your review is now live on their profile.');
        }
      }
      await reload();
    } catch (e) {
      setMessage(e.message || 'Could not save review.');
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="text-sm text-gray-500 py-4">Loading reviews…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border rounded-3xl p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="font-semibold text-xl">Customer Reviews</h3>
          <span className="text-sm text-gray-500">{publicReviews.length} public review{publicReviews.length !== 1 ? 's' : ''}</span>
        </div>

        {publicReviews.length === 0 ? (
          <p className="text-gray-500 text-sm">No public reviews yet. Be the first to share your experience with {vendorName}.</p>
        ) : (
          <div className="space-y-5">
            {publicReviews.map((r) => (
              <div key={r.id} className="flex gap-4 border-b last:border-0 pb-4 last:pb-0">
                <div className="text-amber-500 text-xl shrink-0">{formatStars(r.rating)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">{r.comment}</p>
                  {r.vendor_response && (
                    <p className="text-xs text-emerald-700 mt-2 bg-emerald-50 rounded-xl px-3 py-2">
                      <strong>Vendor response:</strong> {r.vendor_response}
                    </p>
                  )}
                  {r.image_url && (
                    <img src={r.image_url} className="mt-2 max-h-48 rounded-2xl border object-cover" alt="Review" />
                  )}
                  <div className="text-[10px] text-gray-400 mt-1">{r.date || r.created_at?.slice?.(0, 10)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isCustomer ? (
        <div className="bg-white border rounded-3xl p-8">
          <h3 className="font-semibold mb-1">{myReview ? 'Edit Your Review' : 'Rate This Vendor'}</h3>
          <p className="text-xs text-gray-500 mb-4">
            Verified customers only (order required). 4–5 stars publish immediately. 3★ or below gives the vendor 3 days to respond.
            {myReview && canEdit && ` Edit window: ${daysUntil(myReview.editable_until)} day(s) left.`}
            {myReview && !canEdit && ' This review is permanent.'}
          </p>

          {!myReview && !reviewGate.allowed && (
            <div className="text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-4 py-3 mb-4">
              {reviewGate.reason}{' '}
              <Link to="/marketplace" className="text-[#083a9b] font-medium underline">Browse marketplace</Link>
            </div>
          )}

          <StarRating
            value={rating}
            onChange={setRating}
            size="lg"
            readOnly={(myReview && !canEdit) || (!myReview && !reviewGate.allowed)}
          />

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={myReview && !canEdit}
            placeholder="What stood out? Freshness, service, value…"
            className="w-full border p-3 rounded-2xl h-24 mt-4 mb-3 text-sm disabled:bg-gray-50"
          />

          {(!myReview || canEdit) && reviewGate.allowed && (
            <ReviewPhotoUpload
              user={user}
              value={imageUrl}
              onChange={setImageUrl}
              disabled={myReview && !canEdit}
            />
          )}

          {myReview?.status === 'pending_resolution' && (
            <div className="text-xs bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-3 py-2 mb-3">
              Pending — vendor notified. Auto-publishes in {daysUntil(myReview.grace_deadline)} day(s) if unresolved.
            </div>
          )}

          {(!myReview || canEdit) && reviewGate.allowed && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="px-8 py-2.5 bg-[#083a9b] text-white rounded-3xl font-semibold disabled:opacity-60"
            >
              {saving ? 'Saving…' : myReview ? 'Update Review' : 'Submit Review'}
            </button>
          )}

          {message && <p className="text-sm mt-3 text-emerald-600">{message}</p>}
        </div>
      ) : (
        <div className="bg-[#f8f7f4] border rounded-2xl p-4 text-sm text-gray-600">
          <Link to="/login" className="text-[#083a9b] font-medium">Sign in as a customer</Link> to leave a star rating.
        </div>
      )}
    </div>
  );
}