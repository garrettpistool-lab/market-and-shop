import { Link } from 'react-router-dom';

export default function SignUp({ onLogin }) {
  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-4xl font-bold tracking-tight text-center">Create your account</h1>
      <div className="mt-8 bg-white border rounded-3xl p-8">
        <div className="space-y-4">
          <Link to="/customer-signup" className="block p-4 border rounded-2xl hover:border-[#083a9b]">I'm a Customer</Link>
          <Link to="/vendor-signup" className="block p-4 border rounded-2xl hover:border-[#083a9b]">I'm a Vendor</Link>
        </div>
        <p className="text-center mt-6 text-sm text-gray-500">
          Already have an account? <Link to="/login" className="text-[#083a9b]">Log in</Link>
        </p>
      </div>
    </div>
  );
}