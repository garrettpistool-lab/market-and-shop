import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function CustomerSignUp({ onLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!agreedToTerms) {
      setMessage('You must agree to the Terms, Agreements, Privacy Policy and FAQ to sign up.');
      return;
    }
    if (!name || !email || !password) {
      setMessage('Please fill out name, email and password.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      // Create profile row (best effort)
      await supabase.from('users').insert({
        name,
        email,
        role: 'customer'
      }).select().maybeSingle();
      // Notify parent (it will refetch profile)
      onLogin({ name, email, role: 'customer' });
    } catch (e) {
      setMessage(e.message || 'Sign up failed. Try the unified form on /login instead.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Customer Sign Up</h1>
      <div className="bg-white border rounded-3xl p-8">
        <form onSubmit={handleSignUp} className="space-y-4">
          <input 
            placeholder="Full name" 
            value={name} 
            onChange={e=>setName(e.target.value)}
            className="w-full border p-3.5 rounded-2xl" 
            required 
          />
          <input 
            placeholder="Email address" 
            value={email} 
            onChange={e=>setEmail(e.target.value)}
            className="w-full border p-3.5 rounded-2xl" 
            type="email" 
            required 
          />
          <input 
            placeholder="Password" 
            value={password} 
            onChange={e=>setPassword(e.target.value)}
            className="w-full border p-3.5 rounded-2xl" 
            type="password" 
            required 
          />
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
          <button 
            type="submit"
            disabled={loading || !agreedToTerms}
            className="w-full py-3.5 bg-[#083a9b] text-white rounded-3xl font-semibold mt-2 disabled:opacity-70"
          >
            {loading ? 'Creating...' : 'Create Customer Account'}
          </button>
          {message && <div className="text-xs text-center text-red-600">{message}</div>}
        </form>
        <p className="text-center mt-4 text-sm text-gray-500">
          Already have an account? <Link to="/login" className="text-[#083a9b]">Log in</Link>
        </p>
      </div>
    </div>
  );
}