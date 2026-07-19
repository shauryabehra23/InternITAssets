"use client";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  // Login page renders standalone
  if (pathname === "/login") return <>{children}</>;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="spinner" /> <span style={{ marginLeft: 10 }}>Loading…</span>
      </div>
    );
  }
  if (!user) return null; // Auth context will redirect

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main">
        <Header />
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
