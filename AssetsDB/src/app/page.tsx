"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, fmtINR, fmtDateTime } from "@/lib/api";

type Summary = { totalAssets: number; byCompany: any[]; byClass: any[]; unassignedCount: number; totalBookValue: string | number };
type ByLoc = { locationId: string; locationName: string; companyName: string; count: number }[];
type Notif = { warrantyExpiring: any[]; overdueReturns: any[]; unassignedHighValue: any[] };
type Activity = { type: string; [k: string]: any }[];

export default function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [byLoc, setByLoc] = useState<ByLoc>([]);
  const [notif, setNotif] = useState<Notif | null>(null);
  const [activity, setActivity] = useState<Activity>([]);
  const [activeAssignments, setActiveAssignments] = useState<number>(0);

  useEffect(() => {
    (async () => {
      const [s, bl, n, a, ass] = await Promise.all([
        api<Summary>("/api/dashboard/summary").catch(() => null),
        api<{ data: ByLoc }>("/api/dashboard/by-location").catch(() => ({ data: [] })),
        api<Notif>("/api/notifications").catch(() => null),
        api<{ recentAssignments: any[]; recentReturns: any[]; recentAssets: any[] }>("/api/dashboard/recent-activity").catch(() => ({ recentAssignments: [], recentReturns: [], recentAssets: [] })),
        api<{ total: number }>("/api/assignments?active=true&limit=1").catch(() => ({ total: 0 })),
      ]);
      setSummary(s); setByLoc(bl?.data || []); setNotif(n);
        const activities = [
          ...(a?.recentAssignments || []).map((r: any) => ({ type: "assignment" as const, assetId: r.assetId, assetNumber: r.asset?.assetNumber, userName: r.user?.fullName, at: r.assignedOn })),
          ...(a?.recentReturns || []).map((r: any) => ({ type: "return" as const, assetId: r.assetId, assetNumber: r.asset?.assetNumber, userName: r.user?.fullName, at: r.returnedOn })),
          ...(a?.recentAssets || []).map((r: any) => ({ type: "asset_added" as const, assetId: r.assetId, assetNumber: r.assetNumber, userName: r.creator?.fullName, at: r.createdAt })),
        ].sort((x, y) => new Date(y.at || 0).getTime() - new Date(x.at || 0).getTime());
        setActivity(activities);
        setActiveAssignments(ass?.total || 0);
    })();
  }, []);

  const notifCount = (notif?.warrantyExpiring.length || 0) + (notif?.overdueReturns.length || 0) + (notif?.unassignedHighValue.length || 0);

  return (
    <>
      <h1>Overview</h1>
      <p style={{ color: "var(--text-muted)", marginTop: 0 }}>Assets, assignments and alerts at a glance.</p>

      {notifCount > 0 && notif && (
        <div className="notif-banner">
          <div style={{ flex: 1 }}>
            <div className="notif-banner-title">You have {notifCount} attention item{notifCount === 1 ? "" : "s"}</div>
            <ul className="notif-list">
              {notif.warrantyExpiring.length > 0 && <li>{notif.warrantyExpiring.length} asset(s) with warranty expiring soon</li>}
              {notif.overdueReturns.length > 0 && <li>{notif.overdueReturns.length} overdue return(s)</li>}
              {notif.unassignedHighValue.length > 0 && <li>{notif.unassignedHighValue.length} unassigned high-value asset(s)</li>}
            </ul>
          </div>
        </div>
      )}

      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <div className="stat stat-accent"><div className="stat-label">Total Assets</div><div className="stat-value">{summary?.totalAssets ?? "—"}</div></div>
        <div className="stat stat-accent"><div className="stat-label">Unassigned</div><div className="stat-value">{summary?.unassignedCount ?? "—"}</div></div>
        <div className="stat stat-accent"><div className="stat-label">Total Book Value</div><div className="stat-value">{summary ? fmtINR(summary.totalBookValue) : "—"}</div></div>
        <div className="stat stat-accent"><div className="stat-label">Active Assignments</div><div className="stat-value">{activeAssignments}</div></div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-header"><h2>Assets by Company</h2></div>
          <BarList items={(summary?.byCompany || []).map((c) => ({ label: c.companyName, value: c.count }))} />
        </div>
        <div className="card">
          <div className="card-header"><h2>Assets by Class</h2></div>
          <BarList items={(summary?.byClass || []).map((c) => ({ label: c.description, value: c.count }))} />
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-header"><h2>Assets by Location</h2></div>
          {byLoc.length === 0 ? <div className="empty">No location data</div> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Location</th><th>Company</th><th style={{ textAlign: "right" }}>Count</th></tr></thead>
                <tbody>{byLoc.map((l) => (
                  <tr key={l.locationId}><td>{l.locationName}</td><td>{l.companyName}</td><td style={{ textAlign: "right" }}>{l.count}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header"><h2>Recent Activity</h2></div>
          {activity.length === 0 ? <div className="empty">No recent activity</div> : (
            <div className="activity">
              {activity.slice(0, 10).map((a, i) => (
                <div className="activity-item" key={i}>
                  <div className="activity-dot" />
                  <div className="activity-body">
                    <ActivityLine a={a} />
                    {a.at && <div className="activity-time">{fmtDateTime(a.at)}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function BarList({ items }: { items: { label: string; value: number }[] }) {
  if (!items.length) return <div className="empty">No data</div>;
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((i, idx) => (
        <div key={idx}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
            <span>{i.label}</span><strong>{i.value}</strong>
          </div>
          <div style={{ background: "#f1f5f9", height: 8, borderRadius: 4, overflow: "hidden" }}>
            <div style={{ background: "var(--accent)", height: "100%", width: `${(i.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityLine({ a }: { a: any }) {
  if (a.type === "assignment") return <span><strong>{a.userName || "Someone"}</strong> was assigned <Link href={`/assets/${a.assetId}`} style={{ color: "var(--purple)" }}>{a.assetNumber || "an asset"}</Link></span>;
  if (a.type === "return") return <span><Link href={`/assets/${a.assetId}`} style={{ color: "var(--purple)" }}>{a.assetNumber || "An asset"}</Link> was returned by <strong>{a.userName || "someone"}</strong></span>;
  if (a.type === "asset_added") return <span>New asset <Link href={`/assets/${a.assetId}`} style={{ color: "var(--purple)" }}>{a.assetNumber || ""}</Link> added</span>;
  return <span>{a.type}</span>;
}
