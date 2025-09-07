export const COMPLAINT_STATUSES = Object.freeze([
  "Pending",
  "Accepted",
  "Assigned",
  "In Progress",
  "Resolved",
  "Closed",
]);

export const ALLOWED_TRANSITIONS = Object.freeze({
  Pending: ["Accepted", "In Progress", "Closed"],
  Accepted: ["In Progress", "Closed"],
  Assigned: ["In Progress", "Closed"],
  "In Progress": ["Resolved", "Closed"],
  Resolved: ["Closed"],
  Closed: ["Accepted"],
});

export function normalizeStatus(value) {
  if (!value) return value;
  const v = String(value).trim();
  if (/^in[-_ ]?progress$/i.test(v)) return "In Progress";
  if (/^accepted$/i.test(v)) return "Accepted";
  if (/^pending$/i.test(v)) return "Pending";
  if (/^resolved$/i.test(v)) return "Resolved";
  if (/^closed$/i.test(v)) return "Closed";
  if (/^assigned$/i.test(v)) return "Assigned";
  return v;
}

export function canTransition(fromStatus, toStatus) {
  const from = normalizeStatus(fromStatus);
  const to = normalizeStatus(toStatus);
  if (!ALLOWED_TRANSITIONS[from]) return false;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertTransition(fromStatus, toStatus) {
  if (!canTransition(fromStatus, toStatus)) {
    const allowed = ALLOWED_TRANSITIONS[normalizeStatus(fromStatus)] || [];
    const msg = `Illegal status transition: ${fromStatus} -> ${toStatus}. Allowed: ${
      allowed.join(", ") || "(none)"
    }`;
    const err = new Error(msg);
    err.code = "STATUS_TRANSITION_DENIED";
    throw err;
  }
}

export function deriveStatusOnApproval(currentStatus, approverRole) {
  const norm = normalizeStatus(currentStatus);
  const role = (approverRole || "").toLowerCase();
  const target = role === "hod" ? "In Progress" : "Accepted";
  assertTransition(norm, target);
  return target;
}

export function sanitizeIncomingStatus(desired, current) {
  const target = normalizeStatus(desired);
  if (canTransition(current, target)) return target;
  return current;
}

export function isTerminal(status) {
  return normalizeStatus(status) === "Closed";
}
