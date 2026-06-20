import { Link } from 'react-router-dom';

export default function EmptyState({ icon = '🌾', title, message, actionLabel, actionTo }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 px-6 bg-white border border-dashed border-[#e8e4d9] rounded-3xl text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-[#0f172a] mb-2">{title}</h3>
      <p className="text-gray-600 max-w-md text-sm mb-6">{message}</p>
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="px-6 py-2.5 bg-[#083a9b] text-white rounded-3xl text-sm font-medium hover:bg-[#062d7a] transition"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}