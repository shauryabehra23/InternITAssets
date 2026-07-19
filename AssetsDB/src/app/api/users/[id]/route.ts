import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "../../../../lib/prisma";
import { requireUser, requireAdmin } from "../../../../lib/auth";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCRYPT_ROUNDS = 10;

function validateUserBody(body: Record<string, unknown>) {
  if (body.email && !EMAIL_REGEX.test(body.email as string)) {
    return "Invalid email format";
  }
  if (body.password && (body.password as string).length < 8) {
    return "Password must be at least 8 characters";
  }
  if (body.role && !["admin", "staff"].includes(body.role as string)) {
    return "role must be 'admin' or 'staff'";
  }
  return null;
}

// GET /api/users/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireUser();
  if (response) return response;

  const { id } = await params;
  const userId = parseInt(id, 10);
  if (isNaN(userId)) {
    return Response.json({ error: "Invalid user ID", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const user = await prisma.appUser.findUnique({
    where: { userId },
    select: {
      userId: true,
      fullName: true,
      email: true,
      role: true,
      department: true,
      isPerson: true,
      assignments: {
        where: { returnedOn: null },
        include: {
          asset: {
            select: {
              assetId: true,
              description: true,
              assetNumber: true,
              assetClassCode: true,
              locationId: true,
            },
          },
        },
        orderBy: { assignedOn: "desc" },
      },
    },
  });

  if (!user) {
    return Response.json({ error: "User not found", code: "NOT_FOUND" }, { status: 404 });
  }

  return Response.json(user);
}

// PUT /api/users/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user: currentUser, response } = await requireUser();
  if (response) return response;

  const { id } = await params;
  const userId = parseInt(id, 10);
  if (isNaN(userId)) {
    return Response.json({ error: "Invalid user ID", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  // Never let users escalate their own role
  if (body.role === "admin" && currentUser!.role !== "admin") {
    return Response.json({ error: "Only admins can assign admin role", code: "FORBIDDEN" }, { status: 403 });
  }

  const validationError = validateUserBody(body);
  if (validationError) {
    return Response.json({ error: validationError, code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const existing = await prisma.appUser.findUnique({ where: { userId } });
  if (!existing) {
    return Response.json({ error: "User not found", code: "NOT_FOUND" }, { status: 404 });
  }

  // Strip server-managed fields
  const { userId: _id, ...rest } = body;
  void _id;

  // Hash password if being updated
  if (rest.password) {
    rest.password = await bcrypt.hash(rest.password as string, BCRYPT_ROUNDS);
  }

  try {
    const updated = await prisma.appUser.update({
      where: { userId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: rest as any,
      select: {
        userId: true,
        fullName: true,
        email: true,
        role: true,
        department: true,
        isPerson: true,
      },
    });

    return Response.json(updated);
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2002") {
      return Response.json({ error: "Email already in use", code: "VALIDATION_ERROR" }, { status: 409 });
    }
    throw err;
  }
}

// DELETE /api/users/:id — admin only
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  const userId = parseInt(id, 10);
  if (isNaN(userId)) {
    return Response.json({ error: "Invalid user ID", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const existing = await prisma.appUser.findUnique({ where: { userId } });
  if (!existing) {
    return Response.json({ error: "User not found", code: "NOT_FOUND" }, { status: 404 });
  }

  await prisma.appUser.delete({ where: { userId } });

  return Response.json({ message: "User deleted" });
}
