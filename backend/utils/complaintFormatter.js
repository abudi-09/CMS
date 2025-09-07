export function complaintToDTO(doc) {
  if (!doc) return null;
  const c = doc.toObject ? doc.toObject({ virtuals: false }) : doc;
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
  };
}
