import { NextRequest } from "next/server";
import prisma from "../../../../lib/prisma";
import { requireUser } from "../../../../lib/auth";

const DEFAULT_N = 10;

// GET /api/dashboard/recent-activity
export async function GET(request: NextRequest) {
  const { response } = await requireUser();
  if (response) return response;

  const sp = request.nextUrl.searchParams;
  const n = Math.min(50, parseInt(sp.get("n") ?? String(DEFAULT_N), 10));

  const [recentAssignments, recentReturns, recentAssets] = await Promise.all([
    // Recent assignments (newly assigned)
    prisma.assetAssignment.findMany({
      take: n,
      orderBy: { assignedOn: "desc" },
      include: {
        asset: { select: { assetId: true, description: true, assetNumber: true } },
        user: { select: { userId: true, fullName: true } },
      },
    }),

    // Recent returns
    prisma.assetAssignment.findMany({
      where: { returnedOn: { not: null } },
      take: n,
      orderBy: { returnedOn: "desc" },
      include: {
        asset: { select: { assetId: true, description: true, assetNumber: true } },
        user: { select: { userId: true, fullName: true } },
      },
    }),

    // Recently added assets
    prisma.asset.findMany({
      where: { deletedAt: null },
      take: n,
      orderBy: { createdAt: "desc" },
      select: {
        assetId: true,
        description: true,
        assetNumber: true,
        createdAt: true,
        creator: { select: { userId: true, fullName: true } },
      },
    }),
  ]);

  return Response.json({
    recentAssignments,
    recentReturns,
    recentAssets,
  });
}
