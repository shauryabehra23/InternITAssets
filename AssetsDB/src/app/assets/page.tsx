"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, fmtINR } from "@/lib/api";
import { DataTable } from "@/components/DataTable";
import { Pagination } from "@/components/Pagination";
import { FormField } from "@/components/FormField";
import { Modal } from "@/components/Modal";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast";

export default function AssetsList() {
  const router = useRouter();
  const { user } = useAuth();
  const { push } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [locationId, setLocationId] = useState("");
  const [assetClassCode, setAssetClassCode] = useState("");
  const [unassigned, setUnassigned] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [delTarget, setDelTarget] = useState<any | null>(null);

  useEffect(() => {
    api<{ data: any[] }>("/api/companies").then((r) => setCompanies(r.data || [])).catch(() => {});
    api<{ data: any[] }>("/api/asset-classes").then((r) => setClasses(r.data || [])).catch(() => {});
  }, []);
  useEffect(() => {
    const q = companyCode ? `?companyCode=${companyCode}` : "";
    api<{ data: any[] }>(`/api/locations${q}`).then((r) => setLocations(r.data || [])).catch(() => {});
  }, [companyCode]);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (companyCode) params.set("companyCode", companyCode);
    if (locationId) params.set("locationId", locationId);
    if (assetClassCode) params.set("assetClassCode", assetClassCode);
    if (unassigned) params.set("unassigned", "true");
    params.set("page", String(page));
    params.set("limit", String(limit));
    try {
      const r = await api<{ data: any[]; total: number }>(`/api/assets?${params}`);
      setRows(r.data || []); setTotal(r.total);
    } catch (e: any) { push("error", e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page]);
  useEffect(() => { setPage(1); load(); /* eslint-disable-next-line */ }, [search, companyCode, locationId, assetClassCode, unassigned]);

  const del = async () => {
    if (!delTarget) return;
    try {
      await api(`/api/assets/${delTarget.assetId}`, { method: "DELETE" });
      push("success", "Asset deleted");
      setDelTarget(null);
      load();
    } catch (e: any) {
      push("error", e.status === 409 ? "Cannot delete an assigned asset" : e.message);
      setDelTarget(null);
    }
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1>Assets</h1>
        <Link href="/assets/new" className="btn btn-primary">+ Add Asset</Link>
      </div>

      <div className="card">
        <div className="filter-bar">
          <FormField label="Search"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Asset #, description, serial…" /></FormField>
          <FormField label="Company">
            <select value={companyCode} onChange={(e) => { setCompanyCode(e.target.value); setLocationId(""); }}>
              <option value="">All</option>
              {companies.map((c) => <option key={c.companyCode} value={c.companyCode}>{c.companyName}</option>)}
            </select>
          </FormField>
          <FormField label="Location">
            <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              <option value="">All</option>
              {locations.map((l) => <option key={l.locationId} value={l.locationId}>{l.locationName}</option>)}
            </select>
          </FormField>
          <FormField label="Class">
            <select value={assetClassCode} onChange={(e) => setAssetClassCode(e.target.value)}>
              <option value="">All</option>
              {classes.map((c) => <option key={c.assetClassCode} value={c.assetClassCode}>{c.description}</option>)}
            </select>
          </FormField>
          <label className="check"><input type="checkbox" checked={unassigned} onChange={(e) => setUnassigned(e.target.checked)} /> Unassigned only</label>
        </div>

        {loading ? <div className="loading-row"><span className="spinner" /> Loading…</div> : (
          <>
            <DataTable
              rowKey={(r) => r.assetId}
              rows={rows}
              empty="No assets found"
              columns={[
                { key: "assetNumber", label: "Asset #", sortable: true, render: (r) => <Link href={`/assets/${r.assetId}`} style={{ fontWeight: 600, color: "var(--purple)" }}>{r.assetNumber}</Link> },
                { key: "description", label: "Description", sortable: true },
                { key: "company", label: "Company", accessor: (r) => r.company?.companyName, sortable: true },
                { key: "location", label: "Location", accessor: (r) => r.location?.locationName },
                { key: "assetClass", label: "Class", accessor: (r) => r.assetClass?.description },
                { key: "bookValue", label: "Book Value", accessor: (r) => parseFloat(r.bookValue || "0"), sortable: true, render: (r) => fmtINR(r.bookValue) },
                { key: "actions", label: "Actions", render: (r) => (
                  <div className="actions">
                    <Link href={`/assets/${r.assetId}`} className="btn btn-sm">View</Link>
                    <Link href={`/assets/${r.assetId}/edit`} className="btn btn-sm">Edit</Link>
                    {user?.role === "admin" && <button className="btn btn-sm btn-danger" onClick={() => setDelTarget(r)}>Delete</button>}
                  </div>
                )},
              ]}
            />
            <Pagination page={page} limit={limit} total={total} onChange={setPage} />
          </>
        )}
      </div>

      <Modal open={!!delTarget} onClose={() => setDelTarget(null)} title="Delete asset?">
        <p>Delete <strong>{delTarget?.assetNumber}</strong>? This cannot be undone.</p>
        <div className="form-actions">
          <button className="btn" onClick={() => setDelTarget(null)}>Cancel</button>
          <button className="btn btn-danger" onClick={del}>Delete</button>
        </div>
      </Modal>
    </>
  );
}
