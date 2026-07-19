"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, fmtDate } from "@/lib/api";
import { DataTable } from "./DataTable";
import { Modal } from "./Modal";
import { FormField } from "./FormField";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast";

export function UserProfileView({ userId, isSelf }: { userId: string; isSelf: boolean }) {
  const { user: me, refresh } = useAuth();
  const { push } = useToast();
  const [u, setU] = useState<any | null>(null);
  const [edit, setEdit] = useState<any | null>(null);
  const [returning, setReturning] = useState<any | null>(null);

  const load = () => api<any>(`/api/users/${userId}`).then(setU).catch((e) => push("error", e.message));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [userId]);

  if (!u) return <div className="loading-row"><span className="spinner" /> Loading…</div>;

  const canEdit = me?.role === "admin" || isSelf;
  const active = (u.assignments || []).filter((a: any) => !a.returnedOn);
  const all = u.assignments || [];

  const saveEdit = async () => {
    try {
      const body: any = { fullName: edit.fullName, email: edit.email, department: edit.department };
      if (me?.role === "admin" && !isSelf) body.role = edit.role;
      await api(`/api/users/${userId}`, { method: "PUT", body: JSON.stringify(body) });
      push("success", "Profile updated");
      setEdit(null); load();
      if (isSelf) refresh();
    } catch (e: any) { push("error", e.message); }
  };
  const doReturn = async () => {
    if (!returning) return;
    try {
      await api(`/api/assignments/${returning.assignmentId}/return`, { method: "PATCH" });
      push("success", "Returned"); setReturning(null); load();
    } catch (e: any) { push("error", e.message); setReturning(null); }
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <h1>{u.fullName}</h1>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
            <span className={`badge badge-role-${u.role}`}>{u.role}</span>
            <span style={{ color: "var(--text-muted)" }}>{u.email}</span>
            {u.department && <span style={{ color: "var(--text-muted)" }}>· {u.department}</span>}
          </div>
        </div>
        {canEdit && <button className="btn" onClick={() => setEdit({ ...u })}>Edit</button>}
      </div>

      <div className="grid grid-2" style={{ marginBottom: 20 }}>
        <div className="stat stat-accent"><div className="stat-label">Currently Assigned</div><div className="stat-value">{active.length}</div></div>
        <div className="stat stat-accent"><div className="stat-label">Total Assignments</div><div className="stat-value">{all.length}</div></div>
      </div>

      <div className="card">
        <h2>Assignments</h2>
        <DataTable
          rowKey={(r) => r.assignmentId}
          rows={all}
          empty="No assignments"
          columns={[
            { key: "assetNumber", label: "Asset #", render: (r) => <Link href={`/assets/${r.assetId}`} style={{ color: "var(--purple)", fontWeight: 600 }}>{r.asset?.assetNumber}</Link> },
            { key: "desc", label: "Description", accessor: (r) => r.asset?.description },
            { key: "assignedOn", label: "Assigned On", render: (r) => fmtDate(r.assignedOn), sortable: true },
            { key: "returnedOn", label: "Returned On", render: (r) => fmtDate(r.returnedOn) },
            { key: "status", label: "Status", render: (r) => r.returnedOn ? <span className="badge badge-returned">Returned</span> : <span className="badge badge-active">Active</span> },
            { key: "remarks", label: "Remarks", render: (r) => r.remarks || "—" },
            { key: "actions", label: "Actions", render: (r) => !r.returnedOn && <button className="btn btn-sm" onClick={() => setReturning(r)}>Return</button> },
          ]}
        />
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title="Edit profile">
        {edit && (<>
          <FormField label="Full Name" required><input value={edit.fullName || ""} onChange={(e) => setEdit({ ...edit, fullName: e.target.value })} /></FormField>
          <FormField label="Email" required><input type="email" value={edit.email || ""} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></FormField>
          <FormField label="Department"><input value={edit.department || ""} onChange={(e) => setEdit({ ...edit, department: e.target.value })} /></FormField>
          {me?.role === "admin" && !isSelf && (
            <FormField label="Role">
              <select value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value })}>
                <option value="staff">staff</option>
                <option value="admin">admin</option>
              </select>
            </FormField>
          )}
          <div className="form-actions">
            <button className="btn" onClick={() => setEdit(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveEdit}>Save</button>
          </div>
        </>)}
      </Modal>

      <Modal open={!!returning} onClose={() => setReturning(null)} title="Return asset?">
        <p>Mark <strong>{returning?.asset?.assetNumber}</strong> as returned?</p>
        <div className="form-actions">
          <button className="btn" onClick={() => setReturning(null)}>Cancel</button>
          <button className="btn btn-dark" onClick={doReturn}>Confirm</button>
        </div>
      </Modal>
    </>
  );
}
