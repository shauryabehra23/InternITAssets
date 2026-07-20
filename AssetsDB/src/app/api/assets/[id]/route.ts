import { NextRequest } from "next/server";
import prisma from "../../../../lib/prisma";
import { requireUser, requireAdmin } from "../../../../lib/auth";
import { writeAuditLog, diffObjects } from "../../../../lib/audit";

const AUDIT_TABLE = "asset";

function sanitizeAssetBody(body: Record<string, unknown>) {
  const stripped = { ...body };
  for (const f of ["createdBy", "updatedBy", "createdAt", "updatedAt", "deletedAt", "assetId"]) {
    delete stripped[f];
  }
  return stripped;
}

function validateAssetData(data: Record<string, unknown>) {
  if (data.quantity !== undefined && Number(data.quantity) <= 0) {
    return "quantity must be greater than 0";
  }
  if (data.apcValue !== undefined && Number(data.apcValue) < 0) {
    return "apcValue must be >= 0";
  }
  if (data.bookValue !== undefined && Number(data.bookValue) < 0) {
    return "bookValue must be >= 0";
  }
  if (data.capitalizedOn !== undefined) {
    const d = new Date(data.capitalizedOn as string);
    if (isNaN(d.getTime())) return "capitalizedOn is not a valid date";
    if (d > new Date()) return "capitalizedOn cannot be in the future";
  }
  return null;
}

// GET /api/assets/:id
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

  const asset = await prisma.asset.findFirst({
    where: { assetId, deletedAt: null },
    include: {
      location: true,
      vendor: true,
      assetClass: true,
      company: true,
      assignments: {
        where: { returnedOn: null },
        include: { user: { select: { userId: true, fullName: true, email: true, role: true } } },
        take: 1,
        orderBy: { assignedOn: "desc" },
      },
    },
  });

  if (!asset) {
    return Response.json({ error: "Asset not found", code: "NOT_FOUND" }, { status: 404 });
  }

  const currentHolder = asset.assignments[0]?.user ?? null;
  const { assignments, ...assetData } = asset;
  void assignments;

  return Response.json({ ...assetData, currentHolder });
}

// PUT /api/assets/:id — full update
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireUser();
  if (response) return response;

  const { id } = await params;
  const assetId = parseInt(id, 10);
  if (isNaN(assetId)) {
    return Response.json({ error: "Invalid asset ID", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const existing = await prisma.asset.findFirst({ where: { assetId, deletedAt: null } });
  if (!existing) {
    return Response.json({ error: "Asset not found", code: "NOT_FOUND" }, { status: 404 });
  }

  const data = sanitizeAssetBody(body);
  for (const k of ["companyCode", "vendorCode", "locationId", "assetClassCode"]) {
    if (data[k] !== undefined && data[k] !== null && data[k] !== "") data[k] = Number(data[k]);
  }
  const validationError = validateAssetData(data);
  if (validationError) {
    return Response.json({ error: validationError, code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const updated = await prisma.asset.update({
    where: { assetId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: {
      ...(data as any),
      updatedBy: user!.id,
    },
  });

  // Diff and write audit log only if something changed
  const changes = diffObjects(
    existing as unknown as Record<string, unknown>,
    updated as unknown as Record<string, unknown>
  );
  if (changes) {
    await writeAuditLog({ tableName: AUDIT_TABLE, recordId: assetId, action: "update", changedBy: user!.id, changes });
  }

  return Response.json(updated);
}

// PATCH /api/assets/:id — partial update
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return PUT(request, { params });
}

// DELETE /api/assets/:id — soft-delete (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  const assetId = parseInt(id, 10);
  if (isNaN(assetId)) {
    return Response.json({ error: "Invalid asset ID", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const existing = await prisma.asset.findFirst({ where: { assetId, deletedAt: null } });
  if (!existing) {
    return Response.json({ error: "Asset not found", code: "NOT_FOUND" }, { status: 404 });
  }

  // Check no active (unreturned) assignment
  const activeAssignment = await prisma.assetAssignment.findFirst({
    where: { assetId, returnedOn: null },
  });
  if (activeAssignment) {
    return Response.json(
      { error: "Asset must be returned before deletion", code: "ASSET_ASSIGNED" },
      { status: 409 }
    );
  }

  const deleted = await prisma.asset.update({
    where: { assetId },
    data: { deletedAt: new Date() },
  });

  await writeAuditLog({ tableName: AUDIT_TABLE, recordId: assetId, action: "delete", changedBy: user!.id });

  return Response.json(deleted);
}
