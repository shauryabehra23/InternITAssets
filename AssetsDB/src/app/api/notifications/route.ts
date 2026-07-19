import { NextRequest } from "next/server";
import prisma from "../../../lib/prisma";
import { requireUser } from "../../../lib/auth";

// Constants — never magic numbers
const WARRANTY_THRESHOLD_DAYS = 30;
const OVERDUE_THRESHOLD_DAYS = 90;
const HIGH_VALUE_THRESHOLD = 100000;

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// GET /api/notifications
export async function GET(request: NextRequest) {
  const { response } = await requireUser();
  if (response) return response;

  const now = new Date();
  const warrantyThreshold = addDays(now, WARRANTY_THRESHOLD_DAYS);
  const overdueThreshold = addDays(now, -OVERDUE_THRESHOLD_DAYS);

  const [warrantyExpiring, overdueReturns, unassignedHighValue] = await Promise.all([
    // Assets where warranty expires within next 30 days (not yet expired)
    prisma.asset.findMany({
      where: {
        deletedAt: null,
        warrantyExpiresOn: {
          gt: now,
          lte: warrantyThreshold,
        },
      },
      include: {
        location: { select: { locationId: true, locationName: true, locationCode: true } },
        assignments: {
          where: { returnedOn: null },
          include: { user: { select: { userId: true, fullName: true } } },
          take: 1,
          orderBy: { assignedOn: "desc" },
        },
      },
    }),

    // Active assignments where assignedOn is older than 90 days
    prisma.assetAssignment.findMany({
      where: {
        returnedOn: null,
        assignedOn: { lte: overdueThreshold },
      },
      include: {
        asset: {
          select: {
            assetId: true,
            description: true,
            assetNumber: true,
            location: { select: { locationId: true, locationName: true, locationCode: true } },
          },
        },
        user: { select: { userId: true, fullName: true } },
      },
    }),

    // Assets with apcValue > threshold with no active assignment
    prisma.asset.findMany({
      where: {
        deletedAt: null,
        apcValue: { gt: HIGH_VALUE_THRESHOLD },
        assignments: { none: { returnedOn: null } },
      },
      include: {
        location: { select: { locationId: true, locationName: true, locationCode: true } },
      },
    }),
  ]);

  // Flatten warrantyExpiring to remove nested assignments, expose currentHolder
  const warrantyExpiringResult = warrantyExpiring.map(({ assignments, ...asset }) => ({
    ...asset,
    currentHolder: assignments[0]?.user ?? null,
  }));

  return Response.json({
    warrantyExpiring: warrantyExpiringResult,
    overdueReturns,
    unassignedHighValue,
    meta: {
      warrantyThresholdDays: WARRANTY_THRESHOLD_DAYS,
      overdueThresholdDays: OVERDUE_THRESHOLD_DAYS,
      highValueThreshold: HIGH_VALUE_THRESHOLD,
    },
  });
}
