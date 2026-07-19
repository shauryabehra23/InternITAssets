"use client";
export function Pagination({ page, limit, total, onChange }: { page: number; limit: number; total: number; onChange: (p: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="pagination">
      <span>Page {page} of {totalPages} — {total} results</span>
      <div className="pagination-controls">
        <button className="btn btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>Prev</button>
        <button className="btn btn-sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Next</button>
      </div>
    </div>
  );
}
