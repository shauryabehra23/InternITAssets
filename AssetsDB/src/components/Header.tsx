"use client";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const titles: Record<string, string> = {
  "/": "Dashboard",
  "/assets": "Assets",
  "/assets/new": "New Asset",
  "/assignments": "Assignments",
  "/assignments/new": "Assign Asset",
  "/users": "Users",
  "/users/new": "New User",
  "/profile": "My Profile",
};

export function Header() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const title =
    titles[pathname] ||
    (pathname.startsWith("/assets/") ? "Asset Detail" : pathname.startsWith("/users/") ? "User Profile" : "");

  return (
    <div className="header">
      <div className="header-title">{title}</div>
      <div className="header-user">
        <span>{user?.name}</span>
        <span className={`badge badge-role-${user?.role}`}>{user?.role}</span>
        <button className="btn btn-sm" onClick={logout}>Logout</button>
      </div>
    </div>
  );
}
