import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "../../../../lib/prisma";
import { getSession } from "../../../../lib/session";

// POST /api/auth/login
export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON body", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const { email, password } = body;

  // 1. Validate required fields
  if (!email || !password) {
    return Response.json(
      { error: "Email and password are required", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  // Basic email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return Response.json(
      { error: "Invalid email format", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return Response.json(
      { error: "Password must be at least 8 characters", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  // 2. Look up user by email
  const user = await prisma.appUser.findUnique({
    where: { email },
    select: {
      userId: true,
      fullName: true,
      role: true,
      email: true,
      password: true,
    },
  });

  if (!user || !user.password) {
    return Response.json(
      { error: "Invalid email or password", code: "INVALID_CREDENTIALS" },
      { status: 401 }
    );
  }

  // 3. Compare password
  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return Response.json(
      { error: "Invalid email or password", code: "INVALID_CREDENTIALS" },
      { status: 401 }
    );
  }

  // 4. Create session
  const session = await getSession();
  session.userId = user.userId;
  await session.save();

  // 5. Return user (never return password hash)
  return Response.json({
    user: {
      id: user.userId,
      name: user.fullName,
      role: user.role,
      email: user.email,
    },
  });
}
