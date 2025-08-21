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
export async function getMeApi() {
  const res = await fetch(`${API_BASE}/auth/me`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Not authenticated");
  return data;
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
  let role = formData.role;
  // Only lowercase for staff, user, dean; keep headOfDepartment as is
  if (["user", "staff", "dean"].includes(role)) {
    role = role.toLowerCase();
  }
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
}

export async function submitComplaintApi(complaint: Complaint) {
  const res = await fetch(`${API_BASE}/complaints/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(complaint),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to submit complaint");
  return data.complaint || data;
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

// Admin: fetch users with optional role and department filters
export type UserDto = {
  username: string;
  _id: string;
  fullName?: string;
  name?: string;
  email: string;
  role: string;
  isActive?: boolean;
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
