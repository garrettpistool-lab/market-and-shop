import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { signIn } from '../lib/auth';
import { auth0Enabled } from '../lib/config';
import Auth0LoginButton from '../components/Auth0LoginButton';

export default function Login({ onLogin, loading }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [message, setMessage] = useState('');
  const [needs2FA, setNeeds2FA] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [twoFAMsg, setTwoFAMsg] = useState('');

  const doRealLogin = async (em, token = '') => {
    try {
      const profile = await signIn(em, token);
      onLogin(profile);
    } catch (e) {
      console.error('Login error:', e);
      setMessage(e.message || 'Login failed. Check your email/password and try again.');
    }
  };

  const submit2FA = () => {
    if (!pendingUser?.email) return;
    if (twoFactorToken.length < 6) { setTwoFAMsg('Enter full 6-digit code'); return; }
    doRealLogin(pendingUser.email, twoFactorToken);
    setTimeout(() => { setNeeds2FA(false); setTwoFactorToken(''); }, 600);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Sign up successful! Check your email for confirmation link (or login directly if email confirm disabled in Supabase).');
      } else {
        await doRealLogin(email, password);
      }
    } catch (e) {
      setMessage(e.message || 'Authentication error. Please try again.');
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setMessage('Please enter your email above first.');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/login'
    });
    setMessage(error ? error.message : 'Password reset link sent! Check your email.');
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-[#083a9b] rounded-3xl mx-auto flex items-center justify-center mb-4">
            <span className="text-white text-4xl">🍽️</span>
          </div>
          <h1 className="text-5xl font-bold tracking-tighter heading-font">Market and Shop</h1>
          <p className="text-gray-500 mt-2">Vendor Portal &amp; Culinary Marketplace</p>
        </div>

        <div className="bg-white border rounded-3xl p-8 shadow-sm">
          <h2 className="font-semibold text-xl mb-6 text-center">Sign in to your account</h2>

          {!needs2FA && (
            <>
              <div className="text-center text-sm text-gray-500 mb-4">
                {auth0Enabled ? 'Sign in securely with Auth0, or use email below' : 'Sign in or create an account below'}
              </div>

              {auth0Enabled && (
                <div className="mb-4">
                  <Auth0LoginButton disabled={loading} />
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400">or email</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                </div>
              )}

              <form onSubmit={handleAuth} className="space-y-3">
                <input 
                  type="email" 
                  placeholder="your@email.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border p-3.5 rounded-2xl text-sm" 
                  required 
                />
                <input 
                  type="password" 
                  placeholder="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border p-3.5 rounded-2xl text-sm" 
                  required 
                />
                {isSignUp && (
                  <label className="flex items-start gap-2 text-xs text-gray-600">
                    <input 
                      type="checkbox" 
                      checked={agreedToTerms} 
                      onChange={(e) => setAgreedToTerms(e.target.checked)} 
                      className="mt-0.5" 
                      required 
                    />
                    <span>
                      I agree to the <Link to="/agreements" className="underline">Terms, Agreements &amp; Privacy Policy</Link> and <Link to="/faq" className="underline">FAQ</Link>. I understand this is a person-to-person / business-to-business platform and I must comply with all local laws.
                    </span>
                  </label>
                )}
                <button 
                  type="submit"
                  disabled={loading || (isSignUp && !agreedToTerms)}
                  className="w-full py-3.5 bg-[#083a9b] text-white rounded-3xl font-semibold disabled:opacity-70"
                >
                  {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
                </button>
                <button 
                  type="button"
                  onClick={() => { setIsSignUp(!isSignUp); setAgreedToTerms(false); }}
                  className="text-xs text-[#083a9b] underline"
                >
                  {isSignUp ? 'Have an account? Sign In' : "Don't have an account? Sign Up"}
                </button>
                <button 
                  type="button"
                  onClick={handlePasswordReset}
                  className="text-xs text-gray-500 underline block"
                >
                  Forgot password?
                </button>
                {message && <div className="text-xs text-center text-emerald-600">{message}</div>}
              </form>
            </>
          )}

          {needs2FA && pendingUser && (
            <div>
              <div className="text-center mb-4">
                <div className="text-2xl mb-1">🔐</div>
                <div className="font-semibold">Two-Factor Required</div>
                <div className="text-sm text-gray-500">for {pendingUser.email}</div>
              </div>
              <input value={twoFactorToken} onChange={e=>setTwoFactorToken(e.target.value.replace(/\D/g,''))} maxLength={6} placeholder="123456" className="w-full text-center border p-4 rounded-3xl font-mono tracking-[8px] text-2xl" />
              <button onClick={submit2FA} className="mt-3 w-full py-3 bg-emerald-700 text-white rounded-3xl font-semibold">Verify Code &amp; Sign In</button>
              <button onClick={()=>{setNeeds2FA(false); setTwoFactorToken(''); setPendingUser(null);}} className="mt-2 w-full text-xs text-gray-500">Cancel / Use different account</button>
              {twoFAMsg && <div className="mt-3 text-xs text-center text-emerald-600">{twoFAMsg}</div>}
              <div className="text-[10px] text-center text-gray-400 mt-4">Enter any 6-digit code if 2FA is enabled for the account in Supabase.</div>
            </div>
          )}

          <div className="mt-6 text-center text-sm">
            Don't have an account?{' '}
            <Link to="/signup" className="text-[#083a9b] font-medium">Sign up</Link>
          </div>
        </div>
      </div>
    </div>
  );
}