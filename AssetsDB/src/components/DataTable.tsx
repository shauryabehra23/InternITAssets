"use client";
import { ReactNode, useMemo, useState } from "react";

export type Column<T> = {
  key: string;
  label: string;
  sortable?: boolean;
  accessor?: (row: T) => any;
  render?: (row: T) => ReactNode;
  width?: string;
};

export function DataTable<T extends { [k: string]: any }>({ columns, rows, empty = "No results", rowKey }: {
  columns: Column<T>[]; rows: T[]; empty?: string; rowKey: (r: T) => string | number;
}) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const get = col.accessor || ((r: T) => r[sort.key]);
    return [...rows].sort((a, b) => {
      const va = get(a); const vb = get(b);
      if (va == null) return 1; if (vb == null) return -1;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * sort.dir;
      return String(va).localeCompare(String(vb)) * sort.dir;
    });
  }, [rows, sort, columns]);

  const toggle = (key: string, sortable?: boolean) => {
    if (!sortable) return;
    setSort((s) => (s?.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 }));
  };

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{ width: c.width }} onClick={() => toggle(c.key, c.sortable)}>
                {c.label}{sort?.key === c.key ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr><td colSpan={columns.length} className="empty">{empty}</td></tr>
          ) : (
            sorted.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((c) => (
                  <td key={c.key}>{c.render ? c.render(row) : (c.accessor ? c.accessor(row) : row[c.key]) ?? "—"}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
