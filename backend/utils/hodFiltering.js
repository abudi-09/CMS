/**
 * Returns a MongoDB filter object for HoD complaint scoping.
 * Ensures:
 * - Only complaints assigned to this HoD, staff in their department, or direct recipient to this HoD
 * - Excludes dean/admin-only complaints unless assigned inside department
 * - Department is case-insensitive exact match
 *
 * @param {Object} user - The HoD user object (must have _id and department)
 * @param {Object} [opts] - Optional overrides (e.g. staffIds)
 * @returns {Object} MongoDB filter for Complaint.find/aggregate
 */
export function buildHodScopeFilter(user, opts = {}) {
  if (!user || !user._id || !user.department)
    throw new Error("HoD user and department required");
  const escapeRegex = (s) =>
    String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const deptRegex = new RegExp(`^${escapeRegex(user.department)}$`, "i");
  const staffIds = opts.staffIds || [];
  const strictRecipient = !!opts.strictRecipient; // when true, require direct targeting to this HOD
  const base = {
    isDeleted: { $ne: true },
    department: deptRegex,
    $and: [
      {
        $or: [
          { assignedTo: user._id },
          ...(staffIds.length ? [{ assignedTo: { $in: staffIds } }] : []),
          { recipientRole: "hod", recipientId: user._id },
        ],
      },
      {
        $or: [
          { submittedTo: { $exists: false } },
          { submittedTo: null },
          { submittedTo: { $not: /(admin|dean)/i } },
          { assignedTo: user._id },
          ...(staffIds.length ? [{ assignedTo: { $in: staffIds } }] : []),
        ],
      },
    ],
  };

  if (!strictRecipient) return base;
  // Strict mode: only include items assigned to this HOD or explicitly addressed to this HOD
  return {
    ...base,
    $and: [
      ...(base.$and || []),
      {
        $or: [
          { assignedTo: user._id },
          { $and: [{ recipientRole: "hod" }, { recipientId: user._id }] },
        ],
      },
    ],
  };
}

export default buildHodScopeFilter;
