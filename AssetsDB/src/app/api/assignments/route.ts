import { NextRequest } from "next/server";
import prisma from "../../../lib/prisma";
import { requireUser } from "../../../lib/auth";
import { parsePagination, paginatedResponse } from "../../../lib/pagination";

// GET /api/assignments
export async function GET(request: NextRequest) {
  const { response } = await requireUser();
  if (response) return response;

  const sp = request.nextUrl.searchParams;
  const { page, limit, skip, take } = parsePagination(sp);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (sp.has("assetId")) where.assetId = parseInt(sp.get("assetId")!, 10);
  if (sp.has("userId")) where.userId = parseInt(sp.get("userId")!, 10);
  if (sp.get("active") === "true") where.returnedOn = null;

  const [total, assignments] = await Promise.all([
    prisma.assetAssignment.count({ where }),
    prisma.assetAssignment.findMany({
      where,
      skip,
      take,
      orderBy: { assignedOn: "desc" },
      include: {
        asset: { select: { assetId: true, description: true, assetNumber: true } },
        user: { select: { userId: true, fullName: true, email: true } },
        creator: { select: { userId: true, fullName: true } },
      },
    }),
  ]);

  return Response.json(paginatedResponse(assignments, total, page, limit));
}

// POST /api/assignments — assign asset to user
export async function POST(request: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;

  let body: { assetId?: number; userId?: number; notes?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { assetId, userId, notes } = body;

  // 1. Auth check already done by requireUser
  if (!assetId || !userId) {
    return Response.json(
      { error: "assetId and userId are required", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  // 2. Look up asset
  const asset = await prisma.asset.findFirst({ where: { assetId, deletedAt: null } });
  if (!asset) {
    return Response.json({ error: "Asset not found", code: "NOT_FOUND" }, { status: 404 });
  }

  // 3. Double-assignment check
  const existingAssignment = await prisma.assetAssignment.findFirst({
    where: { assetId, returnedOn: null },
    include: { user: { select: { fullName: true } } },
  });
  if (existingAssignment) {
    return Response.json(
      {
        error: `Asset is currently assigned to ${existingAssignment.user.fullName}, return it first`,
        code: "ALREADY_ASSIGNED",
      },
      { status: 409 }
    );
  }

  // 4. Look up target user
  const targetUser = await prisma.appUser.findUnique({ where: { userId } });
  if (!targetUser) {
    return Response.json({ error: "User not found", code: "NOT_FOUND" }, { status: 404 });
  }

  // 5. Create assignment — all server-side fields
  const assignment = await prisma.assetAssignment.create({
    data: {
      assetId,
      userId,
      assignedOn: new Date(),
      createdBy: user!.id,
      remarks: notes ?? null,
    },
    include: {
      asset: true,
      user: { select: { userId: true, fullName: true, email: true } },
    },
  });

  return Response.json(assignment, { status: 201 });
}
