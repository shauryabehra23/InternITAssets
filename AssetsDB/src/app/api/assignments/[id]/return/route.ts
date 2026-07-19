import { NextRequest } from "next/server";
import prisma from "../../../../../lib/prisma";
import { requireUser } from "../../../../../lib/auth";
import { writeAuditLog } from "../../../../../lib/audit";

// PATCH /api/assignments/:id/return
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireUser();
  if (response) return response;

  const { id } = await params;
  const assignmentId = parseInt(id, 10);
  if (isNaN(assignmentId)) {
    return Response.json({ error: "Invalid assignment ID", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  // 1. Look up assignment
  const assignment = await prisma.assetAssignment.findUnique({
    where: { assignmentId },
  });
  if (!assignment) {
    return Response.json({ error: "Assignment not found", code: "NOT_FOUND" }, { status: 404 });
  }

  // 2. Already returned?
  if (assignment.returnedOn !== null) {
    const formatted = assignment.returnedOn.toISOString().slice(0, 10);
    return Response.json(
      { error: `Already returned on ${formatted}`, code: "ALREADY_RETURNED" },
      { status: 409 }
    );
  }

  // 3. Set returnedOn server-side
  const updated = await prisma.assetAssignment.update({
    where: { assignmentId },
    data: { returnedOn: new Date() },
    include: {
      asset: { select: { assetId: true, description: true, assetNumber: true } },
      user: { select: { userId: true, fullName: true } },
    },
  });

  // 4. Write AuditLog
  await writeAuditLog({
    tableName: "asset_assignment",
    recordId: assignmentId,
    action: "update",
    changedBy: user!.id,
  });

  return Response.json(updated);
}
