"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const items = [
  { href: "/", label: "Dashboard" },
  { href: "/assets", label: "Assets" },
  { href: "/assignments", label: "Assignments" },
  { href: "/users", label: "Users", admin: true },
  { href: "/profile", label: "My Profile" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-dot" />
        <span>IT Assets</span>
      </div>
      {items
        .filter((i) => !i.admin || user?.role === "admin")
        .map((i) => (
          <Link key={i.href} href={i.href} className={isActive(i.href) ? "active" : ""}>
            {i.label}
          </Link>
        ))}
      <div className="sidebar-footer">v1.0 · Internal</div>
    </aside>
  );
}
