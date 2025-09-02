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
  if (!res.ok) throw new Error(data.error || "Failed to fetch categories count");
  return data as { total: number; categories: Array<{ category: string; count: number }> };
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

export async function getDeanActiveHodApi() {
  const res = await fetch(`${API_BASE}/approvals/dean/active-hod`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch active HoDs");
  return data as Array<{
    _id: string;
    name?: string;
    fullName?: string;
    username?: string;
    email: string;
    department: string;
  }>;
}

export async function getDeanRejectedHodApi() {
  const res = await fetch(`${API_BASE}/approvals/dean/rejected-hod`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch rejected HoDs");
  return data as Array<{
    _id: string;
    name?: string;
    fullName?: string;
    username?: string;
    email: string;
    department: string;
  }>;
}
// Strongly-typed HOD user shape for dean grouped response
export type HodApiUser = {
  _id: string;
  name?: string;
  fullName?: string;
  username?: string;
  email: string;
  department?: string;
  isApproved?: boolean;
  isRejected?: boolean;
  isActive?: boolean;
};

export type DeanAllHodResponse = {
  pending: HodApiUser[];
  approved: HodApiUser[];
  rejected: HodApiUser[];
  deactivated: HodApiUser[];
};

export async function getDeanAllHodApi(): Promise<DeanAllHodResponse> {
  const res = await fetch(`${API_BASE}/approvals/dean/all-hod`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const raw = (await res.json()) as unknown;
  if (!res.ok) {
    const errMsg =
      typeof raw === "object" && raw && "error" in raw
        ? String(
            (raw as { error?: unknown }).error || "Failed to fetch all HoDs"
          )
        : "Failed to fetch all HoDs";
    throw new Error(errMsg);
  }
  return raw as DeanAllHodResponse;
}
export async function signupApi(formData: {
  name: string;
  username: string;
  email: string;
  password: string;
  role: string;
  department?: string;
  workingPlace?: string;
}) {
  // Map role to backend expected value
  let role = (formData.role || "").toLowerCase();
  // Normalize legacy values to canonical backend roles
  if (role === "user" || role === "student") role = "student";
  else if (role === "headofdepartment" || role === "hod") role = "hod";
  else if (role === "staff") role = "staff";
  else if (role === "dean") role = "dean";
  else if (role === "admin") role = "admin";
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...formData, role }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Signup failed");
  return data;
}

// API utility for backend integration
export const API_BASE =
  import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

export type LoginSuccess = {
  _id: string;
  username?: string;
  name?: string;
  fullName?: string;
  email: string;
  role: string; // narrowed to UserRole at call sites
  department?: string;
  isApproved?: boolean;
  phone?: string;
  address?: string;
  bio?: string;
};

export type LoginError = {
  error: "pending-approval" | "inactive-account" | "rejected-account";
  message?: string;
};

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
  const data = await res.json();
  if (!res.ok) {
    // Special handling for pending approval or inactive account
    if (
      data?.error === "pending-approval" ||
      data?.error === "inactive-account" ||
      data?.error === "rejected-account"
    ) {
      return { error: data.error, message: data.message };
    }
    throw new Error(data.error || "Login failed");
  }
  return data;
}

// HOD: Staff management within department
export async function getHodPendingStaffApi() {
  const res = await fetch(`${API_BASE}/approvals/hod/pending-staff`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch pending staff");
  return data as Array<{
    _id: string;
    name?: string;
    fullName?: string;
    username?: string;
    email: string;
    department: string;
  }>;
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to approve staff");
  return data;
}

export async function hodRejectStaffApi(staffId: string) {
  const res = await fetch(`${API_BASE}/approvals/hod/reject-staff/${staffId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to reject staff");
  return data;
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to deactivate staff");
  return data;
}

// Notifications API
export type NotificationItem = {
  _id: string;
  user: string;
  complaint?: string | null;
  type:
    | "submission"
    | "assignment"
    | "accept"
    | "reject"
    | "status"
    | "feedback"
    | "user-signup";
  title: string;
  message: string;
  read: boolean;
  meta?: {
    redirectPath?: string;
    complaintId?: string;
    [key: string]: unknown;
  };
  createdAt: string;
  updatedAt: string;
};

export async function listMyNotificationsApi(params?: {
  unread?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<{
  items: NotificationItem[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const q = new URLSearchParams();
  if (params?.unread) q.set("unread", String(params.unread));
  if (params?.page) q.set("page", String(params.page));
  if (params?.pageSize) q.set("pageSize", String(params.pageSize));
  const res = await fetch(
    `${API_BASE}/notifications/my${q.toString() ? `?${q.toString()}` : ""}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch notifications");
  return data as {
    items: NotificationItem[];
    total: number;
    page: number;
    pageSize: number;
  };
}

export async function markNotificationReadApi(id: string) {
  const res = await fetch(`${API_BASE}/notifications/read/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Failed to mark notification read");
  return data;
}

export async function markAllNotificationsReadApi() {
  const res = await fetch(`${API_BASE}/notifications/read-all`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Failed to mark all notifications read");
  return data;
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to reactivate staff");
  return data;
}

export async function getHodActiveStaffApi() {
  const res = await fetch(`${API_BASE}/approvals/hod/active-staff`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch active staff");
  return data as Array<{
    _id: string;
    name?: string;
    fullName?: string;
    username?: string;
    email: string;
    department: string;
  }>;
}

export async function getHodDeactivatedStaffApi() {
  const res = await fetch(`${API_BASE}/approvals/hod/deactivated-staff`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Failed to fetch deactivated staff");
  return data as Array<{
    _id: string;
    name?: string;
    fullName?: string;
    username?: string;
    email: string;
    department: string;
  }>;
}

export async function getHodRejectedStaffApi() {
  const res = await fetch(`${API_BASE}/approvals/hod/rejected-staff`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch rejected staff");
  return data as Array<{
    _id: string;
    name?: string;
    fullName?: string;
    username?: string;
    email: string;
    department: string;
  }>;
}

// HOD: user (student) management in department
export async function hodGetUsersApi() {
  const res = await fetch(`${API_BASE}/approvals/hod/users`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch users");
  return data as Array<unknown>;
}

export async function hodActivateUserApi(userId: string) {
  const res = await fetch(`${API_BASE}/approvals/hod/activate-user/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to activate user");
  return data;
}

export async function hodDeactivateUserApi(userId: string) {
  const res = await fetch(
    `${API_BASE}/approvals/hod/deactivate-user/${userId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to deactivate user");
  return data;
}

export async function hodPromoteUserApi(userId: string, workingPlace: string) {
  const res = await fetch(`${API_BASE}/approvals/hod/promote-user/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ workingPlace }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to promote user");
  return data;
}

export async function getMyComplaintsApi() {
  const res = await fetch(`${API_BASE}/complaints/my-complaints`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch complaints");
  return data.complaints || data;
}

// Submit a new complaint
// Define the Complaint type according to your application's requirements
export interface Complaint {
  title: string;
  description: string;
  department: string;
  category?: string;
  priority?: "Low" | "Medium" | "High" | "Critical";
  deadline?: string | Date;
  evidenceFile?: string | null;
  submittedTo?: string | null;
  sourceRole?: "student" | "staff" | "dean" | "headOfDepartment" | "admin";
  assignedByRole?: "student" | "headOfDepartment" | "dean" | "admin" | null;
  assignmentPath?: Array<
    "student" | "headOfDepartment" | "dean" | "admin" | "staff"
  >;
  // When submitting directly to staff
  recipientStaffId?: string;
  // When submitting directly to HoD
  recipientHodId?: string;
}

export async function submitComplaintApi(complaint: Complaint) {
  // Normalize role keys for backend (maps headOfDepartment -> hod)
  const toBackendRole = (role?: string | null) => {
    if (!role)
      return role as unknown as
        | "student"
        | "staff"
        | "hod"
        | "dean"
        | "admin"
        | null;
    const r = role.toString();
    if (
      r === "headOfDepartment" ||
      r.toLowerCase() === "headofdepartment" ||
      r.toLowerCase() === "hod"
    )
      return "hod" as const;
    if (r.toLowerCase() === "student") return "student" as const;
    if (r.toLowerCase() === "staff") return "staff" as const;
    if (r.toLowerCase() === "dean") return "dean" as const;
    if (r.toLowerCase() === "admin") return "admin" as const;
    return r as unknown as
      | "student"
      | "staff"
      | "hod"
      | "dean"
      | "admin"
      | null;
  };

  const backendPayload = {
    ...complaint,
    sourceRole: toBackendRole(complaint.sourceRole) ?? undefined,
    assignedByRole: toBackendRole(complaint.assignedByRole) ?? undefined,
    assignmentPath: Array.isArray(complaint.assignmentPath)
      ? complaint.assignmentPath.map((r) => toBackendRole(r) as string)
      : complaint.assignmentPath,
  };

  const res = await fetch(`${API_BASE}/complaints/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(backendPayload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to submit complaint");
  return data.complaint || data;
}

// Staff: list complaints assigned to current user
export async function getAssignedComplaintsApi() {
  const res = await fetch(`${API_BASE}/complaints/assigned`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Failed to fetch assigned complaints");
  return data as Array<{
    id: string;
    title: string;
    category: string;
    status: string;
    priority?: "Low" | "Medium" | "High" | "Critical";
    submittedDate: string | Date;
    lastUpdated: string | Date;
    submittedBy: { name?: string; email?: string };
    shortDescription?: string;
    fullDescription?: string;
    isEscalated?: boolean;
    deadline?: string | Date | null;
    sourceRole?: string;
    assignedByRole?: string;
    assignmentPath?: string[];
  }>;
}

// Staff: update status of an assigned complaint
export async function updateComplaintStatusApi(
  complaintId: string,
  status: "Pending" | "In Progress" | "Resolved" | "Closed",
  description?: string
) {
  const res = await fetch(
    `${API_BASE}/complaints/update-status/${complaintId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status, description }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update status");
  return data.complaint || data;
}

// Admin/Dean/HoD: approve a complaint (Pending -> In Progress). If assignToSelf is true,
// the approver becomes the assignee.
export async function approveComplaintApi(
  complaintId: string,
  payload?: { assignToSelf?: boolean; note?: string }
) {
  const res = await fetch(`${API_BASE}/complaints/approve/${complaintId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload || {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to approve complaint");
  return data.complaint || data;
}

// User: submit feedback for a resolved complaint
export async function submitComplaintFeedbackApi(
  complaintId: string,
  feedback: { rating: number; comment: string }
) {
  const res = await fetch(`${API_BASE}/complaints/feedback/${complaintId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(feedback),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to submit feedback");
  return data.complaint || data;
}

// Staff: list feedback on complaints assigned to current staff
export async function getStaffFeedbackApi() {
  const res = await fetch(`${API_BASE}/complaints/feedback/my`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch feedback");
  return data as Array<{
    complaintId: string;
    title: string;
    complaintCode?: string;
    submittedBy?: { name?: string; email?: string };
    assignedTo?: { name?: string; email?: string };
    feedback: {
      rating: number;
      comment?: string;
      reviewed?: boolean;
      submittedAt?: string | Date;
    };
    resolvedAt?: string | Date;
    submittedAt?: string | Date;
    avgResolutionMs?: number;
    category?: string;
    department?: string;
  }>;
}

// Dean: inbox of pending complaints (latest 100)
export type InboxComplaint = {
  id: string;
  title: string;
  category?: string;
  status: "Pending" | "In Progress" | "Resolved" | "Closed";
  priority?: "Low" | "Medium" | "High" | "Critical";
  submittedDate?: string | Date;
  lastUpdated?: string | Date;
  assignedTo?: string | { name?: string } | null;
  submittedBy?: string | { name?: string; email?: string } | null;
  deadline?: string | Date | null;
  assignedByRole?: string | null;
  assignmentPath?: string[];
  submittedTo?: string | null;
  sourceRole?: string | null;
};

export async function getDeanInboxApi() {
  const res = await fetch(`${API_BASE}/complaints/inbox/dean`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch dean inbox");
  return data as Array<InboxComplaint>;
}

// HoD: inbox of pending complaints (latest 100)
export async function getHodInboxApi() {
  const res = await fetch(`${API_BASE}/complaints/inbox/hod`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch HOD inbox");
  return data as Array<InboxComplaint>;
}

// Admin: inbox of pending complaints (latest 100)
export async function getAdminInboxApi() {
  const res = await fetch(`${API_BASE}/complaints/inbox/admin`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch Admin inbox");
  return data as Array<InboxComplaint>;
}

// Dean: assign to HoD with optional deadline (keeps complaint Pending for HoD to accept)
export async function deanAssignToHodApi(
  complaintId: string,
  payload: { hodId: string; deadline?: string | Date }
) {
  const res = await fetch(
    `${API_BASE}/complaints/dean/assign-to-hod/${complaintId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to assign to HoD");
  return data.complaint || data;
}

// HoD: assign to staff in department
export async function hodAssignToStaffApi(
  complaintId: string,
  payload: { staffId: string; deadline?: string | Date }
) {
  const res = await fetch(
    `${API_BASE}/complaints/hod/assign-to-staff/${complaintId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to assign to staff");
  return data.complaint || data;
}

// HoD: list complaints managed by HoD (self + staff in department)
export async function getHodManagedComplaintsApi() {
  const res = await fetch(`${API_BASE}/complaints/hod/managed`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch HoD complaints");
  return data as Array<{
    id: string;
    title: string;
    category?: string;
    status: "Pending" | "In Progress" | "Resolved" | "Closed";
    priority?: "Low" | "Medium" | "High" | "Critical";
    submittedDate?: string | Date;
    lastUpdated?: string | Date;
    assignedTo?: string | null;
    submittedBy?: string | null;
    deadline?: string | Date | null;
    assignedByRole?: string | null;
    assignmentPath?: string[];
    submittedTo?: string | null;
    sourceRole?: string | null;
  }>;
}

// HoD: consolidated view for all tabs
export type HodAllResponse = {
  pending: Array<
    InboxComplaint & { department?: string | null } & {
      assignedTo?: string | { name?: string } | null;
    }
  >;
  accepted: Array<InboxComplaint & { department?: string | null }>;
  assigned: Array<InboxComplaint & { department?: string | null }>;
  resolved: Array<InboxComplaint & { department?: string | null }>;
  rejected: Array<InboxComplaint & { department?: string | null }>;
  counts: {
    pending: number;
    accepted: number;
    assigned: number;
    resolved: number;
    rejected: number;
  };
  lastUpdated: string;
};

export async function getHodAllApi(): Promise<HodAllResponse> {
  const res = await fetch(`${API_BASE}/complaints/hod/all`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch HoD all data");
  return data as HodAllResponse;
}

export async function markFeedbackReviewedApi(complaintId: string) {
  const res = await fetch(
    `${API_BASE}/complaints/feedback/reviewed/${complaintId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to mark reviewed");
  return data.complaint || data;
}

// Role-aware: staff/hod/dean/admin
export async function getFeedbackByRoleApi() {
  const res = await fetch(`${API_BASE}/complaints/feedback/by-role`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch feedback");
  return data as Array<{
    complaintId: string;
    title: string;
    complaintCode?: string;
    submittedBy?: { name?: string; email?: string };
    assignedTo?: {
      name?: string;
      email?: string;
      role?: string;
      department?: string;
    };
    feedback: {
      rating: number;
      comment?: string;
      reviewed?: boolean;
      submittedAt?: string | Date;
    };
    resolvedAt?: string | Date;
    submittedAt?: string | Date;
    avgResolutionMs?: number;
    category?: string;
    department?: string;
  }>;
}

// Admin: fetch role counts summary
export async function getRoleCountsApi() {
  const res = await fetch(`${API_BASE}/stats/roles`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch role counts");
  return data as {
    deans: number;
    departmentHeads: number;
    students: number;
    staff: number;
  };
}

// Staff performance stats
export type StaffStats = {
  assigned: number;
  pending: number;
  inProgress: number;
  resolved: number;
};

export async function getMyStaffStatsApi(): Promise<StaffStats> {
  const res = await fetch(`${API_BASE}/stats/staffs`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch staff stats");
  return data as StaffStats;
}

// Optional: recent activity for staff (resolved/in-progress assigned to me)
export type AssignedComplaintLite = {
  id: string;
  title: string;
  status: string;
  submittedDate?: string | Date;
  assignedAt?: string | Date;
  lastUpdated?: string | Date;
  resolvedAt?: string | Date;
  category?: string;
  deadline?: string | Date;
  priority?: "Low" | "Medium" | "High" | "Critical";
  feedback?: { rating?: number; comment?: string } | null;
};

export async function listMyAssignedComplaintsApi(): Promise<
  AssignedComplaintLite[]
> {
  const res = await fetch(`${API_BASE}/complaints/assigned`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data: unknown = await res.json();
  if (!res.ok) {
    const errMsg =
      typeof data === "object" &&
      data !== null &&
      "error" in (data as Record<string, unknown>)
        ? String(
            (data as Record<string, unknown>)["error"] ??
              "Failed to fetch assigned complaints"
          )
        : "Failed to fetch assigned complaints";
    throw new Error(errMsg);
  }
  // Map to a minimal shape; backend may include more fields
  const arr = Array.isArray(data) ? (data as ReadonlyArray<unknown>) : [];
  return arr.map((raw) => {
    const c = (raw ?? {}) as Record<string, unknown>;
    return {
      id: String(c["id"] ?? c["_id"] ?? ""),
      title: String(c["title"] ?? ""),
      status: String(c["status"] ?? ""),
      submittedDate:
        (c["submittedDate"] as string | Date | undefined) ??
        (c["createdAt"] as string | Date | undefined),
      assignedAt: c["assignedAt"] as string | Date | undefined,
      lastUpdated:
        (c["lastUpdated"] as string | Date | undefined) ??
        (c["updatedAt"] as string | Date | undefined),
      resolvedAt: c["resolvedAt"] as string | Date | undefined,
      category:
        typeof c["category"] === "string"
          ? (c["category"] as string)
          : undefined,
      deadline: c["deadline"] as string | Date | undefined,
      priority:
        c["priority"] === "Low" ||
        c["priority"] === "Medium" ||
        c["priority"] === "High" ||
        c["priority"] === "Critical"
          ? (c["priority"] as "Low" | "Medium" | "High" | "Critical")
          : undefined,
      feedback:
        (c["feedback"] as { rating?: number; comment?: string } | null) ?? null,
    } as AssignedComplaintLite;
  });
}

// Admin: fetch users with optional role and department filters
export type UserDto = {
  isRejected: unknown;
  username: string;
  _id: string;
  fullName?: string;
  name?: string;
  email: string;
  role: string;
  previousRole?: string;
  isActive?: boolean;
  isApproved?: boolean;
  department?: string;
  createdAt?: string | Date;
};

export async function getAllUsersApi(opts?: {
  role?: string;
  department?: string;
}): Promise<UserDto[]> {
  const params = new URLSearchParams();
  if (opts?.role) params.set("role", opts.role);
  if (opts?.department) params.set("department", opts.department);
  const url =
    `${API_BASE}/admin/users` +
    (params.toString() ? `?${params.toString()}` : "");
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch users");
  return data as UserDto[];
}

// Lightweight API client used by other api helper modules (e.g. categoryApi)
// Provides consistent error handling and credential inclusion.
// Allow any serialisable JSON body (kept loose to avoid friction in callers)
type JsonBody = Record<string, unknown> | unknown[] | undefined;
type ParsedJson = unknown;

async function request<T = ParsedJson>(
  method: string,
  path: string,
  body?: JsonBody
): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  let data: ParsedJson = null;
  try {
    data = await res.json();
  } catch (_) {
    // ignore json parse error, keep data null
  }
  // Special handling: bubble up inactive-account for global handling
  if (res.status === 403 && data && typeof data === "object") {
    const maybe = data as { error?: string; message?: string };
    if (maybe.error === "inactive-account") {
      // Dispatch a global event so AuthContext can clear session
      const evt = new CustomEvent("auth:logout-with-reason", {
        detail: { reason: "👉 You are deactivated by Admin." },
      });
      window.dispatchEvent(evt);
      // Throw a recognizable error
      throw new Error("inactive-account");
    }
  }
  if (!res.ok) {
    let message = `Request failed (${method} ${path})`;
    if (data && typeof data === "object") {
      const maybeErr = data as { error?: unknown; message?: unknown };
      if (maybeErr.error && typeof maybeErr.error === "string") {
        message = maybeErr.error;
      } else if (maybeErr.message && typeof maybeErr.message === "string") {
        message = maybeErr.message;
      }
    }
    throw new Error(message);
  }
  return (data ?? undefined) as T;
}

export const apiClient = {
  get: <T = ParsedJson>(path: string) => request<T>("GET", path),
  post: <T = ParsedJson>(path: string, body?: unknown) =>
    request<T>("POST", path, body as JsonBody),
  patch: <T = ParsedJson>(path: string, body?: unknown) =>
    request<T>("PATCH", path, body as JsonBody),
  put: <T = ParsedJson>(path: string, body?: unknown) =>
    request<T>("PUT", path, body as JsonBody),
  delete: <T = ParsedJson>(path: string) => request<T>("DELETE", path),
};
