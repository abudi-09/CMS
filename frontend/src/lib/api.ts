// Centralized API helper functions for frontend
// Clean, deduplicated, and with a defined API_BASE.

export const API_BASE = import.meta.env.VITE_API_BASE?.toString() || "/api";

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

// Lightweight HTTP client used by feature-specific API modules
export const apiClient = {
  async get<T = unknown>(path: string) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    return handleJson<T>(res);
  },
  async post<T = unknown>(path: string, body?: unknown) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return handleJson<T>(res);
  },
  async patch<T = unknown>(path: string, body?: unknown) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return handleJson<T>(res);
  },
  async delete<T = unknown>(path: string) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    return handleJson<T>(res);
  },
} as const;

// ========================= Auth =========================
export type LoginSuccess = {
  _id: string;
  email: string;
  role: string;
  username?: string;
  fullName?: string;
  name?: string;
  department?: string;
  isApproved?: boolean;
  phone?: string;
  address?: string;
  bio?: string;
  avatarUrl?: string;
};

export type LoginError = { error: string; message?: string };

export type SignupPayload = {
  name: string;
  username: string;
  email: string;
  password: string;
  role: string;
  department?: string;
  workingPlace?: string;
  // The frontend form may include confirmPassword, but we won't send it
  confirmPassword?: string;
};

export async function signupApi(input: SignupPayload) {
  // Normalize role to match backend expectations
  let role = (input.role || "").toLowerCase();
  if (role === "user" || role === "student") role = "student";
  else if (role === "headofdepartment" || role === "hod") role = "hod";
  else if (role === "staff") role = "staff";
  else if (role === "dean") role = "dean";
  else if (role === "admin") role = "admin";

  const payload = {
    name: input.name,
    username: input.username,
    email: input.email,
    password: input.password,
    role,
    // Only include when provided to avoid sending empty strings
    ...(input.department ? { department: input.department } : {}),
    ...(input.workingPlace ? { workingPlace: input.workingPlace } : {}),
  } as const;

  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    let msg = "Signup failed";
    if (data && typeof data === "object" && "error" in data) {
      const maybeErr = (data as Record<string, unknown>)["error"];
      if (typeof maybeErr === "string" && maybeErr.trim()) msg = maybeErr;
    }
    throw new Error(msg);
  }
  return data;
}

// ========================= Complaints: Submit =========================
// API payload for creating a complaint
export type Complaint = {
  title: string;
  description: string;
  category: string;
  department?: string;
  priority?: "Low" | "Medium" | "High" | "Critical";
  deadline?: string | null; // ISO date string
  evidenceFile?: string | null;
  submittedTo?: "admin" | "dean" | "hod";
  // provenance/routing
  sourceRole?: "student" | "staff" | "dean" | "hod" | "admin";
  assignedByRole?: "student" | "hod" | "dean" | "admin" | null;
  assignmentPath?: Array<"student" | "hod" | "dean" | "admin" | "staff">;
  // direct recipient shortcuts (immediate assignment)
  recipientStaffId?: string;
  recipientHodId?: string;
  // role-based routing target
  recipientRole?: "staff" | "hod" | "dean" | "admin" | null;
  recipientId?: string | null;
};

// Minimal UI complaint mapping used by cards/lists
type UiComplaint = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: "Pending" | "Accepted" | "In Progress" | "Resolved" | "Closed";
  submittedBy: string;
  submittedDate: Date;
  lastUpdated: Date;
  priority?: "Low" | "Medium" | "High" | "Critical";
  deadline?: Date | undefined;
  department?: string;
  submittedTo?: string | null;
};

// Inbox complaint shape used by Dean/HoD dashboards
export type InboxComplaint = {
  id: string;
  title: string;
  category?: string | null;
  status: "Pending" | "Unassigned" | "In Progress" | "Resolved" | "Closed";
  priority?: "Low" | "Medium" | "High" | "Critical";
  submittedDate?: string | null;
  lastUpdated?: string | null;
  assignedTo?: string | { name?: string } | null;
  submittedBy?: string | { name?: string } | null;
  deadline?: string | null;
  assignedByRole?: string | null;
  assignmentPath?: string[];
  submittedTo?: string | null;
  sourceRole?: string | null;
  department?: string | null;
};

export async function submitComplaintApi(
  payload: Complaint
): Promise<UiComplaint> {
  const res = await fetch(`${API_BASE}/complaints/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const data = await handleJson<unknown>(res);
  const container = (data && typeof data === "object" ? data : {}) as Record<
    string,
    unknown
  >;
  const maybe = (container.complaint ?? container) as Record<string, unknown>;
  // Normalize to UI shape
  const ui: UiComplaint = {
    id: String(maybe._id || maybe.id || ""),
    title: String((maybe.title as string) || ""),
    description: String((maybe.description as string) || ""),
    category: String(
      (maybe.category as string) || (maybe.department as string) || ""
    ),
    status: (maybe.status as UiComplaint["status"]) || "Pending",
    submittedBy: String((maybe.submittedBy as string) || ""),
    submittedDate: new Date((maybe.createdAt as string) || Date.now()),
    lastUpdated: new Date(
      (maybe.updatedAt as string) || (maybe.createdAt as string) || Date.now()
    ),
    priority: maybe.priority as UiComplaint["priority"],
    deadline: maybe.deadline ? new Date(String(maybe.deadline)) : undefined,
    department: (maybe.department as string) || undefined,
    submittedTo: (maybe.submittedTo as string) ?? null,
  };
  return ui;
}

export async function loginApi(
  email: string,
  password: string
): Promise<LoginSuccess | LoginError> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  return handleJson<LoginSuccess | LoginError>(res);
}

export async function getMeApi(): Promise<LoginSuccess> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson<LoginSuccess>(res);
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

// Approve complaint (Dean/HoD/Admin acceptance flow)
export async function approveComplaintApi(
  id: string,
  opts?: { assignToSelf?: boolean; note?: string }
) {
  const res = await fetch(
    `${API_BASE}/complaints/approve/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        assignToSelf: !!opts?.assignToSelf,
        note: opts?.note,
      }),
    }
  );
  return handleJson<{ message?: string; complaint?: unknown }>(res);
}

// Submit feedback for a resolved complaint
export async function submitComplaintFeedbackApi(
  complaintId: string,
  feedback: { rating: number; comment: string }
) {
  const res = await fetch(
    `${API_BASE}/complaints/feedback/${encodeURIComponent(complaintId)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(feedback),
    }
  );
  return handleJson<{ message?: string; complaint?: unknown }>(res);
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

// Student-owned edit/delete (only while Pending)
export async function updateMyComplaintApi(
  id: string,
  payload: Partial<{
    title: string;
    description: string;
    category: string;
    department: string;
    priority: "Low" | "Medium" | "High" | "Critical";
    deadline: string | null;
    evidenceFile: string | null;
  }>
) {
  const res = await fetch(
    `${API_BASE}/complaints/my/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    }
  );
  return handleJson<{ message?: string; complaint?: unknown }>(res);
}

export async function softDeleteMyComplaintApi(id: string) {
  const res = await fetch(
    `${API_BASE}/complaints/my/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );
  return handleJson<{ message?: string }>(res);
}

// Dean inbox (pending items relevant to dean)
export async function getDeanInboxApi() {
  const res = await fetch(`${API_BASE}/complaints/inbox/dean`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson<InboxComplaint[]>(res);
}

// ========================= Feedback (role-aware) =========================
export async function getFeedbackByRoleApi() {
  const res = await fetch(`${API_BASE}/complaints/feedback/by-role`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson<
    Array<{
      id: string;
      complaintId?: string;
      rating?: number;
      comment?: string;
      submittedBy?: { name?: string; email?: string } | string | null;
      assignedTo?: { name?: string; email?: string } | string | null;
      createdAt?: string;
      reviewed?: boolean;
    }>
  >(res);
}

export async function markFeedbackReviewedApi(complaintId: string) {
  const res = await fetch(
    `${API_BASE}/complaints/feedback/reviewed/${encodeURIComponent(
      complaintId
    )}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );
  return handleJson<{ message?: string }>(res);
}

// Staff-only: my feedback items (as assignee)
export async function getStaffFeedbackApi() {
  const res = await fetch(`${API_BASE}/complaints/feedback/my`, {
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

// ========================= Staff self metrics & workload =========================
export type StaffStats = {
  assigned: number;
  pending: number;
  inProgress: number;
  resolved: number;
};

export type AssignedComplaintLite = {
  id: string;
  title: string;
  status: string;
  submittedDate?: string;
  assignedAt?: string | null;
  lastUpdated?: string | null;
  resolvedAt?: string | null;
  category?: string;
  deadline?: string | null;
  priority?: "Low" | "Medium" | "High" | "Critical";
  feedback?: unknown | null;
};

// Staff-only: summary counters for my assigned work
export async function getMyStaffStatsApi() {
  const res = await fetch(`${API_BASE}/stats/staffs`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson<StaffStats>(res);
}

// Staff-only: list my assigned complaints (lightweight mapping)
export async function listMyAssignedComplaintsApi() {
  const res = await fetch(`${API_BASE}/complaints/assigned`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const raw = await handleJson<unknown>(res);
  const arr = Array.isArray(raw) ? (raw as unknown[]) : [];
  const mapPriority = (p: unknown): AssignedComplaintLite["priority"] => {
    const s = typeof p === "string" ? p : String(p ?? "");
    const v = s as AssignedComplaintLite["priority"];
    return v === "Low" || v === "Medium" || v === "High" || v === "Critical"
      ? v
      : undefined;
  };
  return arr.map((item) => {
    const o = (item && typeof item === "object" ? item : {}) as Record<
      string,
      unknown
    >;
    const id = String(o._id ?? o.id ?? "");
    const title = String(o.title ?? "");
    const status = String(o.status ?? "");
    const submittedDate = (o.submittedDate ?? o.createdAt) as
      | string
      | undefined;
    const assignedAt = (o.assignedAt as string | undefined) ?? null;
    const lastUpdated =
      (o.lastUpdated as string | undefined) ??
      (o.updatedAt as string | undefined) ??
      null;
    const resolvedAt = (o.resolvedAt as string | undefined) ?? null;
    const category =
      typeof o.category === "string" ? (o.category as string) : undefined;
    const deadline = (o.deadline as string | undefined) ?? null;
    const priority = mapPriority(o.priority);
    const feedback = (o as Record<string, unknown>).feedback ?? null;
    const lite: AssignedComplaintLite = {
      id,
      title,
      status,
      submittedDate,
      assignedAt,
      lastUpdated,
      resolvedAt,
      category,
      deadline,
      priority,
      feedback,
    };
    return lite;
  });
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

export async function getRoleCountsApi() {
  const res = await fetch(`${API_BASE}/stats/roles`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson<{
    deans: number;
    departmentHeads: number;
    students: number;
    staff: number;
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

// ========================= Admin: Users directory =========================
export type UserDto = {
  _id: string;
  email: string;
  role: string; // student | staff | hod | headOfDepartment | dean | admin
  name?: string;
  fullName?: string;
  username?: string;
  department?: string;
  workingPlace?: string;
  isActive?: boolean;
  isApproved?: boolean;
  isRejected?: boolean;
  previousRole?: string;
};

export async function getAllUsersApi(filters?: {
  role?: string;
  department?: string;
}) {
  const url = `${API_BASE}/admin/users${qs({
    role: filters?.role,
    department: filters?.department,
  })}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson<UserDto[]>(res);
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

// Dean: list active HoDs to assign to
export async function getDeanActiveHodApi() {
  const res = await fetch(`${API_BASE}/approvals/dean/active-hod`, {
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
    }>
  >(res);
}

// Dean: get all HoDs grouped (used in DepartmentManagement)
export async function getDeanAllHodApi() {
  const res = await fetch(`${API_BASE}/approvals/dean/all-hod`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson(res);
}

// Dean -> assign complaint to HoD (pending HoD acceptance)
export async function deanAssignToHodApi(
  complaintId: string,
  payload: { hodId: string; deadline?: string }
) {
  const res = await fetch(
    `${API_BASE}/complaints/dean/assign-to-hod/${encodeURIComponent(
      complaintId
    )}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    }
  );
  return handleJson<{ message?: string; complaint?: unknown }>(res);
}

// HoD -> assign complaint to Staff in same department
export async function hodAssignToStaffApi(
  complaintId: string,
  payload: { staffId: string; deadline?: string }
) {
  const res = await fetch(
    `${API_BASE}/complaints/hod/assign-to-staff/${encodeURIComponent(
      complaintId
    )}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    }
  );
  return handleJson<{ message?: string; complaint?: unknown }>(res);
}

// ========================= HoD Staff Approvals =========================
export async function getHodPendingStaffApi() {
  const res = await fetch(`${API_BASE}/approvals/hod/pending-staff`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson<
    Array<{
      _id: string;
      email: string;
      username?: string;
      name?: string;
      fullName?: string;
      department?: string;
    }>
  >(res);
}

export async function hodApproveStaffApi(staffId: string) {
  const res = await fetch(
    `${API_BASE}/approvals/hod/approve-staff/${staffId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );
  return handleJson(res);
}

export async function hodRejectStaffApi(staffId: string) {
  const res = await fetch(`${API_BASE}/approvals/hod/reject-staff/${staffId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson(res);
}

export async function hodDeactivateStaffApi(staffId: string) {
  const res = await fetch(
    `${API_BASE}/approvals/hod/deactivate-staff/${staffId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );
  return handleJson(res);
}

export async function hodReactivateStaffApi(staffId: string) {
  const res = await fetch(
    `${API_BASE}/approvals/hod/reactivate-staff/${staffId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );
  return handleJson(res);
}

// ========================= HoD: Department Users (students & staff) =========================
export async function hodGetUsersApi() {
  const res = await fetch(`${API_BASE}/approvals/hod/users`, {
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
      role?: "student" | "staff";
      isActive?: boolean;
      createdAt: string;
      updatedAt?: string;
      complaintsCount?: number;
      lastActivity?: string;
    }>
  >(res);
}

export async function hodActivateUserApi(userId: string) {
  const res = await fetch(
    `${API_BASE}/approvals/hod/activate-user/${encodeURIComponent(userId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );
  return handleJson<{ message?: string }>(res);
}

export async function hodDeactivateUserApi(userId: string) {
  const res = await fetch(
    `${API_BASE}/approvals/hod/deactivate-user/${encodeURIComponent(userId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );
  return handleJson<{ message?: string }>(res);
}

export async function hodPromoteUserApi(userId: string, workingPlace: string) {
  const res = await fetch(
    `${API_BASE}/approvals/hod/promote-user/${encodeURIComponent(userId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ workingPlace }),
    }
  );
  return handleJson<{ message?: string; user?: unknown }>(res);
}

// HoD: lists by status
export async function getHodActiveStaffApi() {
  const res = await fetch(`${API_BASE}/approvals/hod/active-staff`, {
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
      department?: string;
      createdAt?: string;
      workingPlace?: string;
    }>
  >(res);
}

export async function getHodDeactivatedStaffApi() {
  const res = await fetch(`${API_BASE}/approvals/hod/deactivated-staff`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson<unknown[]>(res);
}

export async function getHodRejectedStaffApi() {
  const res = await fetch(`${API_BASE}/approvals/hod/rejected-staff`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson<unknown[]>(res);
}

// ========================= Notifications =========================
export type NotificationItem = {
  _id: string;
  user: string;
  complaint?: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  meta?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
};

export async function listMyNotificationsApi(params?: {
  page?: number;
  pageSize?: number;
  unread?: boolean;
}) {
  const url = `${API_BASE}/notifications/my${qs({
    page: params?.page,
    pageSize: params?.pageSize,
    unread: params?.unread,
  })}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson<{
    items: NotificationItem[];
    total: number;
    page: number;
    pageSize: number;
  }>(res);
}

export async function markNotificationReadApi(notificationId: string) {
  const res = await fetch(
    `${API_BASE}/notifications/read/${encodeURIComponent(notificationId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );
  return handleJson<{ message?: string; notification?: NotificationItem }>(res);
}

export async function markAllNotificationsReadApi() {
  const res = await fetch(`${API_BASE}/notifications/read-all`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson<{ message?: string }>(res);
}

// ========================= HoD All Complaints =========================
export type HodAllComplaint = {
  id: string;
  title: string;
  category?: string;
  status: string;
  priority?: "Low" | "Medium" | "High" | "Critical";
  submittedDate?: string;
  lastUpdated?: string;
  assignedTo?: string | null;
  submittedBy?: string | null;
  deadline?: string | null;
  assignedByRole?: string | null;
  assignmentPath?: string[];
  submittedTo?: string | null;
  sourceRole?: string | null;
  department?: string | null;
};

export type HodAllResponse = {
  pending: HodAllComplaint[];
  accepted: HodAllComplaint[];
  assigned: HodAllComplaint[];
  resolved: HodAllComplaint[];
  rejected: HodAllComplaint[];
  counts: {
    pending: number;
    accepted: number;
    assigned: number;
    resolved: number;
    rejected: number;
  };
  lastUpdated: string;
};

export async function getHodAllApi() {
  const res = await fetch(`${API_BASE}/complaints/hod/all`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handleJson<HodAllResponse>(res);
}
