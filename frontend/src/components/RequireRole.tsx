import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthContext";

type AllowedRole =
  | "student"
  | "staff"
  | "hod"
  | "headOfDepartment"
  | "dean"
  | "admin";

function normalizeRole(role?: string | null): AllowedRole | null {
  if (!role) return null;
  const r = role.toLowerCase();
  if (r === "headofdepartment" || r === "hod") return "hod";
  if (r === "student" || r === "staff" || r === "dean" || r === "admin")
    return r as AllowedRole;
  return r as AllowedRole;
}

export function RequireRole({
  allowed,
  children,
  fallback = "/login",
}: {
  allowed: AllowedRole[];
  children: React.ReactElement;
  fallback?: string;
}) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={fallback} replace state={{ from: location }} />;
  }

  const role = normalizeRole(user?.role || null);
  if (!role) {
    return <Navigate to={fallback} replace state={{ from: location }} />;
  }

  // Admin can access everything unless explicitly excluded by not being in allowed
  // Here we respect strict allowed list to prevent accidental overreach.
  if (!allowed.map(normalizeRole).includes(role)) {
    // Send users to a generic dashboard they have access to
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default RequireRole;
