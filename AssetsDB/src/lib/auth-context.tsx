"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "./api";

type User = { id: string; name: string; email: string; role: "admin" | "staff" };
type Ctx = { user: User | null; loading: boolean; refresh: () => Promise<void>; logout: () => Promise<void> };

const AuthCtx = createContext<Ctx>({ user: null, loading: true, refresh: async () => {}, logout: async () => {} });
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refresh = async () => {
    try {
      const res = await api<{ user: User }>("/api/auth/me");
      setUser(res.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try { await api("/api/auth/logout", { method: "POST" }); } catch {}
    setUser(null);
    router.push("/login");
  };

  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    if (loading) return;
    if (!user && pathname !== "/login") router.replace("/login");
    if (user && pathname === "/login") router.replace("/");
  }, [user, loading, pathname]);

  return <AuthCtx.Provider value={{ user, loading, refresh, logout }}>{children}</AuthCtx.Provider>;
}
