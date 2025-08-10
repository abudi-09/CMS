import { API_BASE } from "./api";

// Get a single complaint by ID
export async function getComplaintApi(complaintId: string) {
  const res = await fetch(`${API_BASE}/complaints/${complaintId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch complaint");
  return data.complaint || data;
}
