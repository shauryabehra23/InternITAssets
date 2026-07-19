import { NextRequest } from "next/server";
import prisma from "../../../lib/prisma";
import { requireUser } from "../../../lib/auth";
import { parsePagination, paginatedResponse } from "../../../lib/pagination";

// GET /api/companies
export async function GET(request: NextRequest) {
  const { response } = await requireUser();
  if (response) return response;

  const sp = request.nextUrl.searchParams;
  const { page, limit, skip, take } = parsePagination(sp);

  const [total, companies] = await Promise.all([
    prisma.company.count(),
    prisma.company.findMany({ skip, take, orderBy: { companyCode: "asc" } }),
  ]);

  return Response.json(paginatedResponse(companies, total, page, limit));
}

// POST /api/companies
export async function POST(request: NextRequest) {
  const { response } = await requireUser();
  if (response) return response;

  let body: { companyCode?: number; companyName?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  if (!body.companyCode || !body.companyName) {
    return Response.json(
      { error: "companyCode and companyName are required", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  try {
    const company = await prisma.company.create({
      data: { companyCode: body.companyCode, companyName: body.companyName },
    });
    return Response.json(company, { status: 201 });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2002") {
      return Response.json({ error: "Company code already exists", code: "VALIDATION_ERROR" }, { status: 409 });
    }
    throw err;
  }
}
