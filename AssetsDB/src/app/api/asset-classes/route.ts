import { NextRequest } from "next/server";
import prisma from "../../../lib/prisma";
import { requireUser } from "../../../lib/auth";
import { parsePagination, paginatedResponse } from "../../../lib/pagination";

// GET /api/asset-classes
export async function GET(request: NextRequest) {
  const { response } = await requireUser();
  if (response) return response;

  const sp = request.nextUrl.searchParams;
  const { page, limit, skip, take } = parsePagination(sp);

  const [total, classes] = await Promise.all([
    prisma.assetClass.count(),
    prisma.assetClass.findMany({ skip, take, orderBy: { assetClassCode: "asc" } }),
  ]);

  return Response.json(paginatedResponse(classes, total, page, limit));
}

// POST /api/asset-classes
export async function POST(request: NextRequest) {
  const { response } = await requireUser();
  if (response) return response;

  let body: { assetClassCode?: number; description?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  if (!body.assetClassCode || !body.description) {
    return Response.json(
      { error: "assetClassCode and description are required", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  try {
    const assetClass = await prisma.assetClass.create({
      data: { assetClassCode: body.assetClassCode, description: body.description },
    });
    return Response.json(assetClass, { status: 201 });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2002") {
      return Response.json({ error: "Asset class code already exists", code: "VALIDATION_ERROR" }, { status: 409 });
    }
    throw err;
  }
}
