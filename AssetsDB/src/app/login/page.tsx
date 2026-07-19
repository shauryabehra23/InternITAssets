"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { FormField } from "@/components/FormField";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { refresh } = useAuth();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      await refresh();
      router.push("/");
    } catch (e: any) {
      setErr(e.message || "Login failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand"><div className="login-brand-dot" /><div className="login-brand-name">IT Assets</div></div>
        <h1 style={{ fontSize: 20, marginBottom: 4 }}>Sign in</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 0, marginBottom: 20, fontSize: 13 }}>Access the asset dashboard</p>
        <FormField label="Email" required><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></FormField>
        <FormField label="Password" required><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></FormField>
        {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}
        <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
