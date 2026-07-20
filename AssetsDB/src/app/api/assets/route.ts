import { NextRequest } from "next/server";
import prisma from "../../../lib/prisma";
import { requireUser } from "../../../lib/auth";
import { parsePagination, paginatedResponse } from "../../../lib/pagination";
import { writeAuditLog } from "../../../lib/audit";

const AUDIT_TABLE = "asset";

// Strips server-managed fields from client body
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

// GET /api/assets
export async function GET(request: NextRequest) {
  const { response } = await requireUser();
  if (response) return response;

  const sp = request.nextUrl.searchParams;
  const { page, limit, skip, take } = parsePagination(sp);

  // Build filters
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { deletedAt: null };

  if (sp.has("companyCode")) where.companyCode = parseInt(sp.get("companyCode")!, 10);
  if (sp.has("locationId")) where.locationId = parseInt(sp.get("locationId")!, 10);
  if (sp.has("assetClassCode")) where.assetClassCode = parseInt(sp.get("assetClassCode")!, 10);
  if (sp.has("vendorCode")) where.vendorCode = parseInt(sp.get("vendorCode")!, 10);

  if (sp.has("search")) {
    const q = sp.get("search")!;
    where.OR = [
      { description: { contains: q, mode: "insensitive" } },
      { serialNumber: { contains: q, mode: "insensitive" } },
      { assetNumber: { contains: q, mode: "insensitive" } },
    ];
  }

  if (sp.has("assignedUserId")) {
    const uid = parseInt(sp.get("assignedUserId")!, 10);
    where.assignments = { some: { userId: uid, returnedOn: null } };
  }

  if (sp.get("unassigned") === "true") {
    where.assignments = { none: { returnedOn: null } };
  }

  const [total, assets] = await Promise.all([
    prisma.asset.count({ where }),
    prisma.asset.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        location: true,
        vendor: true,
        assetClass: true,
        company: true,
      },
    }),
  ]);

  return Response.json(paginatedResponse(assets, total, page, limit));
}

// POST /api/assets
export async function POST(request: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const data = sanitizeAssetBody(body);
  for (const k of ["companyCode", "vendorCode", "locationId", "assetClassCode"]) {
    if (data[k] !== undefined && data[k] !== null && data[k] !== "") data[k] = Number(data[k]);
  }
  for (const k of ["capitalizedOn", "warrantyExpiresOn"]) {
    if (data[k] !== undefined && data[k] !== null && data[k] !== "") data[k] = new Date(data[k] as string);
  }
  const validationError = validateAssetData(data);
  if (validationError) {
    return Response.json({ error: validationError, code: "VALIDATION_ERROR" }, { status: 400 });
  }

  if (!data.companyCode || !data.assetNumber) {
    return Response.json(
      { error: "companyCode and assetNumber are required", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const asset = await prisma.asset.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: {
      ...(data as any),
      createdBy: user!.id,
    },
  });

  await writeAuditLog({
    tableName: AUDIT_TABLE,
    recordId: asset.assetId,
    action: "create",
    changedBy: user!.id,
  });

  return Response.json(asset, { status: 201 });
}
