import prisma from "./prisma";
import { getSession } from "./session";

/**
 * Looks up the authenticated user by reading the session cookie directly.
 * Works in Node.js runtime (route handlers), not Edge.
 */
export async function getUser() {
  const session = await getSession();
  if (!session.userId) return null;

  const user = await prisma.appUser.findUnique({
    where: { userId: session.userId },
    select: { userId: true, fullName: true, role: true, email: true },
  });

  if (!user) return null;
  return { id: user.userId, name: user.fullName, role: user.role, email: user.email ?? undefined };
}

/**
 * Asserts the user is authenticated, returns a 401 Response if not.
 */
export async function requireUser() {
  const user = await getUser();
  if (!user) {
    return {
      user: null,
      response: Response.json(
        { error: "Not authenticated", code: "NOT_AUTHENTICATED" },
        { status: 401 }
      ),
    };
  }
  return { user, response: null };
}

/**
 * Asserts the user has admin role, returns a 403 Response if not.
 */
export async function requireAdmin() {
  const { user, response } = await requireUser();
  if (response) return { user: null, response };
  if (user!.role !== "admin") {
    return {
      user: null,
      response: Response.json(
        { error: "Admin access required", code: "FORBIDDEN" },
        { status: 403 }
      ),
    };
  }
  return { user, response };
}
