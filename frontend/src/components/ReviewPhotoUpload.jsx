import { useRef, useState } from 'react';
import { uploadReviewPhoto } from '../lib/storageApi';

export default function ReviewPhotoUpload({ user, value, onChange, disabled }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const url = await uploadReviewPhoto(file, user);
      onChange(url);
    } catch (err) {
      setError(err.message || 'Upload failed');
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="mb-3">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFile}
          disabled={disabled || uploading}
          className="text-sm file:mr-3 file:py-2 file:px-4 file:rounded-2xl file:border-0 file:bg-[#083a9b] file:text-white file:font-medium file:cursor-pointer disabled:opacity-50"
        />
        {uploading && <span className="text-xs text-gray-500">Uploading…</span>}
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      {value && (
        <img src={value} alt="Review attachment" className="h-28 rounded-2xl object-cover border mt-2" />
      )}
      <p className="text-[10px] text-gray-400 mt-1">JPEG/PNG/WebP up to 5 MB. Stored securely in Supabase.</p>
    </div>
  );
}