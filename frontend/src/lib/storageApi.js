import { supabase } from './supabaseClient';

const BUCKET = 'review-photos';
const VENDOR_BUCKET = 'vendor-assets';
const AVATAR_BUCKET = 'profile-avatars';
const MAX_BYTES = 5 * 1024 * 1024;
const AVATAR_MAX = 3 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

async function uploadImage(file, { bucket, folder, user, maxBytes = MAX_BYTES }) {
  if (!file) throw new Error('Choose a photo first.');
  if (!user?.email) throw new Error('Sign in to upload photos.');
  if (!ALLOWED.includes(file.type)) {
    throw new Error('Use JPEG, PNG, WebP, or GIF.');
  }
  if (file.size > maxBytes) {
    throw new Error(`Photo must be under ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  }

  const safeFolder = folder || user.email.trim().toLowerCase().replace(/[^a-z0-9@._-]/g, '_');
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${safeFolder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type,
  });

  if (error) throw new Error(error.message || 'Upload failed');

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadReviewPhoto(file, user) {
  if (!file) throw new Error('Choose a photo first.');
  if (!user?.email) throw new Error('Sign in to upload photos.');
  if (!ALLOWED.includes(file.type)) {
    throw new Error('Use JPEG, PNG, WebP, or GIF.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Photo must be under 5 MB.');
  }

  const folder = user.email.trim().toLowerCase().replace(/[^a-z0-9@._-]/g, '_');
  return uploadImage(file, { bucket: BUCKET, folder: `${folder}/review`, user });
}

export async function uploadVendorAsset(file, user, vendorId, kind = 'banner') {
  const folder = `vendor-${vendorId}/${kind}`;
  return uploadImage(file, { bucket: VENDOR_BUCKET, folder, user });
}

export async function uploadProfileAvatar(file, user) {
  const folder = user.email.trim().toLowerCase().replace(/[^a-z0-9@._-]/g, '_');
  return uploadImage(file, { bucket: AVATAR_BUCKET, folder, user, maxBytes: AVATAR_MAX });
}