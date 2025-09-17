export function complaintToDTO(doc) {
  if (!doc) return null;
  const c = doc.toObject ? doc.toObject({ virtuals: false }) : doc;
  // Derive a human-friendly display name for the submitter (mask-aware)
  const displayName = (() => {
    try {
      if (c.isAnonymous) return "Anonymous";
      if (typeof c.submittedBy === "string" && c.submittedBy)
        return c.submittedBy;
      if (c.submittedBy && typeof c.submittedBy === "object")
        return (
          c.submittedBy.name ||
          c.submittedBy.fullName ||
          c.submittedBy.email ||
          null
        );
      return null;
    } catch {
      return "Anonymous";
    }
  })();
  my;
  return {
    id: String(c._id),
    complaintCode: c.complaintCode || null,
    title: c.title || "Untitled Complaint",
    status: c.status || "Pending",
    priority: c.priority || "Medium",
    department: c.department || null,
    category: c.category || null,
    submittedDate: c.createdAt || null,
    lastUpdated: c.updatedAt || null,
    resolvedAt: c.resolvedAt || null,
    assignedTo:
      c.assignedTo && typeof c.assignedTo === "object"
        ? c.assignedTo.name || c.assignedTo.email || null
        : null,
    submittedBy:
      c.submittedBy && typeof c.submittedBy === "object"
        ? c.submittedBy.name || c.submittedBy.email || null
        : null,
    displayName,
    deadline: c.deadline || null,
    sourceRole: c.sourceRole || null,
    assignedByRole: c.assignedByRole || null,
    assignmentPath: Array.isArray(c.assignmentPath) ? c.assignmentPath : [],
    submittedTo: c.submittedTo || null,
    feedback: c.status === "Resolved" ? c.feedback || null : null,
    isEscalated: !!c.isEscalated,
    isDeleted: !!c.isDeleted,
    recipientRole: c.recipientRole || null,
    recipientId: c.recipientId || null,
    isAnonymous: !!c.isAnonymous,
  };
}
