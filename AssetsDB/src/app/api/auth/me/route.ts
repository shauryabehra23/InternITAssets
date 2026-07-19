import prisma from "../../../../lib/prisma";
import { getSession } from "../../../../lib/session";

// GET /api/auth/me
export async function GET() {
  const session = await getSession();

  if (!session.userId) {
    return Response.json(
      { error: "Not authenticated", code: "NOT_AUTHENTICATED" },
      { status: 401 }
    );
  }

  const user = await prisma.appUser.findUnique({
    where: { userId: session.userId },
    select: {
      userId: true,
      fullName: true,
      role: true,
      email: true,
    },
  });

  if (!user) {
    return Response.json(
      { error: "User not found", code: "NOT_AUTHENTICATED" },
      { status: 401 }
    );
  }

  return Response.json({
    user: {
      id: user.userId,
      name: user.fullName,
      role: user.role,
      email: user.email,
    },
  });
}
