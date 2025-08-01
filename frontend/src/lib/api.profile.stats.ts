import { API_BASE } from "./api";

export async function getProfileStatsApi() {
  const res = await fetch(`${API_BASE}/profile`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch profile stats");
  return data;
}
