"use client";
import { createContext, useCallback, useContext, useState, ReactNode } from "react";

type Toast = { id: number; kind: "success" | "error"; message: string };
const Ctx = createContext<{ push: (kind: Toast["kind"], message: string) => void }>({ push: () => {} });
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((kind: Toast["kind"], message: string) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, kind, message }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 3000);
  }, []);
  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="toast-wrap">
        {items.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>{t.message}</div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
