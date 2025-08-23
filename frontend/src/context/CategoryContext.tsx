import React, { createContext, useState, ReactNode, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import {
  fetchCategoriesApi,
  createCategoryApi,
  updateCategoryApi,
  deleteCategoryApi,
} from "@/lib/categoryApi";

export interface Category {
  _id: string;
  name: string;
  roles: string[];
  description?: string;
  status?: "active" | "inactive";
}

interface CategoryContextType {
  categories: Category[];
  refresh: () => Promise<void>;
  addCategory: (name: string, roles?: string[]) => Promise<Category | null>;
  updateCategory: (
    id: string,
    updates: {
      name?: string;
      roles?: string[];
      description?: string;
      status?: "active" | "inactive";
    }
  ) => Promise<Category | null>;
  deleteCategory: (id: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

export const CategoryContext = createContext<CategoryContextType | undefined>(
  undefined
);

export const CategoryProvider = ({ children }: { children: ReactNode }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Map frontend union to backend canonical roles
  const backendRole = React.useMemo(() => {
    if (!user) return null;
    switch (user.role) {
      case "user":
        return "student"; // treat generic user as student for category filtering
      case "headOfDepartment":
        return "hod";
      default:
        return user.role; // staff, hod, dean, admin already fine (hod mapped above)
    }
  }, [user]);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      // Admin sees all categories (active + inactive, all roles)
      const queryOpts =
        user?.role === "admin"
          ? undefined
          : { role: backendRole || undefined, status: "active" as const };
      const data = await fetchCategoriesApi(queryOpts);
      if (user?.role === "admin") {
        setCategories(Array.isArray(data) ? data : []);
      } else {
        // Extra safety: client-side filter (in case backend returns broader set)
        const filtered = Array.isArray(data)
          ? data.filter(
              (c) =>
                c.status !== "inactive" &&
                (!backendRole ||
                  !c.roles?.length ||
                  c.roles.includes(backendRole))
            )
          : [];
        setCategories(filtered);
      }
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? (e as { message?: string }).message
          : undefined;
      setError(msg || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // reload whenever role changes (login/logout)
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendRole]);

  const addCategory = async (name: string, roles: string[] = []) => {
    try {
      const created = await createCategoryApi({ name, roles });
      setCategories((prev) => [...prev, created]);
      return created;
    } catch (e) {
      return null;
    }
  };

  const updateCategory = async (
    id: string,
    updates: {
      name?: string;
      roles?: string[];
      description?: string;
      status?: "active" | "inactive";
    }
  ) => {
    try {
      const updated = await updateCategoryApi(id, updates);
      setCategories((prev) => prev.map((c) => (c._id === id ? updated : c)));
      return updated;
    } catch {
      return null;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await deleteCategoryApi(id);
      setCategories((prev) => prev.filter((c) => c._id !== id));
      return true;
    } catch {
      return false;
    }
  };

  return (
    <CategoryContext.Provider
      value={{
        categories,
        refresh: load,
        addCategory,
        updateCategory,
        deleteCategory,
        loading,
        error,
      }}
    >
      {children}
    </CategoryContext.Provider>
  );
};
