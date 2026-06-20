import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="text-center py-20">
      <div className="text-8xl mb-6">404</div>
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <p className="mt-2 text-gray-600">The page you're looking for doesn't exist or has been moved.</p>
      <Link to="/" className="inline-block mt-8 px-8 py-3 bg-[#083a9b] text-white rounded-3xl">Go back home</Link>
    </div>
  );
}