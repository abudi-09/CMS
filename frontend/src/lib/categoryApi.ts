import { apiClient } from "./api";

export interface CreateCategoryDTO {
  name: string;
  roles?: string[];
  description?: string;
  status?: "active" | "inactive";
}

// Fetch categories with optional role + status filtering.
// role should be one of backend canonical roles: student, staff, hod, dean, admin
export async function fetchCategoriesApi(options?: {
  role?: string | null;
  status?: "active" | "inactive";
}) {
  const params: string[] = [];
  if (options?.role) params.push(`role=${encodeURIComponent(options.role)}`);
  if (options?.status)
    params.push(`status=${encodeURIComponent(options.status)}`);
  const qs = params.length ? `?${params.join("&")}` : "";
  return await apiClient.get(`/categories${qs}`);
}

export async function createCategoryApi(dto: CreateCategoryDTO) {
  return await apiClient.post("/categories", dto);
}

export async function updateCategoryApi(
  id: string,
  dto: Partial<CreateCategoryDTO>
) {
  return await apiClient.patch(`/categories/${id}`, dto);
}

export async function deleteCategoryApi(id: string) {
  return await apiClient.delete(`/categories/${id}`);
}
