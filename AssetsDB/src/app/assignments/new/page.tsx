"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { FormField } from "@/components/FormField";
import { useToast } from "@/lib/toast";

export default function NewAssignment() {
  const router = useRouter();
  const { push } = useToast();
  const [assets, setAssets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [assetId, setAssetId] = useState("");
  const [userId, setUserId] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    api<{ data: any[] }>("/api/assets?unassigned=true&limit=200").then((r) => setAssets(r.data || []));
    api<{ data: any[] }>("/api/users").then((r) => setUsers(r.data || []));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const eobj: any = {};
    if (!assetId) eobj.assetId = "Required";
    if (!userId) eobj.userId = "Required";
    setErrors(eobj);
    if (Object.keys(eobj).length) return;
    setBusy(true);
    try {
      await api("/api/assignments", { method: "POST", body: JSON.stringify({ assetId, userId, notes: notes || undefined }) });
      push("success", "Assignment created");
      router.push("/assignments");
    } catch (e: any) {
      if (e.status === 409) push("error", "Asset is currently assigned, return it first");
      else push("error", e.message);
    } finally { setBusy(false); }
  };

  return (
    <>
      <h1>Assign Asset</h1>
      <form onSubmit={submit} className="card">
        <FormField label="Asset" required error={errors.assetId}>
          <select value={assetId} onChange={(e) => setAssetId(e.target.value)}>
            <option value="">Select available asset</option>
            {assets.map((a) => <option key={a.assetId} value={a.assetId}>{a.assetNumber} — {a.description}</option>)}
          </select>
        </FormField>
        <FormField label="User" required error={errors.userId}>
          <select value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">Select user</option>
            {users.map((u) => <option key={u.userId} value={u.userId}>{u.fullName} ({u.email})</option>)}
          </select>
        </FormField>
        <FormField label="Notes"><textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></FormField>
        <div className="form-actions">
          <button type="button" className="btn" onClick={() => router.back()}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Assigning…" : "Assign"}</button>
        </div>
      </form>
    </>
  );
}
