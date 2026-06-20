import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';

/**
 * Click-to-open nav dropdown that stays open until you pick an item or click outside.
 * Fixes hover menus that vanish when moving the cursor to the panel.
 */
export default function NavDropdown({ label, items, className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const onEscape = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`hover:text-[#083a9b] flex items-center gap-1 ${open ? 'text-[#083a9b]' : ''}`}
      >
        {label}
        <span className={`text-[10px] transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full pt-2 z-[60] min-w-[11rem]">
          <div className="bg-white border border-[#e8e4d9] rounded-2xl shadow-xl p-1.5 text-sm">
            {items.map((item) =>
              item.to ? (
                <Link
                  key={item.to + item.label}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2 hover:bg-[#f8f7f4] rounded-xl hover:text-[#083a9b] whitespace-nowrap"
                >
                  {item.label}
                </Link>
              ) : (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    item.onClick?.();
                    setOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 hover:bg-[#f8f7f4] rounded-xl"
                >
                  {item.label}
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}