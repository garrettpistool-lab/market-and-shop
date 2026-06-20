/** Auth0 config — reads VITE_* or AUTH0_* (Vercel marketplace integration) */

export function getAuth0Domain() {
  return (import.meta.env.VITE_AUTH0_DOMAIN || import.meta.env.AUTH0_DOMAIN || '').trim();
}

export function getAuth0ClientId() {
  return (import.meta.env.VITE_AUTH0_CLIENT_ID || import.meta.env.AUTH0_CLIENT_ID || '').trim();
}

export function isAuth0Configured() {
  if (import.meta.env.VITE_AUTH0_ENABLED === 'false') return false;
  return !!(getAuth0Domain() && getAuth0ClientId());
}

const DEFAULT_APP_URL = 'https://your-app.vercel.app';

/** Vercel Auth0 integration provisions Next.js-style `/api/auth/callback` URLs. */
export function getAuth0CallbackPath() {
  return (import.meta.env.VITE_AUTH0_CALLBACK_PATH || '/api/auth/callback').trim();
}

export function getAuth0RedirectUri() {
  const base =
    typeof window !== 'undefined'
      ? window.location.origin
      : (import.meta.env.VITE_APP_URL || DEFAULT_APP_URL).replace(/\/$/, '');
  const path = getAuth0CallbackPath();
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function getAuth0ProviderProps() {
  return {
    domain: getAuth0Domain(),
    clientId: getAuth0ClientId(),
    authorizationParams: {
      redirect_uri: getAuth0RedirectUri(),
    },
    cacheLocation: 'localstorage',
    useRefreshTokens: true,
  };
}