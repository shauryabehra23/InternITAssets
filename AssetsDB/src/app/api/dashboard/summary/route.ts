import { NextRequest } from "next/server";
import prisma from "../../../../lib/prisma";
import { requireUser } from "../../../../lib/auth";

// GET /api/dashboard/summary
export async function GET(request: NextRequest) {
  const { response } = await requireUser();
  if (response) return response;

  const [
    totalAssets,
    byCompany,
    byClass,
    unassignedCount,
    bookValueAgg,
  ] = await Promise.all([
    // Total non-deleted assets
    prisma.asset.count({ where: { deletedAt: null } }),

    // Count per company
    prisma.asset.groupBy({
      by: ["companyCode"],
      where: { deletedAt: null },
      _count: { assetId: true },
    }),

    // Count per asset class
    prisma.asset.groupBy({
      by: ["assetClassCode"],
      where: { deletedAt: null },
      _count: { assetId: true },
    }),

    // Unassigned assets (no active assignment)
    prisma.asset.count({
      where: {
        deletedAt: null,
        assignments: { none: { returnedOn: null } },
      },
    }),

    // Total book value — use raw aggregate
    prisma.asset.aggregate({
      where: { deletedAt: null },
      _sum: { bookValue: true },
    }),
  ]);

  // Resolve company names
  const companyCodes = byCompany.map((r) => r.companyCode);
  const companies = await prisma.company.findMany({
    where: { companyCode: { in: companyCodes } },
    select: { companyCode: true, companyName: true },
  });
  const companyMap = Object.fromEntries(companies.map((c) => [c.companyCode, c.companyName]));

  // Resolve class descriptions
  const classCodes = byClass.map((r) => r.assetClassCode).filter(Boolean) as number[];
  const classes = await prisma.assetClass.findMany({
    where: { assetClassCode: { in: classCodes } },
    select: { assetClassCode: true, description: true },
  });
  const classMap = Object.fromEntries(classes.map((c) => [c.assetClassCode, c.description]));

  return Response.json({
    totalAssets,
    unassignedCount,
    totalBookValue: Number(bookValueAgg._sum.bookValue ?? 0),
    byCompany: byCompany.map((r) => ({
      companyCode: r.companyCode,
      companyName: companyMap[r.companyCode] ?? "Unknown",
      count: r._count.assetId,
    })),
    byClass: byClass.map((r) => ({
      assetClassCode: r.assetClassCode,
      description: r.assetClassCode ? (classMap[r.assetClassCode] ?? "Unknown") : "Unclassified",
      count: r._count.assetId,
    })),
  });
}
