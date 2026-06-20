import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function VendorSignUp({ onLogin }) {
  const [businessName, setBusinessName] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!agreedToTerms) {
      setMessage('You must agree to the Terms, Agreements, Privacy Policy and FAQ to apply.');
      return;
    }
    if (!businessName || !email || !password) {
      setMessage('Please provide business name, email and password.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      const { data: vendorRow, error: vendorError } = await supabase.from('vendors').insert({
        name: businessName,
        category: cuisine || 'Local vendor',
        bio: cuisine || 'Local vendor application',
        email: email.trim().toLowerCase(),
        status: 'pending',
        logo: 'https://i.pravatar.cc/48?img=60',
        joined: new Date().toISOString().split('T')[0],
      }).select().single();
      if (vendorError) throw vendorError;

      const { data: userRow, error: userError } = await supabase.from('users').upsert({
        name: businessName,
        email: email.trim().toLowerCase(),
        role: 'vendor',
        vendor_id: vendorRow.id,
      }, { onConflict: 'email' }).select().single();
      if (userError) throw userError;

      const profile = userRow || { name: businessName, email, role: 'vendor', vendor_id: vendorRow.id };
      if (onLogin) onLogin(profile);
      setMessage('Application submitted! Admin will approve your vendor status shortly. You can sign in as customer/guest in the meantime.');
    } catch (e) {
      setMessage(e.message || 'Application failed. Use the form at /login or contact support.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Vendor Sign Up</h1>
      <div className="bg-white border rounded-3xl p-8">
        <form onSubmit={handleSignUp} className="space-y-4">
          <input 
            placeholder="Business / Farm name" 
            value={businessName} 
            onChange={e=>setBusinessName(e.target.value)}
            className="w-full border p-3.5 rounded-2xl" 
            required 
          />
          <input 
            placeholder="Cuisine / Product type (e.g. Mexican, Honey, Produce)" 
            value={cuisine} 
            onChange={e=>setCuisine(e.target.value)}
            className="w-full border p-3.5 rounded-2xl" 
          />
          <input 
            placeholder="Contact email" 
            value={email} 
            onChange={e=>setEmail(e.target.value)}
            className="w-full border p-3.5 rounded-2xl" 
            type="email" 
            required 
          />
          <input 
            placeholder="Password (min 6 chars)" 
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
            {loading ? 'Submitting...' : 'Submit Vendor Application'}
          </button>
          {message && <div className="text-xs text-center text-emerald-700">{message}</div>}
        </form>
        <p className="text-center mt-4 text-sm text-gray-500">
          Already have an account? <Link to="/login" className="text-[#083a9b]">Log in</Link>
        </p>
        <p className="text-center text-xs text-gray-500 mt-3">Applications are reviewed by admins. You will be notified when approved.</p>
      </div>
    </div>
  );
}