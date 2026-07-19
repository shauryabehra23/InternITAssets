import { NextRequest } from "next/server";
import prisma from "../../../../lib/prisma";
import { requireUser } from "../../../../lib/auth";

// GET /api/dashboard/by-location
export async function GET(request: NextRequest) {
  const { response } = await requireUser();
  if (response) return response;

  const grouped = await prisma.asset.groupBy({
    by: ["locationId"],
    where: { deletedAt: null },
    _count: { assetId: true },
  });

  const locationIds = grouped.map((r) => r.locationId).filter(Boolean) as number[];
  const locations = await prisma.location.findMany({
    where: { locationId: { in: locationIds } },
    select: { locationId: true, locationName: true, locationCode: true, companyCode: true },
  });
  const locationMap = Object.fromEntries(locations.map((l) => [l.locationId, l]));

  const data = grouped.map((r) => ({
    locationId: r.locationId,
    locationName: r.locationId ? (locationMap[r.locationId]?.locationName ?? locationMap[r.locationId]?.locationCode ?? "Unknown") : "No Location",
    locationCode: r.locationId ? (locationMap[r.locationId]?.locationCode ?? null) : null,
    companyCode: r.locationId ? (locationMap[r.locationId]?.companyCode ?? null) : null,
    count: r._count.assetId,
  }));

  // Sort descending by count
  data.sort((a, b) => b.count - a.count);

  return Response.json({ data });
}
