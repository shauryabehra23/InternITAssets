"use client";
import { ReactNode } from "react";

export function FormField({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label>{label}{required && <span className="req"> *</span>}</label>
      {children}
      {error && <div className="err">{error}</div>}
    </div>
  );
}
