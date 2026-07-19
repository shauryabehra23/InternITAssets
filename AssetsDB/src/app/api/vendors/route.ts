import { NextRequest } from "next/server";
import prisma from "../../../lib/prisma";
import { requireUser } from "../../../lib/auth";
import { parsePagination, paginatedResponse } from "../../../lib/pagination";

// GET /api/vendors
export async function GET(request: NextRequest) {
  const { response } = await requireUser();
  if (response) return response;

  const sp = request.nextUrl.searchParams;
  const { page, limit, skip, take } = parsePagination(sp);

  const [total, vendors] = await Promise.all([
    prisma.vendor.count(),
    prisma.vendor.findMany({ skip, take, orderBy: { vendorCode: "asc" } }),
  ]);

  return Response.json(paginatedResponse(vendors, total, page, limit));
}

// POST /api/vendors
export async function POST(request: NextRequest) {
  const { response } = await requireUser();
  if (response) return response;

  let body: { vendorCode?: number; vendorName?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  if (!body.vendorCode || !body.vendorName) {
    return Response.json(
      { error: "vendorCode and vendorName are required", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  try {
    const vendor = await prisma.vendor.create({
      data: { vendorCode: body.vendorCode, vendorName: body.vendorName },
    });
    return Response.json(vendor, { status: 201 });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2002") {
      return Response.json({ error: "Vendor code already exists", code: "VALIDATION_ERROR" }, { status: 409 });
    }
    throw err;
  }
}
