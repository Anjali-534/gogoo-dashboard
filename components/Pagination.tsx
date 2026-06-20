"use client";

interface PaginationProps {
  page: number;
  total: number;
  perPage: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, total, perPage, onChange }: PaginationProps) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;

  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  let startP = Math.max(1, page - 2);
  let endP = Math.min(totalPages, page + 2);
  if (endP - startP < 4) {
    if (startP === 1) endP = Math.min(totalPages, 5);
    else startP = Math.max(1, endP - 4);
  }
  const pages: number[] = [];
  for (let i = startP; i <= endP; i++) pages.push(i);

  const btn = (label: React.ReactNode, target: number, disabled = false, active = false) => (
    <button
      key={String(label)}
      onClick={() => !disabled && onChange(target)}
      disabled={disabled}
      className={`min-w-[32px] h-8 px-2 text-sm rounded-lg transition font-medium ${
        active
          ? "bg-orange-500 text-white"
          : disabled
          ? "text-gray-300 cursor-not-allowed"
          : "text-gray-500 hover:bg-gray-100"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
      <p className="text-sm text-gray-400">
        Showing <span className="font-semibold text-gray-700">{start}–{end}</span> of{" "}
        <span className="font-semibold text-gray-700">{total}</span> results
      </p>
      <div className="flex items-center gap-1">
        {btn("←", page - 1, page === 1)}
        {startP > 1 && (
          <>
            {btn(1, 1, false, page === 1)}
            {startP > 2 && <span className="text-gray-300 px-1 text-sm">…</span>}
          </>
        )}
        {pages.map(p => btn(p, p, false, p === page))}
        {endP < totalPages && (
          <>
            {endP < totalPages - 1 && <span className="text-gray-300 px-1 text-sm">…</span>}
            {btn(totalPages, totalPages, false, page === totalPages)}
          </>
        )}
        {btn("→", page + 1, page === totalPages)}
      </div>
    </div>
  );
}
