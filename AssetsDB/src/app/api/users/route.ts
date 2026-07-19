import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "../../../lib/prisma";
import { requireUser } from "../../../lib/auth";
import { parsePagination, paginatedResponse } from "../../../lib/pagination";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCRYPT_ROUNDS = 10;

function validateUserBody(body: Record<string, unknown>, requirePassword = false) {
  if (body.email && !EMAIL_REGEX.test(body.email as string)) {
    return "Invalid email format";
  }
  if (requirePassword && !body.password) {
    return "password is required";
  }
  if (body.password && (body.password as string).length < 8) {
    return "Password must be at least 8 characters";
  }
  if (body.role && !["admin", "staff"].includes(body.role as string)) {
    return "role must be 'admin' or 'staff'";
  }
  return null;
}

// GET /api/users
export async function GET(request: NextRequest) {
  const { response } = await requireUser();
  if (response) return response;

  const sp = request.nextUrl.searchParams;
  const { page, limit, skip, take } = parsePagination(sp);

  const [total, users] = await Promise.all([
    prisma.appUser.count(),
    prisma.appUser.findMany({
      skip,
      take,
      orderBy: { userId: "asc" },
      select: {
        userId: true,
        fullName: true,
        email: true,
        role: true,
        department: true,
        isPerson: true,
      },
    }),
  ]);

  return Response.json(paginatedResponse(users, total, page, limit));
}

// POST /api/users
export async function POST(request: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;

  // Only admins can create users with role "admin"
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const validationError = validateUserBody(body, true);
  if (validationError) {
    return Response.json({ error: validationError, code: "VALIDATION_ERROR" }, { status: 400 });
  }

  // Prevent role escalation — only admin can assign admin role
  if (body.role === "admin" && user!.role !== "admin") {
    return Response.json({ error: "Only admins can create admin users", code: "FORBIDDEN" }, { status: 403 });
  }

  const { password, ...rest } = body;
  const hashedPassword = await bcrypt.hash(password as string, BCRYPT_ROUNDS);

  try {
    const newUser = await prisma.appUser.create({
      data: {
        ...(rest as Parameters<typeof prisma.appUser.create>[0]["data"]),
        password: hashedPassword,
      },
      select: {
        userId: true,
        fullName: true,
        email: true,
        role: true,
        department: true,
        isPerson: true,
      },
    });

    return Response.json(newUser, { status: 201 });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2002") {
      return Response.json({ error: "Email already in use", code: "VALIDATION_ERROR" }, { status: 409 });
    }
    throw err;
  }
}
