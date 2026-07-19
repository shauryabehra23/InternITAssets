"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { DataTable } from "@/components/DataTable";
import { Pagination } from "@/components/Pagination";
import { Modal } from "@/components/Modal";
import { FormField } from "@/components/FormField";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast";

export default function UsersList() {
  const { user } = useAuth();
  const { push } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<any | null>(null);
  const [del, setDel] = useState<any | null>(null);
  const limit = 20;

  const load = async () => {
    setLoading(true);
    try {
      const r = await api<{ data: any[]; total: number }>(`/api/users?page=${page}&limit=${limit}`);
      setRows(r.data); setTotal(r.total || r.data.length);
    } catch (e: any) { push("error", e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page]);

  const saveEdit = async () => {
    if (!edit) return;
    try {
      await api(`/api/users/${edit.userId}`, { method: "PUT", body: JSON.stringify({ fullName: edit.fullName, email: edit.email, role: edit.role, department: edit.department }) });
      push("success", "User updated"); setEdit(null); load();
    } catch (e: any) { push("error", e.message); }
  };
  const doDel = async () => {
    if (!del) return;
    try { await api(`/api/users/${del.userId}`, { method: "DELETE" }); push("success", "User deleted"); setDel(null); load(); }
    catch (e: any) { push("error", e.message); setDel(null); }
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1>Users</h1>
        {user?.role === "admin" && <Link href="/users/new" className="btn btn-primary">+ Add User</Link>}
      </div>
      <div className="card">
        {loading ? <div className="loading-row"><span className="spinner" /> Loading…</div> : (
          <>
            <DataTable
              rowKey={(r) => r.userId}
              rows={rows}
              empty="No users"
              columns={[
                { key: "fullName", label: "Name", sortable: true, render: (r) => <Link href={`/users/${r.userId}`} style={{ fontWeight: 600, color: "var(--purple)" }}>{r.fullName}</Link> },
                { key: "email", label: "Email", sortable: true },
                { key: "role", label: "Role", render: (r) => <span className={`badge badge-role-${r.role}`}>{r.role}</span> },
                { key: "department", label: "Department" },
                { key: "actions", label: "Actions", render: (r) => (
                  <div className="actions">
                    <Link href={`/users/${r.userId}`} className="btn btn-sm">View</Link>
                    <button className="btn btn-sm" onClick={() => setEdit({ ...r })}>Edit</button>
                    {user?.role === "admin" && r.userId !== user.id && <button className="btn btn-sm btn-danger" onClick={() => setDel(r)}>Delete</button>}
                  </div>
                ) },
              ]}
            />
            <Pagination page={page} limit={limit} total={total} onChange={setPage} />
          </>
        )}
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title="Edit user">
        {edit && (<>
          <FormField label="Full Name" required><input value={edit.fullName || ""} onChange={(e) => setEdit({ ...edit, fullName: e.target.value })} /></FormField>
          <FormField label="Email" required><input type="email" value={edit.email || ""} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></FormField>
          {user?.role === "admin" && (
            <FormField label="Role">
              <select value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value })}>
                <option value="staff">staff</option>
                <option value="admin">admin</option>
              </select>
            </FormField>
          )}
          <FormField label="Department"><input value={edit.department || ""} onChange={(e) => setEdit({ ...edit, department: e.target.value })} /></FormField>
          <div className="form-actions">
            <button className="btn" onClick={() => setEdit(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveEdit}>Save</button>
          </div>
        </>)}
      </Modal>
      <Modal open={!!del} onClose={() => setDel(null)} title="Delete user?">
        <p>Delete <strong>{del?.fullName}</strong>?</p>
        <div className="form-actions">
          <button className="btn" onClick={() => setDel(null)}>Cancel</button>
          <button className="btn btn-danger" onClick={doDel}>Delete</button>
        </div>
      </Modal>
    </>
  );
}
