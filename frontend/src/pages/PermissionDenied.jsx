import { Link } from 'react-router-dom';

export default function PermissionDenied() {
  return (
    <div className="text-center py-20">
      <div className="text-8xl mb-6">403</div>
      <h1 className="text-3xl font-semibold">Permission Denied</h1>
      <p className="mt-2 text-gray-600">You don't have access to this page with your current role.</p>
      <Link to="/" className="inline-block mt-8 px-8 py-3 bg-[#083a9b] text-white rounded-3xl">Return to Home</Link>
    </div>
  );
}