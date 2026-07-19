import { NextRequest } from "next/server";
import prisma from "../../../../../lib/prisma";
import { requireUser } from "../../../../../lib/auth";

// GET /api/assets/:id/audit-log
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

  const logs = await prisma.auditLog.findMany({
    where: { tableName: "asset", recordId: assetId },
    orderBy: { changedAt: "desc" },
    include: {
      changer: { select: { userId: true, fullName: true } },
    },
  });

  const result = logs.map((log) => ({
    id: log.id,
    tableName: log.tableName,
    recordId: log.recordId,
    action: log.action,
    changedAt: log.changedAt,
    changes: log.changes,
    changedBy: {
      id: log.changer.userId,
      name: log.changer.fullName,
    },
  }));

  return Response.json({ data: result });
}
