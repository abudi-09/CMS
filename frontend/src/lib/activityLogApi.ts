import { API_BASE } from "./api";

export async function getActivityLogsForComplaint(complaintId: string) {
  const res = await fetch(
    `${API_BASE}/activity-logs/complaint/${complaintId}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch activity logs");
  return data;
}

export async function getAllActivityLogs() {
  const res = await fetch(`${API_BASE}/activity-logs/all`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch activity logs");
  return data;
}
