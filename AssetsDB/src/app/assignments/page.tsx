"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, fmtDate } from "@/lib/api";
import { DataTable } from "@/components/DataTable";
import { Pagination } from "@/components/Pagination";
import { Modal } from "@/components/Modal";
import { useToast } from "@/lib/toast";

export default function AssignmentsList() {
  const { push } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [activeOnly, setActiveOnly] = useState(true);
  const [returnTarget, setReturnTarget] = useState<any | null>(null);
  const limit = 20;
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (activeOnly) p.set("active", "true");
    p.set("page", String(page)); p.set("limit", String(limit));
    try {
      const r = await api<{ data: any[]; total: number }>(`/api/assignments?${p}`);
      setRows(r.data || []); setTotal(r.total || r.data?.length || 0);
    } catch (e: any) { push("error", e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, activeOnly]);
  useEffect(() => { setPage(1); }, [activeOnly]);

  const doReturn = async () => {
    if (!returnTarget) return;
    try {
      await api(`/api/assignments/${returnTarget.assignmentId}/return`, { method: "PATCH" });
      push("success", "Asset returned");
      setReturnTarget(null); load();
    } catch (e: any) { push("error", e.message); setReturnTarget(null); }
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1>Assignments</h1>
        <Link href="/assignments/new" className="btn btn-primary">+ Assign Asset</Link>
      </div>
      <div className="card">
        <div className="filter-bar">
          <label className="check"><input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} /> Active only</label>
        </div>
        {loading ? <div className="loading-row"><span className="spinner" /> Loading…</div> : (
          <>
            <DataTable
              rowKey={(r) => r.assignmentId}
              rows={rows}
              empty="No assignments"
              columns={[
                { key: "asset", label: "Asset #", render: (r) => <Link href={`/assets/${r.assetId}`} style={{ fontWeight: 600, color: "var(--purple)" }}>{r.asset?.assetNumber}</Link> },
                { key: "desc", label: "Description", accessor: (r) => r.asset?.description },
                { key: "user", label: "Assigned To", render: (r) => <Link href={`/users/${r.userId}`} style={{ color: "var(--purple)" }}>{r.user?.fullName}</Link> },
                { key: "assignedOn", label: "Assigned On", render: (r) => fmtDate(r.assignedOn), sortable: true },
                { key: "returnedOn", label: "Returned On", render: (r) => fmtDate(r.returnedOn) },
                { key: "status", label: "Status", render: (r) => r.returnedOn ? <span className="badge badge-returned">Returned</span> : <span className="badge badge-active">Active</span> },
                { key: "actions", label: "Actions", render: (r) => !r.returnedOn && <button className="btn btn-sm" onClick={() => setReturnTarget(r)}>Return</button> },
              ]}
            />
            <Pagination page={page} limit={limit} total={total} onChange={setPage} />
          </>
        )}
      </div>
      <Modal open={!!returnTarget} onClose={() => setReturnTarget(null)} title="Return asset?">
        <p>Mark <strong>{returnTarget?.asset?.assetNumber}</strong> as returned?</p>
        <div className="form-actions">
          <button className="btn" onClick={() => setReturnTarget(null)}>Cancel</button>
          <button className="btn btn-dark" onClick={doReturn}>Confirm</button>
        </div>
      </Modal>
    </>
  );
}
