"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { AssetForm } from "@/components/AssetForm";

export default function EditAssetPage() {
  const { id } = useParams<{ id: string }>();
  const [asset, setAsset] = useState<any | null>(null);
  useEffect(() => { api<any>(`/api/assets/${id}`).then(setAsset); }, [id]);
  if (!asset) return <div className="loading-row"><span className="spinner" /> Loading…</div>;
  const initial = {
    companyCode: asset.company?.companyCode || "",
    assetNumber: asset.assetNumber || "",
    description: asset.description || "",
    serialNumber: asset.serialNumber || "",
    assetClassCode: asset.assetClass?.assetClassCode || "",
    locationId: asset.location?.locationId || "",
    vendorCode: asset.vendor?.vendorCode || "",
    apcValue: asset.apcValue ?? "",
    bookValue: asset.bookValue ?? "",
    quantity: asset.quantity ?? 1,
    capitalizedOn: asset.capitalizedOn || "",
    acquisitionYear: asset.acquisitionYear ?? "",
    warrantyExpiresOn: asset.warrantyExpiresOn || "",
    remarks: asset.remarks || "",
    otherRemarks: asset.otherRemarks || "",
  };
  return (<><h1>Edit Asset</h1><AssetForm mode="edit" assetId={id} initial={initial} /></>);
}
