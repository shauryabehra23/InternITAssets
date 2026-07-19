"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { FormField } from "@/components/FormField";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast";

export default function NewUser() {
  const router = useRouter();
  const { user } = useAuth();
  const { push } = useToast();
  const [f, setF] = useState({ fullName: "", email: "", password: "", role: "staff", department: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const eobj: any = {};
    if (!f.fullName) eobj.fullName = "Required";
    if (!f.email) eobj.email = "Required";
    else if (!/^\S+@\S+\.\S+$/.test(f.email)) eobj.email = "Invalid email";
    if (!f.password || f.password.length < 8) eobj.password = "Min 8 characters";
    setErrors(eobj);
    if (Object.keys(eobj).length) return;
    setBusy(true);
    try {
      await api("/api/users", { method: "POST", body: JSON.stringify({ ...f, department: f.department || undefined }) });
      push("success", "User created");
      router.push("/users");
    } catch (e: any) { push("error", e.message); }
    finally { setBusy(false); }
  };

  return (
    <>
      <h1>New User</h1>
      <form onSubmit={submit} className="card">
        <FormField label="Full Name" required error={errors.fullName}><input value={f.fullName} onChange={(e) => set("fullName", e.target.value)} /></FormField>
        <FormField label="Email" required error={errors.email}><input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></FormField>
        <FormField label="Password" required error={errors.password}><input type="password" value={f.password} onChange={(e) => set("password", e.target.value)} /></FormField>
        <div className="form-row">
          {user?.role === "admin" && (
            <FormField label="Role">
              <select value={f.role} onChange={(e) => set("role", e.target.value)}>
                <option value="staff">staff</option>
                <option value="admin">admin</option>
              </select>
            </FormField>
          )}
          <FormField label="Department"><input value={f.department} onChange={(e) => set("department", e.target.value)} /></FormField>
        </div>
        <div className="form-actions">
          <button type="button" className="btn" onClick={() => router.push("/users")}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Creating…" : "Create User"}</button>
        </div>
      </form>
    </>
  );
}
