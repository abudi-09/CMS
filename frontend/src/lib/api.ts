// Assign or reassign a complaint to staff (admin)
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to assign complaint");
  return data.complaint || data;
}

// Dean or Admin: list all complaints (dean enabled via backend)
export async function listAllComplaintsApi() {
  const res = await fetch(`${API_BASE}/complaints/all`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch complaints");
  return data as Array<{
    priority: "Low" | "Medium" | "High" | "Critical";
    id: string;
    complaintCode?: string;
    title: string;
    status: string;
    department?: string | null;
    category?: string | null;
    submittedDate?: string;
    lastUpdated?: string;
    assignedTo?: string | null;
    submittedBy?: string | null;
    deadline?: string | null;
    sourceRole?: string | null;
    assignedByRole?: string | null;
    assignmentPath?: string[];
    submittedTo?: string | null;
    feedback?: unknown;
    isEscalated?: boolean;
  }>;
}

// Dean or Admin: complaint stats summary
export async function getComplaintStatsApi() {
  const res = await fetch(`${API_BASE}/stats/complaints`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch stats");
  return data as {
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
    unassigned: number;
  };
}

// Dean: stats excluding complaints submitted to Admin
export async function getDeanVisibleComplaintStatsApi() {
  const res = await fetch(`${API_BASE}/stats/complaints/dean-visible`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Failed to fetch dean-visible stats");
  return data as {
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
    unassigned: number;
  };
}

// HoD: department-scoped complaint stats
export async function getHodComplaintStatsApi() {
  const res = await fetch(`${API_BASE}/stats/complaints/department`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Failed to fetch department stats");
  return data as {
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
    unassigned: number;
  };
}

// HoD: department priority distribution
export async function getHodPriorityDistributionApi() {
  const res = await fetch(
    `${API_BASE}/stats/complaints/department/priority-distribution`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Failed to fetch priority distribution");
  return data as {
    total: number;
    priorities: Array<{ priority: string; count: number }>;
  };
}

// HoD: department status distribution
export async function getHodStatusDistributionApi() {
  const res = await fetch(
    `${API_BASE}/stats/complaints/department/status-distribution`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Failed to fetch status distribution");
  return data as {
    total: number;
    statuses: Array<{ status: string; count: number }>;
  };
}

// HoD: department category distribution
export async function getHodCategoryDistributionApi() {
  const res = await fetch(
    `${API_BASE}/stats/complaints/department/category-distribution`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Failed to fetch category distribution");
  return data as {
    total: number;
    categories: Array<{ category: string; count: number }>;
  };
}

// HoD: monthly trends (last N months)
export async function getHodMonthlyTrendsApi(months = 6) {
  const res = await fetch(
    `${API_BASE}/stats/complaints/department/monthly-trends?months=${months}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch monthly trends");
  return data as {
    months: number;
    data: Array<{
      month: string;
      year: number;
      submitted: number;
      resolved: number;
    }>;
  };
}

// HoD: staff performance aggregation
export async function getHodStaffPerformanceApi() {
  const res = await fetch(
    `${API_BASE}/stats/complaints/department/staff-performance`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Failed to fetch staff performance");
  return data as {
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
  };
}

// Public user profile (for management profile view pages)
export async function getUserPublicProfileApi(userId: string) {
  const res = await fetch(`${API_BASE}/profile/user/${userId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch user profile");
  return data as {
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
  };
}

// Admin or Dean: total student count (active students)
export async function getStudentCountApi() {
  const res = await fetch(`${API_BASE}/stats/students/count`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch student count");
  return data as { students: number };
}

// Admin/Dean: category counts across complaints
export async function getCategoryCountsApi() {
  const res = await fetch(`${API_BASE}/stats/categories`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Failed to fetch categories count");
  return data as {
    total: number;
    categories: Array<{ category: string; count: number }>;
  };
}

// Admin calendar summary: only direct-to-admin-by-student and assigned to the current admin
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
  const qs: string[] = [];
  if (typeof params?.month === "number") qs.push(`month=${params.month}`);
  if (typeof params?.year === "number") qs.push(`year=${params.year}`);
  if (params?.status) qs.push(`status=${encodeURIComponent(params.status)}`);
  if (params?.priority)
    qs.push(`priority=${encodeURIComponent(params.priority)}`);
  if (params?.categories?.length)
    qs.push(`categories=${encodeURIComponent(params.categories.join(","))}`);
  if (params?.submissionFrom)
    qs.push(`submissionFrom=${params.submissionFrom}`);
  if (params?.submissionTo) qs.push(`submissionTo=${params.submissionTo}`);
  if (params?.deadlineFrom) qs.push(`deadlineFrom=${params.deadlineFrom}`);
  if (params?.deadlineTo) qs.push(`deadlineTo=${params.deadlineTo}`);
  if (params?.viewType) qs.push(`viewType=${params.viewType}`);
  if (params?.assignedTo) qs.push(`assignedTo=${encodeURIComponent(params.assignedTo)}`);
  const url = `${API_BASE}/stats/complaints/calendar/admin-summary${
    qs.length ? `?${qs.join("&")}` : ""
  }`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Failed to fetch admin calendar summary");
  return data as {
    totalThisMonth: number;
    overdue: number;
    dueToday: number;
    resolvedThisMonth: number;
    countsByStatus?: Record<string, number>;
    countsByPriority?: Record<string, number>;
    countsByCategory?: Record<string, number>;
  };
}

// Admin calendar day (list complaints for a specific date)
export async function getAdminCalendarDayApi(params: {
  date: string; // yyyy-mm-dd
  viewType?: "submission" | "deadline";
  status?: string;
  priority?: string;
  categories?: string[];
  assignedTo?: string;
  tzOffset?: number; // minutes from Date.getTimezoneOffset()
}) {
  const qs: string[] = [];
  if (params?.date) qs.push(`date=${params.date}`);
  if (params?.viewType) qs.push(`viewType=${params.viewType}`);
  if (params?.status) qs.push(`status=${encodeURIComponent(params.status)}`);
  if (params?.priority)
    qs.push(`priority=${encodeURIComponent(params.priority)}`);
  if (params?.categories?.length)
    qs.push(`categories=${encodeURIComponent(params.categories.join(","))}`);
  if (params?.assignedTo) qs.push(`assignedTo=${encodeURIComponent(params.assignedTo)}`);
  if (typeof params?.tzOffset === "number") qs.push(`tzOffset=${params.tzOffset}`);
  const url = `${API_BASE}/stats/complaints/calendar/admin-day${qs.length ? `?${qs.join("&")}` : ""}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Failed to fetch admin day complaints");
  return data as Array<{
    _id?: string;
    id?: string;
    title?: string;
    status?: string;
    priority?: "Low" | "Medium" | "High" | "Critical" | string;
    category?: string;
    submittedBy?: { name?: string; email?: string } | string | null;
    createdAt?: string;
    submittedDate?: string;
    updatedAt?: string;
    lastUpdated?: string;
    deadline?: string | null;
    isEscalated?: boolean;
    submittedTo?: string | null;
    department?: string | null;
    sourceRole?: string | null;
    assignedByRole?: string | null;
    assignmentPath?: string[];
  }>;
}

// Approve staff (admin)
export async function approveStaffApi(staffId: string) {
  const res = await fetch(`${API_BASE}/admin/approve/${staffId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to approve staff");
  return data;
}

// Reject staff (admin)
export async function rejectStaffApi(staffId: string) {
  const res = await fetch(`${API_BASE}/admin/reject/${staffId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to reject staff");
  return data;
}
// Get current user (session persistence)
export type MeResponse = LoginSuccess & {
  avatarUrl?: string;
  workingPlace?: string;
  status?: string;
  registeredDate?: string | Date;
};

export async function getMeApi(): Promise<MeResponse> {
  return apiClient.get<MeResponse>("/auth/me");
}

// Update profile (basic fields like name)
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update profile");
  return data.user || data;
}

// Change password
export async function changePasswordApi(payload: {
  oldPassword: string;
  newPassword: string;
}) {
  const res = await fetch(`${API_BASE}/profile/password`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      oldPassword: payload.oldPassword,
      newPassword: payload.newPassword,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to change password");
  return data;
}

// Upload avatar (multipart/form-data)
export async function uploadAvatarApi(file: File) {
  const form = new FormData();
  form.append("avatar", file);
  const res = await fetch(`${API_BASE}/profile/avatar`, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to upload avatar");
  return data as { message: string; avatarUrl: string };
}
// Reset avatar to default
export async function resetAvatarApi() {
  const res = await fetch(`${API_BASE}/profile/avatar`, {
    method: "DELETE",
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to reset avatar");
  return data as { message: string; avatarUrl: string };
}
// Persist a Cloudinary-uploaded avatar (direct upload path)
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to save cloud avatar");
  return data as { message: string; avatarUrl: string };
}
// Fetch all staff (admin)
export async function getAllStaffApi() {
  const res = await fetch(`${API_BASE}/admin/all-staff`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch staff");
  return data;
}

// Fetch pending staff (admin)
export async function getPendingStaffApi() {
  const res = await fetch(`${API_BASE}/admin/pending-staff`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch pending staff");
  return data;
}

// Admin: dean approvals
export async function getPendingDeansApi() {
  const res = await fetch(`${API_BASE}/approvals/admin/pending-deans`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch pending deans");
  return data;
}

export async function getActiveDeansApi() {
  const res = await fetch(`${API_BASE}/approvals/admin/active-deans`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch active deans");
  return data;
}

// Authenticated: list approved & active deans for student submissions
export async function listActiveDeansPublicApi() {
  const res = await fetch(`${API_BASE}/approvals/public/active-deans`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch active deans");
  return data as Array<{
    _id: string;
    name?: string;
    email: string;
    workingPlace?: string;
  }>;
}

// Authenticated: list approved & active admins for student submissions
export async function listActiveAdminsPublicApi() {
  const res = await fetch(`${API_BASE}/approvals/public/active-admins`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch active admins");
  return data as Array<{
    _id: string;
    name?: string;
    email: string;
    workingPlace?: string;
  }>;
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to approve dean");
  return data;
}

export async function rejectDeanApi(deanId: string) {
  const res = await fetch(`${API_BASE}/approvals/admin/reject-dean/${deanId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to reject dean");
  return data;
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to deactivate dean");
  return data;
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to reactivate dean");
  return data;
}

// Public: list active staff in the authenticated user's department (approved + active)
export async function listMyDepartmentActiveStaffApi() {
  const res = await fetch(`${API_BASE}/staff/department/active`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch staff");
  return data as Array<{
    _id: string;
    name?: string;
    fullName?: string;
    username?: string;
    email: string;
    department: string;
  }>;
}

// NEW: Public: list active HoD in the authenticated user's department (approved + active)
export async function listMyDepartmentHodApi() {
  // This endpoint assumes the backend has a route to find the active HoD for the user's department.
  const res = await fetch(`${API_BASE}/users/department/hod/active`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Failed to fetch Head of Department");
  // The backend should return an array, even if it only contains one HoD
  return data as Array<{
    _id: string;
    name?: string;
    fullName?: string;
    username?: string;
    email: string;
    department: string;
  }>;
}

// Dean stage: HOD approvals
export async function getDeanPendingHodApi() {
  const res = await fetch(`${API_BASE}/approvals/dean/pending-hod`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Failed to fetch pending HoDs for dean");
  return data as Array<{
    _id: string;
    name?: string;
    fullName?: string;
    username?: string;
    email: string;
    department: string;
    status?: string;
  }>;
}

export async function deanApproveHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/approve-hod/${hodId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to approve HoD");
  return data;
}

export async function deanRejectHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/reject-hod/${hodId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to reject HoD");
  return data;
}

// Dean: reversal and lists
export async function deanDeapproveHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/deapprove-hod/${hodId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to set HoD to pending");
  return data;
}

export async function deanReapproveHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/reapprove-hod/${hodId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to re-approve HoD");
  return data;
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to deactivate HoD");
  return data;
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to reactivate HoD");
  return data;
}

// Public: list active staff in the authenticated user's department (approved + active)
export async function listMyDepartmentActiveStaffApi() {
  const res = await fetch(`${API_BASE}/staff/department/active`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch staff");
  return data as Array<{
    _id: string;
    name?: string;
    fullName?: string;
    username?: string;
    email: string;
    department: string;
  }>;
}

// NEW: Public: list active HoD in the authenticated user's department (approved + active)
export async function listMyDepartmentHodApi() {
  // This endpoint assumes the backend has a route to find the active HoD for the user's department.
  const res = await fetch(`${API_BASE}/users/department/hod/active`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Failed to fetch Head of Department");
  // The backend should return an array, even if it only contains one HoD
  return data as Array<{
    _id: string;
    name?: string;
    fullName?: string;
    username?: string;
    email: string;
    department: string;
  }>;
}

// Dean stage: HOD approvals
export async function getDeanPendingHodApi() {
  const res = await fetch(`${API_BASE}/approvals/dean/pending-hod`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Failed to fetch pending HoDs for dean");
  return data as Array<{
    _id: string;
    name?: string;
    fullName?: string;
    username?: string;
    email: string;
    department: string;
    status?: string;
  }>;
}

export async function deanApproveHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/approve-hod/${hodId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to approve HoD");
  return data;
}

export async function deanRejectHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/reject-hod/${hodId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to reject HoD");
  return data;
}

// Dean: reversal and lists
export async function deanDeapproveHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/deapprove-hod/${hodId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to set HoD to pending");
  return data;
}

export async function deanReapproveHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/reapprove-hod/${hodId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to re-approve HoD");
  return data;
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to deactivate HoD");
  return data;
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to reactivate HoD");
  return data;
}

// Public: list active staff in the authenticated user's department (approved + active)
export async function listMyDepartmentActiveStaffApi() {
  const res = await fetch(`${API_BASE}/staff/department/active`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch staff");
  return data as Array<{
    _id: string;
    name?: string;
    fullName?: string;
    username?: string;
    email: string;
    department: string;
  }>;
}

// NEW: Public: list active HoD in the authenticated user's department (approved + active)
export async function listMyDepartmentHodApi() {
  // This endpoint assumes the backend has a route to find the active HoD for the user's department.
  const res = await fetch(`${API_BASE}/users/department/hod/active`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Failed to fetch Head of Department");
  // The backend should return an array, even if it only contains one HoD
  return data as Array<{
    _id: string;
    name?: string;
    fullName?: string;
    username?: string;
    email: string;
    department: string;
  }>;
}

// Dean stage: HOD approvals
export async function getDeanPendingHodApi() {
  const res = await fetch(`${API_BASE}/approvals/dean/pending-hod`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Failed to fetch pending HoDs for dean");
  return data as Array<{
    _id: string;
    name?: string;
    fullName?: string;
    username?: string;
    email: string;
    department: string;
    status?: string;
  }>;
}

export async function deanApproveHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/approve-hod/${hodId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to approve HoD");
  return data;
}

export async function deanRejectHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/reject-hod/${hodId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to reject HoD");
  return data;
}

// Dean: reversal and lists
export async function deanDeapproveHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/deapprove-hod/${hodId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to set HoD to pending");
  return data;
}

export async function deanReapproveHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/reapprove-hod/${hodId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to re-approve HoD");
  return data;
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to deactivate HoD");
  return data;
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to reactivate HoD");
  return data;
}

// Public: list active staff in the authenticated user's department (approved + active)
export async function listMyDepartmentActiveStaffApi() {
  const res = await fetch(`${API_BASE}/staff/department/active`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch staff");
  return data as Array<{
    _id: string;
    name?: string;
    fullName?: string;
    username?: string;
    email: string;
    department: string;
  }>;
}

// NEW: Public: list active HoD in the authenticated user's department (approved + active)
export async function listMyDepartmentHodApi() {
  // This endpoint assumes the backend has a route to find the active HoD for the user's department.
  const res = await fetch(`${API_BASE}/users/department/hod/active`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Failed to fetch Head of Department");
  // The backend should return an array, even if it only contains one HoD
  return data as Array<{
    _id: string;
    name?: string;
    fullName?: string;
    username?: string;
    email: string;
    department: string;
  }>;
}

// Dean stage: HOD approvals
export async function getDeanPendingHodApi() {
  const res = await fetch(`${API_BASE}/approvals/dean/pending-hod`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Failed to fetch pending HoDs for dean");
  return data as Array<{
    _id: string;
    name?: string;
    fullName?: string;
    username?: string;
    email: string;
    department: string;
    status?: string;
  }>;
}

export async function deanApproveHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/approve-hod/${hodId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to approve HoD");
  return data;
}

export async function deanRejectHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/reject-hod/${hodId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to reject HoD");
  return data;
}

// Dean: reversal and lists
export async function deanDeapproveHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/deapprove-hod/${hodId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to set HoD to pending");
  return data;
}

export async function deanReapproveHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/reapprove-hod/${hodId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to re-approve HoD");
  return data;
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to deactivate HoD");
  return data;
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to reactivate HoD");
  return data;
}

// Public: list active staff in the authenticated user's department (approved + active)
export async function listMyDepartmentActiveStaffApi() {
  const res = await fetch(`${API_BASE}/staff/department/active`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch staff");
  return data as Array<{
    _id: string;
    name?: string;
    fullName?: string;
    username?: string;
    email: string;
    department: string;
  }>;
}

// NEW: Public: list active HoD in the authenticated user's department (approved + active)
export async function listMyDepartmentHodApi() {
  // This endpoint assumes the backend has a route to find the active HoD for the user's department.
  const res = await fetch(`${API_BASE}/users/department/hod/active`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Failed to fetch Head of Department");
  // The backend should return an array, even if it only contains one HoD
  return data as Array<{
    _id: string;
    name?: string;
    fullName?: string;
    username?: string;
    email: string;
    department: string;
  }>;
}

// Dean stage: HOD approvals
export async function getDeanPendingHodApi() {
  const res = await fetch(`${API_BASE}/approvals/dean/pending-hod`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Failed to fetch pending HoDs for dean");
  return data as Array<{
    _id: string;
    name?: string;
    fullName?: string;
    username?: string;
    email: string;
    department: string;
    status?: string;
  }>;
}

export async function deanApproveHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/approve-hod/${hodId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to approve HoD");
  return data;
}

export async function deanRejectHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/reject-hod/${hodId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to reject HoD");
  return data;
}

// Dean: reversal and lists
export async function deanDeapproveHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/deapprove-hod/${hodId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to set HoD to pending");
  return data;
}

export async function deanReapproveHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/reapprove-hod/${hodId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to re-approve HoD");
  return data;
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to deactivate HoD");
  return data;
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to reactivate HoD");
  return data;
}

// Public: list active staff in the authenticated user's department (approved + active)
export async function listMyDepartmentActiveStaffApi() {
  const res = await fetch(`${API_BASE}/staff/department/active`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch staff");
  return data as Array<{
    _id: string;
    name?: string;
    fullName?: string;
    username?: string;
    email: string;
    department: string;
  }>;
}

// NEW: Public: list active HoD in the authenticated user's department (approved + active)
export async function listMyDepartmentHodApi() {
  // This endpoint assumes the backend has a route to find the active HoD for the user's department.
  const res = await fetch(`${API_BASE}/users/department/hod/active`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Failed to fetch Head of Department");
  // The backend should return an array, even if it only contains one HoD
  return data as Array<{
    _id: string;
    name?: string;
    fullName?: string;
    username?: string;
    email: string;
    department: string;
  }>;
}

// Dean stage: HOD approvals
export async function getDeanPendingHodApi() {
  const res = await fetch(`${API_BASE}/approvals/dean/pending-hod`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Failed to fetch pending HoDs for dean");
  return data as Array<{
    _id: string;
    name?: string;
    fullName?: string;
    username?: string;
    email: string;
    department: string;
    status?: string;
  }>;
}

export async function deanApproveHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/approve-hod/${hodId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to approve HoD");
  return data;
}

export async function deanRejectHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/reject-hod/${hodId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to reject HoD");
  return data;
}

// Dean: reversal and lists
export async function deanDeapproveHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/deapprove-hod/${hodId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to set HoD to pending");
  return data;
}

export async function deanReapproveHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/reapprove-hod/${hodId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to re-approve HoD");
  return data;
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to deactivate HoD");
  return data;
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to reactivate HoD");
  return data;
}

// Public: list active staff in the authenticated user's department (approved + active)
export async function listMyDepartmentActiveStaffApi() {
  const res = await fetch(`${API_BASE}/staff/department/active`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch staff");
  return data as Array<{
    _id: string;
    name?: string;
    fullName?: string;
    username?: string;
    email: string;
    department: string;
  }>;
}

// NEW: Public: list active HoD in the authenticated user's department (approved + active)
export async function listMyDepartmentHodApi() {
  // This endpoint assumes the backend has a route to find the active HoD for the user's department.
  const res = await fetch(`${API_BASE}/users/department/hod/active`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Failed to fetch Head of Department");
  // The backend should return an array, even if it only contains one HoD
  return data as Array<{
    _id: string;
    name?: string;
    fullName?: string;
    username?: string;
    email: string;
    department: string;
  }>;
}

// Dean stage: HOD approvals
export async function getDeanPendingHodApi() {
  const res = await fetch(`${API_BASE}/approvals/dean/pending-hod`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Failed to fetch pending HoDs for dean");
  return data as Array<{
    _id: string;
    name?: string;
    fullName?: string;
    username?: string;
    email: string;
    department: string;
    status?: string;
  }>;
}

export async function deanApproveHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/approve-hod/${hodId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to approve HoD");
  return data;
}

export async function deanRejectHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/reject-hod/${hodId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to reject HoD");
  return data;
}

// Dean: reversal and lists
export async function deanDeapproveHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/deapprove-hod/${hodId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to set HoD to pending");
  return data;
}

export async function deanReapproveHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/reapprove-hod/${hodId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to re-approve HoD");
  return data;
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to deactivate HoD");
  return data;
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to reactivate HoD");
  return data;
}

// Public: list active staff in the authenticated user's department (approved + active)
export async function listMyDepartmentActiveStaffApi() {
  const res = await fetch(`${API_BASE}/staff/department/active`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch staff");
  return data as Array<{
    _id: string;
    name?: string;
    fullName?: string;
    username?: string;
    email: string;
    department: string;
  }>;
}

// NEW: Public: list active HoD in the authenticated user's department (approved + active)
export async function listMyDepartmentHodApi() {
  // This endpoint assumes the backend has a route to find the active HoD for the user's department.
  const res = await fetch(`${API_BASE}/users/department/hod/active`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Failed to fetch Head of Department");
  // The backend should return an array, even if it only contains one HoD
  return data as Array<{
    _id: string;
    name?: string;
    fullName?: string;
    username?: string;
    email: string;
    department: string;
  }>;
}

// Dean stage: HOD approvals
export async function getDeanPendingHodApi() {
  const res = await fetch(`${API_BASE}/approvals/dean/pending-hod`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Failed to fetch pending HoDs for dean");
  return data as Array<{
    _id: string;
    name?: string;
    fullName?: string;
    username?: string;
    email: string;
    department: string;
    status?: string;
  }>;
}

export async function deanApproveHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/approve-hod/${hodId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to approve HoD");
  return data;
}

export async function deanRejectHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/reject-hod/${hodId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to reject HoD");
  return data;
}

// Dean: reversal and lists
export async function deanDeapproveHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/deapprove-hod/${hodId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to set HoD to pending");
  return data;
}

export async function deanReapproveHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/reapprove-hod/${hodId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to re-approve HoD");
  return data;
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to deactivate HoD");
  return data;
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to reactivate HoD");
  return data;
}

// Public: list active staff in the authenticated user's department (approved + active)
export async function listMyDepartmentActiveStaffApi() {
  const res = await fetch(`${API_BASE}/staff/department/active`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch staff");
  return data as Array<{
    _id: string;
    name?: string;
    fullName?: string;
    username?: string;
    email: string;
    department: string;
  }>;
}

// NEW: Public: list active HoD in the authenticated user's department (approved + active)
export async function listMyDepartmentHodApi() {
  // This endpoint assumes the backend has a route to find the active HoD for the user's department.
  const res = await fetch(`${API_BASE}/users/department/hod/active`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Failed to fetch Head of Department");
  // The backend should return an array, even if it only contains one HoD
  return data as Array<{
    _id: string;
    name?: string;
    fullName?: string;
    username?: string;
    email: string;
    department: string;
  }>;
}

// Dean stage: HOD approvals
export async function getDeanPendingHodApi() {
  const res = await fetch(`${API_BASE}/approvals/dean/pending-hod`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Failed to fetch pending HoDs for dean");
  return data as Array<{
    _id: string;
    name?: string;
    fullName?: string;
    username?: string;
    email: string;
    department: string;
    status?: string;
  }>;
}

export async function deanApproveHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/approve-hod/${hodId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to approve HoD");
  return data;
}

export async function deanRejectHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/reject-hod/${hodId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to reject HoD");
  return data;
}

// Dean: reversal and lists
export async function deanDeapproveHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/deapprove-hod/${hodId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to set HoD to pending");
  return data;
}

export async function deanReapproveHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/reapprove-hod/${hodId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to re-approve HoD");
  return data;
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to deactivate HoD");
  return data;
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to reactivate HoD");
  return data;
}

// Public: list active staff in the authenticated user's department (approved + active)
export async function listMyDepartmentActiveStaffApi() {
  const res = await fetch(`${API_BASE}/staff/department/active`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch staff");
  return data as Array<{
    _id: string;
    name?: string;
    fullName?: string;
    username?: string;
    email: string;
    department: string;
  }>;
}

// NEW: Public: list active HoD in the authenticated user's department (approved + active)
export async function listMyDepartmentHodApi() {
  // This endpoint assumes the backend has a route to find the active HoD for the user's department.
  const res = await fetch(`${API_BASE}/users/department/hod/active`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Failed to fetch Head of Department");
  // The backend should return an array, even if it only contains one HoD
  return data as Array<{
    _id: string;
    name?: string;
    fullName?: string;
    username?: string;
    email: string;
    department: string;
  }>;
}

// Dean stage: HOD approvals
export async function getDeanPendingHodApi() {
  const res = await fetch(`${API_BASE}/approvals/dean/pending-hod`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Failed to fetch pending HoDs for dean");
  return data as Array<{
    _id: string;
    name?: string;
    fullName?: string;
    username?: string;
    email: string;
    department: string;
    status?: string;
  }>;
}

export async function deanApproveHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/approve-hod/${hodId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to approve HoD");
  return data;
}

export async function deanRejectHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/reject-hod/${hodId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to reject HoD");
  return data;
}

// Dean: reversal and lists
export async function deanDeapproveHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/deapprove-hod/${hodId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to set HoD to pending");
  return data;
}

export async function deanReapproveHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/reapprove-hod/${hodId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to re-approve HoD");
  return data;
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to deactivate HoD");
  return data;
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to reactivate HoD");
  return data;
}

// Public: list active staff in the authenticated user's department (approved + active)
export async function listMyDepartmentActiveStaffApi() {
  const res = await fetch(`${API_BASE}/staff/department/active`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch staff");
  return data as Array<{
    _id: string;
    name?: string;
    fullName?: string;
    username?: string;
    email: string;
    department: string;
  }>;
}

// NEW: Public: list active HoD in the authenticated user's department (approved + active)
export async function listMyDepartmentHodApi() {
  // This endpoint assumes the backend has a route to find the active HoD for the user's department.
  const res = await fetch(`${API_BASE}/users/department/hod/active`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Failed to fetch Head of Department");
  // The backend should return an array, even if it only contains one HoD
  return data as Array<{
    _id: string;
    name?: string;
    fullName?: string;
    username?: string;
    email: string;
    department: string;
  }>;
}

// Dean stage: HOD approvals
export async function getDeanPendingHodApi() {
  const res = await fetch(`${API_BASE}/approvals/dean/pending-hod`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Failed to fetch pending HoDs for dean");
  return data as Array<{
    _id: string;
    name?: string;
    fullName?: string;
    username?: string;
    email: string;
    department: string;
    status?: string;
  }>;
}

export async function deanApproveHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/approve-hod/${hodId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to approve HoD");
  return data;
}

export async function deanRejectHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/reject-hod/${hodId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to reject HoD");
  return data;
}

// Dean: reversal and lists
export async function deanDeapproveHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/deapprove-hod/${hodId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to set HoD to pending");
  return data;
}

export async function deanReapproveHodApi(hodId: string) {
  const res = await fetch(`${API_BASE}/approvals/dean/reapprove-hod/${hodId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "