export default function StarRating({ value = 0, onChange, size = 'md', readOnly = false }) {
  const sizes = { sm: 'text-lg', md: 'text-2xl', lg: 'text-3xl' };
  const stars = [1, 2, 3, 4, 5];

  return (
    <div className={`flex gap-0.5 ${sizes[size] || sizes.md}`} role={readOnly ? 'img' : 'group'} aria-label={`${value} out of 5 stars`}>
      {stars.map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => !readOnly && onChange?.(n)}
          className={`leading-none transition ${readOnly ? 'cursor-default' : 'hover:scale-110'} ${
            n <= value ? 'text-amber-500' : 'text-gray-300'
          }`}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}