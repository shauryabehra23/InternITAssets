import { NextRequest } from "next/server";
import prisma from "../../../../../lib/prisma";
import { requireUser } from "../../../../../lib/auth";

// GET /api/assets/:id/assignment-history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireUser();
  if (response) return response;

  const { id } = await params;
  const assetId = parseInt(id, 10);
  if (isNaN(assetId)) {
    return Response.json({ error: "Invalid asset ID", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const asset = await prisma.asset.findFirst({ where: { assetId } });
  if (!asset) {
    return Response.json({ error: "Asset not found", code: "NOT_FOUND" }, { status: 404 });
  }

  const history = await prisma.assetAssignment.findMany({
    where: { assetId },
    orderBy: { assignedOn: "desc" },
    include: {
      user: {
        select: { userId: true, fullName: true, email: true, department: true },
      },
      creator: {
        select: { userId: true, fullName: true },
      },
    },
  });

  return Response.json({ data: history });
}
