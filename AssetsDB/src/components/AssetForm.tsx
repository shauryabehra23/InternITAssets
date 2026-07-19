"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { FormField } from "./FormField";
import { useToast } from "@/lib/toast";

export function AssetForm({ initial, mode, assetId }: { initial?: any; mode: "create" | "edit"; assetId?: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [form, setForm] = useState<any>({
    companyCode: "", assetNumber: "", description: "", serialNumber: "",
    assetClassCode: "", locationId: "", vendorCode: "",
    apcValue: "", bookValue: "", quantity: 1,
    capitalizedOn: "", acquisitionYear: "", warrantyExpiresOn: "",
    remarks: "", otherRemarks: "",
    ...(initial || {}),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [companies, setCompanies] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ data: any[] }>("/api/companies").then((r) => setCompanies(r.data || []));
    api<{ data: any[] }>("/api/asset-classes").then((r) => setClasses(r.data || []));
    api<{ data: any[] }>("/api/vendors").then((r) => setVendors(r.data || []));
  }, []);
  useEffect(() => {
    const q = form.companyCode ? `?companyCode=${form.companyCode}` : "";
    api<{ data: any[] }>(`/api/locations${q}`).then((r) => setLocations(r.data || []));
  }, [form.companyCode]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.companyCode) e.companyCode = "Required";
    if (!form.assetNumber) e.assetNumber = "Required";
    if (form.quantity !== "" && Number(form.quantity) <= 0) e.quantity = "Must be > 0";
    for (const k of ["apcValue", "bookValue"]) {
      if (form[k] !== "" && Number(form[k]) < 0) e[k] = "Must be ≥ 0";
    }
    if (form.capitalizedOn && new Date(form.capitalizedOn) > new Date()) e.capitalizedOn = "Cannot be in the future";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setBusy(true);
    const body: any = { ...form };
    // Strip empty strings from optional fields
    for (const k of Object.keys(body)) if (body[k] === "") delete body[k];
    if (body.quantity !== undefined) body.quantity = Number(body.quantity);
    for (const k of ["apcValue", "bookValue"]) if (body[k] !== undefined) body[k] = Number(body[k]);
    if (body.acquisitionYear !== undefined) body.acquisitionYear = Number(body.acquisitionYear);
    try {
      if (mode === "create") {
        const created = await api<any>("/api/assets", { method: "POST", body: JSON.stringify(body) });
        push("success", "Asset created");
        router.push(`/assets/${created.assetId}`);
      } else {
        await api(`/api/assets/${assetId}`, { method: "PUT", body: JSON.stringify(body) });
        push("success", "Asset updated");
        router.push(`/assets/${assetId}`);
      }
    } catch (e: any) {
      push("error", e.message || "Failed to save");
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="card">
      <div className="form-row">
        <FormField label="Company" required error={errors.companyCode}>
          <select value={form.companyCode} onChange={(e) => set("companyCode", e.target.value)}>
            <option value="">Select company</option>
            {companies.map((c) => <option key={c.companyCode} value={c.companyCode}>{c.companyName}</option>)}
          </select>
        </FormField>
        <FormField label="Asset Number" required error={errors.assetNumber}>
          <input value={form.assetNumber} onChange={(e) => set("assetNumber", e.target.value)} />
        </FormField>
      </div>
      <FormField label="Description"><input value={form.description} onChange={(e) => set("description", e.target.value)} /></FormField>
      <div className="form-row">
        <FormField label="Serial Number"><input value={form.serialNumber} onChange={(e) => set("serialNumber", e.target.value)} /></FormField>
        <FormField label="Asset Class">
          <select value={form.assetClassCode} onChange={(e) => set("assetClassCode", e.target.value)}>
            <option value="">—</option>
            {classes.map((c) => <option key={c.assetClassCode} value={c.assetClassCode}>{c.description}</option>)}
          </select>
        </FormField>
      </div>
      <div className="form-row">
        <FormField label="Location">
          <select value={form.locationId} onChange={(e) => set("locationId", e.target.value)}>
            <option value="">—</option>
            {locations.map((l) => <option key={l.locationId} value={l.locationId}>{l.locationName}</option>)}
          </select>
        </FormField>
        <FormField label="Vendor">
          <select value={form.vendorCode} onChange={(e) => set("vendorCode", e.target.value)}>
            <option value="">—</option>
            {vendors.map((v) => <option key={v.vendorCode} value={v.vendorCode}>{v.vendorName}</option>)}
          </select>
        </FormField>
      </div>
      <div className="form-row">
        <FormField label="APC Value" error={errors.apcValue}><input type="number" step="0.01" value={form.apcValue} onChange={(e) => set("apcValue", e.target.value)} /></FormField>
        <FormField label="Book Value" error={errors.bookValue}><input type="number" step="0.01" value={form.bookValue} onChange={(e) => set("bookValue", e.target.value)} /></FormField>
      </div>
      <div className="form-row">
        <FormField label="Quantity" error={errors.quantity}><input type="number" min={1} value={form.quantity} onChange={(e) => set("quantity", e.target.value)} /></FormField>
        <FormField label="Acquisition Year"><input type="number" value={form.acquisitionYear} onChange={(e) => set("acquisitionYear", e.target.value)} /></FormField>
      </div>
      <div className="form-row">
        <FormField label="Capitalized On" error={errors.capitalizedOn}><input type="date" value={form.capitalizedOn?.substring(0,10) || ""} onChange={(e) => set("capitalizedOn", e.target.value)} /></FormField>
        <FormField label="Warranty Expires On"><input type="date" value={form.warrantyExpiresOn?.substring(0,10) || ""} onChange={(e) => set("warrantyExpiresOn", e.target.value)} /></FormField>
      </div>
      <FormField label="Remarks"><textarea rows={2} value={form.remarks} onChange={(e) => set("remarks", e.target.value)} /></FormField>
      <FormField label="Other Remarks"><textarea rows={2} value={form.otherRemarks} onChange={(e) => set("otherRemarks", e.target.value)} /></FormField>

      <div className="form-actions">
        <button type="button" className="btn" onClick={() => router.back()}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : mode === "create" ? "Create Asset" : "Save Changes"}</button>
      </div>
    </form>
  );
}
