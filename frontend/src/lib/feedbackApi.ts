const API_BASE = import.meta.env.VITE_API_BASE;

export async function getAllFeedbackApi() {
  const res = await fetch(`${API_BASE}/feedback/all`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch feedback");
  return data;
}

export async function getAdminTargetedFeedbackApi() {
  const res = await fetch(`${API_BASE}/feedback/admin/mine`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch feedback");
  return data;
}
