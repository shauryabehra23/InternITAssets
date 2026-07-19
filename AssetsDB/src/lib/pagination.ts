/**
 * Parses page/limit query params and returns Prisma-compatible skip/take values
 * plus a standard paginated response wrapper.
 */
export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") ?? "25", 10))
  );
  const skip = (page - 1) * limit;
  return { page, limit, skip, take: limit };
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  return { data, total, page, limit };
}
