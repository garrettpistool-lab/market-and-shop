import { useAuth0 } from '@auth0/auth0-react';

export default function Auth0LoginButton({ disabled }) {
  const { loginWithRedirect, isLoading } = useAuth0();

  return (
    <button
      type="button"
      disabled={disabled || isLoading}
      onClick={() =>
        loginWithRedirect({
          appState: { returnTo: window.location.pathname || '/' },
        })
      }
      className="w-full py-3 bg-[#eb5424] hover:bg-[#d44a1f] text-white rounded-3xl font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
    >
      <span className="text-lg">🔐</span>
      {isLoading ? 'Redirecting…' : 'Continue with Auth0'}
    </button>
  );
}