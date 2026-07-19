import { NextRequest } from "next/server";
import prisma from "../../../lib/prisma";
import { requireUser } from "../../../lib/auth";
import { parsePagination, paginatedResponse } from "../../../lib/pagination";

// GET /api/locations
export async function GET(request: NextRequest) {
  const { response } = await requireUser();
  if (response) return response;

  const sp = request.nextUrl.searchParams;
  const { page, limit, skip, take } = parsePagination(sp);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (sp.has("companyCode")) {
    where.companyCode = parseInt(sp.get("companyCode")!, 10);
  }

  const [total, locations] = await Promise.all([
    prisma.location.count({ where }),
    prisma.location.findMany({
      where,
      skip,
      take,
      orderBy: { locationId: "asc" },
      include: { company: true },
    }),
  ]);

  return Response.json(paginatedResponse(locations, total, page, limit));
}

// POST /api/locations
export async function POST(request: NextRequest) {
  const { response } = await requireUser();
  if (response) return response;

  let body: { companyCode?: number; locationCode?: string; locationName?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  if (!body.companyCode || !body.locationCode) {
    return Response.json(
      { error: "companyCode and locationCode are required", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  try {
    const location = await prisma.location.create({
      data: {
        companyCode: body.companyCode,
        locationCode: body.locationCode,
        locationName: body.locationName,
      },
    });
    return Response.json(location, { status: 201 });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2002") {
      return Response.json(
        { error: "Location code already exists for this company", code: "VALIDATION_ERROR" },
        { status: 409 }
      );
    }
    throw err;
  }
}
