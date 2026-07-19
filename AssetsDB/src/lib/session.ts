import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId?: number;
}

const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET ?? "fallback-secret-change-in-production-32ch",
  cookieName: "session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  },
};

/**
 * Use in Route Handlers (not middleware) — reads from Next.js cookie store.
 */
export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
