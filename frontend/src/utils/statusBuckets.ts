// Shared helpers to keep summary card logic consistent across pages

export type Bucket = "pending" | "inProgress" | "resolved" | "closed" | "other";

// Normalize status string and map to a standard bucket.
export function mapStatusToBucket(status?: string): Bucket {
  const s = String(status || "")
    .trim()
    .toLowerCase();
  if (!s) return "other";
  if (s === "pending" || s === "unassigned") return "pending";
  // Treat accepted/assigned/under review as in-progress work
  if (
    s === "in progress" ||
    s === "accepted" ||
    s === "assigned" ||
    s === "under review"
  )
    return "inProgress";
  if (s === "resolved") return "resolved";
  if (s === "closed" || s === "rejected") return "closed";
  return "other";
}

export function computeStandardCounts<T extends { status?: string }>(
  items: T[]
) {
  let pending = 0,
    inProgress = 0,
    resolved = 0;
  for (const it of items) {
    const b = mapStatusToBucket(it?.status);
    if (b === "pending") pending++;
    else if (b === "inProgress") inProgress++;
    else if (b === "resolved") resolved++;
  }
  return { total: items.length, pending, inProgress, resolved };
}
