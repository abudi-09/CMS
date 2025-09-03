// Centralized API helper functions for frontend
// Clean, deduplicated, and with a defined API_BASE.

const API_BASE = import.meta.env.VITE_API_BASE?.toString() || "/api";

type Json =
  | Record<string, unknown>
  | Array<unknown>
  | string
  | number
  | boolean
  | null;

async function handleJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  const data: unknown = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const d = data as Record<string, unknown> | undefined;
    const msg =
      (d && (d.error as string)) ||
      (d && (d.message as string)) ||
      res.statusText ||
      "Request failed";
    throw new Error(msg);
  }
  return data as T;
}

function qs(
  params: Record<string, string | number | boolean | undefined | null>
): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  return entries.length
    ? `?${entries
        .map(
          ([k, v]) =>
            `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`
        )
        .join("&")}`
    : "";
}

// ========================= Complaints (Admin/Dean) =========================
export async function assignComplaintApi(
  complaintId: string,
  staffId: string,
  deadline?: string,
  opts?: {
    assignedByRole?: "student" | "headOfDepartment" | "dean" | "admin";
    assignmentPath?: Array<
      "student" | "headOfDepartment" | "dean" | "admin" | "staff"
    >;
  }
) {
  const res = await fetch(`${API_BASE}/complaints/assign/${complaintId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ staffId, deadline, ...(opts || {}) }),
  });
  return handleJson(res);
}

export async function listAllComplaintsApi() {
  const res = await fetch(`${API_BASE}/complaints/all`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  // Use a broad type for compatibility with existing mappers
  return handleJson<unknown[]>(res);
}

// Common role-scoped complaint fetchers
export async function getAssignedComplaintsApi() {
  const res = await fetch(`${API_BASE}/complaints/assigned`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson<unknown[]>(res);
}

export async function updateComplaintStatusApi(
  id: string,
  status: string,
  notes?: string
) {
  const res = await fetch(
    `${API_BASE}/complaints/update-status/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status, notes }),
    }
  );
  return handleJson<{ success?: boolean; message?: string }>(res);
}

export async function getHodInboxApi() {
  const res = await fetch(`${API_BASE}/complaints/inbox/hod`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson<unknown[]>(res);
}

export async function getHodManagedComplaintsApi() {
  const res = await fetch(`${API_BASE}/complaints/hod/managed`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson<unknown[]>(res);
}

export async function getMyComplaintsApi() {
  const res = await fetch(`${API_BASE}/complaints/my-complaints`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson<unknown[]>(res);
}

// ========================= Stats (General) =========================
export async function getComplaintStatsApi() {
  const res = await fetch(`${API_BASE}/stats/complaints`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson<{
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
    unassigned: number;
  }>(res);
}

export async function getDeanVisibleComplaintStatsApi() {
  const res = await fetch(`${API_BASE}/stats/complaints/dean-visible`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson<{
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
    unassigned: number;
  }>(res);
}

export async function getHodComplaintStatsApi() {
  const res = await fetch(`${API_BASE}/stats/complaints/department`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson<{
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
    unassigned: number;
  }>(res);
}

export async function getHodPriorityDistributionApi() {
  const res = await fetch(
    `${API_BASE}/stats/complaints/department/priority-distribution`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );
  return handleJson<{
    total: number;
    priorities: Array<{ priority: string; count: number }>;
  }>(res);
}

export async function getHodStatusDistributionApi() {
  const res = await fetch(
    `${API_BASE}/stats/complaints/department/status-distribution`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );
  return handleJson<{
    total: number;
    statuses: Array<{ status: string; count: number }>;
  }>(res);
}

export async function getHodCategoryDistributionApi() {
  const res = await fetch(
    `${API_BASE}/stats/complaints/department/category-distribution`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );
  return handleJson<{
    total: number;
    categories: Array<{ category: string; count: number }>;
  }>(res);
}

export async function getHodMonthlyTrendsApi(months = 6) {
  const res = await fetch(
    `${API_BASE}/stats/complaints/department/monthly-trends${qs({ months })}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );
  return handleJson<{
    months: number;
    data: Array<{
      month: string;
      year: number;
      submitted: number;
      resolved: number;
    }>;
  }>(res);
}

export async function getHodStaffPerformanceApi() {
  const res = await fetch(
    `${API_BASE}/stats/complaints/department/staff-performance`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );
  return handleJson<{
    staff: Array<{
      staffId: string;
      name: string;
      email: string;
      department?: string;
      totalAssigned: number;
      pending: number;
      inProgress: number;
      resolved: number;
      successRate: number;
      avgResolutionHours: number;
      avgRating: number;
    }>;
  }>(res);
}

// ========================= Profiles =========================
export async function getUserPublicProfileApi(userId: string) {
  const res = await fetch(`${API_BASE}/profile/user/${userId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson<{
    id: string;
    name?: string;
    email: string;
    username?: string;
    role: string;
    department?: string;
    avatarUrl?: string;
    isActive?: boolean;
    isApproved?: boolean;
    isRejected?: boolean;
    memberSince?: string;
    submittedTotal: number;
    resolvedSubmitted: number;
    assignedTotal: number;
    resolvedAssigned: number;
    successRate: number;
  }>(res);
}

export async function getStudentCountApi() {
  const res = await fetch(`${API_BASE}/stats/students/count`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson<{ students: number }>(res);
}

export async function getCategoryCountsApi() {
  const res = await fetch(`${API_BASE}/stats/categories`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson<{
    total: number;
    categories: Array<{ category: string; count: number }>;
  }>(res);
}

// ========================= Admin Calendar =========================
export async function getAdminCalendarSummaryApi(params?: {
  month?: number; // 0-11
  year?: number;
  status?: string;
  priority?: string;
  categories?: string[];
  submissionFrom?: string; // yyyy-mm-dd
  submissionTo?: string; // yyyy-mm-dd
  deadlineFrom?: string; // yyyy-mm-dd
  deadlineTo?: string; // yyyy-mm-dd
  viewType?: "submission" | "deadline";
  assignedTo?: string; // admin id
}) {
  const url = `${API_BASE}/stats/complaints/calendar/admin-summary${qs({
    month: typeof params?.month === "number" ? params?.month : undefined,
    year: typeof params?.year === "number" ? params?.year : undefined,
    status: params?.status,
    priority: params?.priority,
    categories: params?.categories?.length
      ? params.categories.join(",")
      : undefined,
    submissionFrom: params?.submissionFrom,
    submissionTo: params?.submissionTo,
    deadlineFrom: params?.deadlineFrom,
    deadlineTo: params?.deadlineTo,
    viewType: params?.viewType,
    assignedTo: params?.assignedTo,
  })}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson<{
    totalThisMonth: number;
    overdue: number;
    dueToday: number;
    resolvedThisMonth: number;
    countsByStatus?: Record<string, number>;
    countsByPriority?: Record<string, number>;
    countsByCategory?: Record<string, number>;
  }>(res);
}

export async function getAdminCalendarDayApi(params: {
  date: string; // yyyy-mm-dd
  viewType?: "submission" | "deadline";
  status?: string;
  priority?: string;
  categories?: string[];
  assignedTo?: string;
  tzOffset?: number; // minutes from Date.getTimezoneOffset()
}) {
  const url = `${API_BASE}/stats/complaints/calendar/admin-day${qs({
    date: params?.date,
    viewType: params?.viewType,
    status: params?.status,
    priority: params?.priority,
    categories: params?.categories?.length
      ? params.categories.join(",")
      : undefined,
    assignedTo: params?.assignedTo,
    tzOffset:
      typeof params?.tzOffset === "number" ? params.tzOffset : undefined,
  })}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson<unknown[]>(res);
}

// ========================= Admin: Staff Approvals =========================
export async function approveStaffApi(staffId: string) {
  const res = await fetch(`${API_BASE}/admin/approve/${staffId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson(res);
}

export async function rejectStaffApi(staffId: string) {
  const res = await fetch(`${API_BASE}/admin/reject/${staffId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson(res);
}

// ========================= Profile management =========================
export async function updateProfileApi(payload: {
  name?: string;
  phone?: string;
  address?: string;
  bio?: string;
}) {
  const res = await fetch(`${API_BASE}/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handleJson<{ user: unknown }>(res);
}

export async function changePasswordApi(payload: {
  oldPassword: string;
  newPassword: string;
}) {
  const res = await fetch(`${API_BASE}/profile/password`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handleJson(res);
}

export async function uploadAvatarApi(file: File) {
  const form = new FormData();
  form.append("avatar", file);
  const res = await fetch(`${API_BASE}/profile/avatar`, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  return handleJson<{ message: string; avatarUrl: string }>(res);
}

export async function resetAvatarApi() {
  const res = await fetch(`${API_BASE}/profile/avatar`, {
    method: "DELETE",
    credentials: "include",
  });
  return handleJson<{ message: string; avatarUrl: string }>(res);
}

export async function saveCloudAvatarApi(payload: {
  avatarUrl: string;
  publicId: string;
}) {
  const res = await fetch(`${API_BASE}/profile/avatar/cloud`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handleJson<{ message: string; avatarUrl: string }>(res);
}

// ========================= Public discovery lists =========================
export async function getAllStaffApi() {
  const res = await fetch(`${API_BASE}/admin/all-staff`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson(res);
}

export async function getPendingStaffApi() {
  const res = await fetch(`${API_BASE}/admin/pending-staff`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson(res);
}

export async function getPendingDeansApi() {
  const res = await fetch(`${API_BASE}/approvals/admin/pending-deans`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson(res);
}

export async function getActiveDeansApi() {
  const res = await fetch(`${API_BASE}/approvals/admin/active-deans`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson(res);
}

export async function listActiveDeansPublicApi() {
  const res = await fetch(`${API_BASE}/approvals/public/active-deans`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson<
    Array<{ _id: string; name?: string; email: string; workingPlace?: string }>
  >(res);
}

export async function listActiveAdminsPublicApi() {
  const res = await fetch(`${API_BASE}/approvals/public/active-admins`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson<
    Array<{ _id: string; name?: string; email: string; workingPlace?: string }>
  >(res);
}

export async function approveDeanApi(deanId: string) {
  const res = await fetch(
    `${API_BASE}/approvals/admin/approve-dean/${deanId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );
  return handleJson(res);
}

export async function rejectDeanApi(deanId: string) {
  const res = await fetch(`${API_BASE}/approvals/admin/reject-dean/${deanId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson(res);
}

export async function deactivateDeanApi(deanId: string) {
  const res = await fetch(
    `${API_BASE}/approvals/admin/deactivate-dean/${deanId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );
  return handleJson(res);
}

export async function reactivateDeanApi(deanId: string) {
  const res = await fetch(
    `${API_BASE}/approvals/admin/reactivate-dean/${deanId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );
  return handleJson(res);
}

export async function listMyDepartmentActiveStaffApi() {
  const res = await fetch(`${API_BASE}/staff/department/active`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson<
    Array<{
      _id: string;
      name?: string;
      fullName?: string;
      username?: string;
      email: string;
      department: string;
    }>
  >(res);
}

export async function listMyDepartmentHodApi() {
  const res = await fetch(`${API_BASE}/users/department/hod/active`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson<
    Array<{
      _id: string;
      name?: string;
      fullName?: string;
      username?: string;
      email: string;
      department: string;
    }>
  >(res);
}

export async function getDeanPendingHodApi() {
  const res = await fetch(`${API_BASE}/approvals/dean/pending-hod`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson(res);
}

export async function deanApproveHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/approve-hod/${hodId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson(res);
}

export async function deanRejectHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/reject-hod/${hodId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson(res);
}

export async function deanDeapproveHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/deapprove-hod/${hodId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson(res);
}

export async function deanReapproveHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/reapprove-hod/${hodId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson(res);
}

export async function deanDeactivateHodApi(hodId: string) {
  const res = await fetch(
    `${API_BASE}/approvals/dean/deactivate-hod/${hodId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );
  return handleJson(res);
}

export async function deanReactivateHodApi(hodId: string) {
  const res = await fetch(
    `${API_BASE}/approvals/dean/reactivate-hod/${hodId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );
  return handleJson(res);
}
