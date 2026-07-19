import prisma from "./prisma";

type AuditAction = "create" | "update" | "delete";

interface WriteAuditLogOptions {
  tableName: string;
  recordId: number;
  action: AuditAction;
  changedBy: number;
  changes?: Record<string, { from: unknown; to: unknown }>;
}

/**
 * Writes an AuditLog entry. Safe to call from any route handler.
 */
export async function writeAuditLog(opts: WriteAuditLogOptions) {
  await prisma.auditLog.create({
    data: {
      tableName: opts.tableName,
      recordId: opts.recordId,
      action: opts.action,
      changedBy: opts.changedBy,
      // Cast needed: Prisma Json type doesn't accept arbitrary Record<string, unknown> directly
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      changes: (opts.changes ?? undefined) as any,
    },
  });
}

/**
 * Diffs two objects and returns only fields that changed, in { field: { from, to } } shape.
 * Returns null if nothing changed.
 */
export function diffObjects(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): Record<string, { from: unknown; to: unknown }> | null {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of Object.keys(after)) {
    const bVal = before[key];
    const aVal = after[key];
    // Compare as JSON strings for nested equality (handles Decimal/Date coercion)
    if (JSON.stringify(bVal) !== JSON.stringify(aVal)) {
      changes[key] = { from: bVal, to: aVal };
    }
  }
  return Object.keys(changes).length > 0 ? changes : null;
}
