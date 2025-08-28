// Utility functions for handling complaint timelines and preventing duplicates

export interface TimelineEntry {
  id?: string;
  status: string;
  userId: string;
  userName?: string;
  comment?: string;
  timestamp: string | number | Date;
}

/**
 * Checks if two timeline entries should be merged (same status and user)
 */
export function shouldMergeTimelineEntries(
  last: TimelineEntry,
  next: TimelineEntry
): boolean {
  return last.status === next.status && last.userId === next.userId;
}

/**
 * Merges timeline entries by updating the last entry instead of creating duplicates
 */
export function mergeTimelineEntries(
  existing: TimelineEntry[],
  newEntry: TimelineEntry,
  options: {
    updateTimestampOnMerge?: boolean;
    replaceCommentOnMerge?: boolean;
  } = {}
): TimelineEntry[] {
  const { updateTimestampOnMerge = true, replaceCommentOnMerge = true } =
    options;

  const entries = [...existing];
  const last = entries[entries.length - 1];

  if (shouldMergeTimelineEntries(last, newEntry)) {
    const updated = { ...last };
    if (replaceCommentOnMerge && newEntry.comment) {
      updated.comment = newEntry.comment;
    }
    if (updateTimestampOnMerge) {
      updated.timestamp = new Date(newEntry.timestamp).toISOString();
    }
    entries[entries.length - 1] = updated;
    return entries;
  }

  entries.push({
    ...newEntry,
    timestamp: new Date(newEntry.timestamp).toISOString(),
  });
  return entries;
}

/**
 * Processes consolidated timeline descriptions from backend
 */
export function processConsolidatedDescription(description: string): string[] {
  if (!description) return [];

  // Split on timestamp patterns like [2024-01-01T00:00:00.000Z]
  const lines = description.split(/\n\[/).map((line, index) => {
    if (index === 0) return line;
    return `[${line}`;
  });

  return lines.filter((line) => line.trim());
}

/**
 * Formats timeline description for display
 */
export function formatTimelineDescription(description: string): string {
  const updates = processConsolidatedDescription(description);
  if (updates.length <= 1) return description;

  return updates
    .map(
      (update, index) => `${index + 1}. ${update.replace(/^\[.*?\]\s*/, "")}`
    )
    .join("\n");
}
