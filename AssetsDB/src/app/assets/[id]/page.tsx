"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api, fmtDate, fmtDateTime, fmtINR } from "@/lib/api";
import { Modal } from "@/components/Modal";
import { FormField } from "@/components/FormField";
import { DataTable } from "@/components/DataTable";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast";

export default function AssetDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { push } = useToast();
  const [asset, setAsset] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [assignUser, setAssignUser] = useState("");
  const [assignNotes, setAssignNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [a, h, au] = await Promise.all([
      api<any>(`/api/assets/${id}`),
      api<{ data: any[] }>(`/api/assignments?assetId=${id}`).then((r) => r.data || []).catch(() => []),
      api<{ data: any[] }>(`/api/assets/${id}/audit-log`).then((r) => r.data || []).catch(() => []),
    ]);
    setAsset(a); setHistory(h); setAudit(au);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);
  useEffect(() => { api<{ data: any[] }>("/api/users").then((r) => setUsers(r.data || [])).catch(() => {}); }, []);

  const activeAssignment = history.find((x) => !x.returnedOn);

  const doAssign = async () => {
    if (!assignUser) return;
    setBusy(true);
    try {
      await api("/api/assignments", { method: "POST", body: JSON.stringify({ assetId: id, userId: assignUser, notes: assignNotes || undefined }) });
      push("success", "Asset assigned");
      setAssignOpen(false); setAssignUser(""); setAssignNotes("");
      load();
    } catch (e: any) {
      push("error", e.status === 409 ? "Asset is already assigned, return it first" : e.message);
    } finally { setBusy(false); }
  };
  const doReturn = async () => {
    if (!activeAssignment) return;
    setBusy(true);
    try {
      await api(`/api/assignments/${activeAssignment.assignmentId}/return`, { method: "PATCH" });
      push("success", "Asset returned");
      setReturnOpen(false); load();
    } catch (e: any) { push("error", e.message); }
    finally { setBusy(false); }
  };
  const doDelete = async () => {
    setBusy(true);
    try {
      await api(`/api/assets/${id}`, { method: "DELETE" });
      push("success", "Asset deleted");
      router.push("/assets");
    } catch (e: any) { push("error", e.status === 409 ? "Cannot delete an assigned asset" : e.message); }
    finally { setBusy(false); setDelOpen(false); }
  };

  if (!asset) return <div className="loading-row"><span className="spinner" /> Loading…</div>;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
        <div>
          <h1>{asset.assetNumber}</h1>
          <div style={{ color: "var(--text-muted)", fontSize: 15 }}>{asset.description || "—"}</div>
          <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
            <span className="badge badge-role-staff">{asset.company?.companyName}</span>
            {asset.currentHolder ? (
              <span>Assigned to <Link href={`/users/${asset.currentHolder.userId}`} style={{ color: "var(--purple)", fontWeight: 600 }}>{asset.currentHolder.fullName}</Link></span>
            ) : <span className="badge badge-warn">Unassigned</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {!asset.currentHolder && <button className="btn btn-primary" onClick={() => setAssignOpen(true)}>Assign Asset</button>}
          {asset.currentHolder && <button className="btn btn-dark" onClick={() => setReturnOpen(true)}>Return Asset</button>}
          <Link href={`/assets/${id}/edit`} className="btn">Edit</Link>
          {user?.role === "admin" && <button className="btn btn-danger" onClick={() => setDelOpen(true)}>Delete</button>}
        </div>
      </div>

      <div className="card">
        <h2>Asset Information</h2>
        <div className="info-grid">
          <Info label="Location" value={asset.location?.locationName} />
          <Info label="Class" value={asset.assetClass?.description} />
          <Info label="Vendor" value={asset.vendor?.vendorName} />
          <Info label="Serial #" value={asset.serialNumber} />
          <Info label="APC Value" value={fmtINR(asset.apcValue)} />
          <Info label="Book Value" value={fmtINR(asset.bookValue)} />
          <Info label="Quantity" value={asset.quantity} />
          <Info label="Capitalized On" value={fmtDate(asset.capitalizedOn)} />
          <Info label="Acquisition Year" value={asset.acquisitionYear} />
          <Info label="Warranty Expires" value={fmtDate(asset.warrantyExpiresOn)} />
          <Info label="Remarks" value={asset.remarks} />
          <Info label="Other Remarks" value={asset.otherRemarks} />
        </div>
      </div>

      <div className="card">
        <h2>Assignment History</h2>
        <DataTable
          rowKey={(r) => r.assignmentId}
          rows={history}
          empty="No assignments yet"
          columns={[
            { key: "user", label: "Assigned To", render: (r) => <Link href={`/users/${r.userId}`} style={{ color: "var(--purple)" }}>{r.user?.fullName}</Link> },
            { key: "assignedOn", label: "Assigned On", render: (r) => fmtDate(r.assignedOn) },
            { key: "returnedOn", label: "Returned On", render: (r) => fmtDate(r.returnedOn) },
            { key: "status", label: "Status", render: (r) => r.returnedOn ? <span className="badge badge-returned">Returned</span> : <span className="badge badge-active">Active</span> },
            { key: "remarks", label: "Remarks", render: (r) => r.remarks || "—" },
          ]}
        />
      </div>

      <div className="card">
        <h2>Audit Log</h2>
        <DataTable
          rowKey={(r) => r.id}
          rows={audit}
          empty="No audit entries"
          columns={[
            { key: "changedAt", label: "Date", render: (r) => fmtDateTime(r.changedAt) },
            { key: "changer", label: "User", render: (r) => r.changer?.fullName || "—" },
            { key: "action", label: "Action", render: (r) => <code>{r.action}</code> },
            { key: "changes", label: "Changes", render: (r) => <code style={{ fontSize: 12 }}>{JSON.stringify(r.changes)}</code> },
          ]}
        />
      </div>

      <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title="Assign asset">
        <FormField label="User" required>
          <select value={assignUser} onChange={(e) => setAssignUser(e.target.value)}>
            <option value="">Select user</option>
            {users.map((u) => <option key={u.userId} value={u.userId}>{u.fullName} ({u.email})</option>)}
          </select>
        </FormField>
        <FormField label="Notes"><textarea rows={2} value={assignNotes} onChange={(e) => setAssignNotes(e.target.value)} /></FormField>
        <div className="form-actions">
          <button className="btn" onClick={() => setAssignOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={doAssign} disabled={busy || !assignUser}>Assign</button>
        </div>
      </Modal>

      <Modal open={returnOpen} onClose={() => setReturnOpen(false)} title="Return asset?">
        <p>Mark <strong>{asset.assetNumber}</strong> as returned from <strong>{asset.currentHolder?.fullName}</strong>?</p>
        <div className="form-actions">
          <button className="btn" onClick={() => setReturnOpen(false)}>Cancel</button>
          <button className="btn btn-dark" onClick={doReturn} disabled={busy}>Confirm Return</button>
        </div>
      </Modal>

      <Modal open={delOpen} onClose={() => setDelOpen(false)} title="Delete asset?">
        <p>Delete <strong>{asset.assetNumber}</strong>? This cannot be undone.</p>
        <div className="form-actions">
          <button className="btn" onClick={() => setDelOpen(false)}>Cancel</button>
          <button className="btn btn-danger" onClick={doDelete} disabled={busy}>Delete</button>
        </div>
      </Modal>
    </>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (<div className="info-item"><div className="label">{label}</div><div className="value">{value ?? "—"}</div></div>);
}
