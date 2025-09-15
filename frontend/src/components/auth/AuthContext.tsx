import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  loginApi,
  type LoginSuccess,
  type LoginError,
  getAllStaffApi,
  getPendingStaffApi,
  getHodPendingStaffApi,
  getMeApi,
  approveStaffApi,
  rejectStaffApi,
  hodApproveStaffApi,
  hodRejectStaffApi,
  hodDeactivateStaffApi,
  hodReactivateStaffApi,
} from "@/lib/api";

export type UserRole =
  | "student" // new canonical student role
  | "user" // legacy alias
  | "staff"
  | "hod" // canonical head of department role (backend)
  | "headOfDepartment" // legacy alias
  | "dean"
  | "admin";
export type StaffStatus = "pending" | "approved" | "rejected";

interface User {
  username: string;
  id: string;
  name: string;
  email: string;
  role: UserRole;
  fullName?: string;
  department?: string;
  status?: StaffStatus;
  registeredDate?: Date;
  phone?: string;
  address?: string;
  bio?: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  login: (
    email: string,
    password: string
  ) => Promise<
    | {
        _id: string;
        fullName?: string;
        username?: string;
        name?: string;
        email: string;
        role: UserRole;
        department?: string;
        isApproved?: boolean;
      }
    | {
        error: "pending-approval" | "inactive-account" | "rejected-account";
        message?: string;
      }
    | false
  >;
  logout: () => void;
  isAuthenticated: boolean;
  isCheckingAuth: boolean;
  pendingStaff: User[];
  approveStaff: (staffId: string) => Promise<void>;
  rejectStaff: (staffId: string) => Promise<void>;
  getAllStaff: () => User[];
  getApprovedStaff: () => User[];
  setUserName?: (name: string) => void;
  updateUserProfile?: (updates: Partial<User>) => void;
  getLogoutReason?: () => string | null;
  clearLogoutReason?: () => void;
  logoutWithReason?: (reason: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface MockUser extends User {
  password: string;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [pendingStaff, setPendingStaff] = useState<User[]>([]);
  const [allStaff, setAllStaff] = useState<User[]>([]);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [logoutReason, setLogoutReason] = useState<string | null>(null);

  // Restore user session and fetch staff data
  useEffect(() => {
    async function restoreSessionAndFetchStaff() {
      try {
        // Try to restore user session
        const me = await getMeApi();

        // Normalize backend role to internal union

        const rawRole = (me.role || "").toLowerCase();
        let normRole: UserRole = "user";
        if (rawRole === "student" || rawRole === "user") normRole = "user";
        else if (rawRole === "staff") normRole = "staff";
        else if (rawRole === "hod" || rawRole === "headofdepartment")
          // normalize legacy/alternate values to canonical 'hod'
          normRole = "hod";
        else if (rawRole === "dean") normRole = "dean";
        else if (rawRole === "admin") normRole = "admin";
        setUser({
          id: me._id,
          username: me.username || "",
          name: me.fullName || me.name || me.username || "",
          email: me.email,
          role: normRole,
          fullName: me.fullName || me.name,
          department: me.department,
          status: me.isApproved ? "approved" : "pending",
          phone: me.phone,
          address: me.address,
          bio: me.bio,
          avatarUrl: me.avatarUrl,
        });
        // Fetch staff data depending on role
        if (me.role === "admin") {
          try {
            const [all, pending] = await Promise.all([
              getAllStaffApi(),
              getPendingStaffApi(),
            ]);
            setAllStaff(all);
            setPendingStaff(pending);
          } catch (e) {
            console.error("Failed to fetch admin staff lists", e);
          }
        } else if (me.role === "hod") {
          try {
            const pending = await getHodPendingStaffApi();
            // Map to User shape minimally
            const mapped = pending.map((p) => ({
              id: p._id,
              username: p.username || p.email,
              name: p.fullName || p.name || p.username || p.email,
              email: p.email,
              role: "staff" as UserRole,
              department: p.department,
              status: "pending" as StaffStatus,
            }));
            setPendingStaff(mapped);
          } catch (e) {
            console.error("Failed to fetch HoD pending staff", e);
          }
        }
      } catch (err) {
        setUser(null);
      }
      setIsCheckingAuth(false);
    }
    restoreSessionAndFetchStaff();
  }, []);

  // Listen for global forced logout events (e.g., from API layer)
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ reason?: string }>;
      const reason = ce.detail?.reason || "Account Deactivated by the admin";
      setUser(null);
      setLogoutReason(reason);
    };
    window.addEventListener(
      "auth:logout-with-reason",
      handler as EventListener
    );
    return () =>
      window.removeEventListener(
        "auth:logout-with-reason",
        handler as EventListener
      );
  }, []);

  const login = async (
    email: string,
    password: string
  ): Promise<(LoginSuccess & { role: UserRole }) | LoginError | false> => {
    try {
      const data = await loginApi(email, password);
      // If API returned a structured error object, don't set user; propagate it
      if (
        data &&
        typeof data === "object" &&
        "error" in data &&
        (data as { error?: string }).error
      ) {
        return data as LoginError;
      }
      // Success path: persist user
      const success = data as LoginSuccess;
      // Normalize login role
      const rawRole = (success.role || "").toLowerCase();

      let role: UserRole = "user";
      if (rawRole === "student" || rawRole === "user") role = "user";
      else if (rawRole === "staff") role = "staff";
      else if (rawRole === "hod" || rawRole === "headofdepartment")
        // normalize to canonical 'hod'
        role = "hod";
      else if (rawRole === "dean") role = "dean";
      else if (rawRole === "admin") role = "admin";
      const successWithAvatar = success as LoginSuccess & {
        avatarUrl?: string;
      };
      setUser({
        id: success._id,
        username: success.username || "",
        name: success.fullName || success.name || success.username || "",
        email: success.email,
        role,
        fullName: success.fullName,
        department: success.department,
        status: success.isApproved ? "approved" : "pending",
        phone: success.phone,
        address: success.address,
        bio: success.bio,
        avatarUrl: successWithAvatar.avatarUrl,
      });
      return { ...success, role };
    } catch (err: unknown) {
      // If backend returns a 403 for pending staff, surface the error
      if (
        typeof err === "object" &&
        err !== null &&
        "message" in err &&
        typeof (err as { message?: string }).message === "string" &&
        (err as { message: string }).message.includes("pending admin approval")
      ) {
        return { error: "pending-approval" };
      }
      return false;
    }
  };

  const approveStaff = async (staffId: string) => {
    if (user?.role === "hod") {
      await hodApproveStaffApi(staffId);
      const pending = await getHodPendingStaffApi();
      const mapped = pending.map((p) => ({
        id: p._id,
        username: p.username || p.email,
        name: p.fullName || p.name || p.username || p.email,
        email: p.email,
        role: "staff" as UserRole,
        department: p.department,
        status: "pending" as StaffStatus,
      }));
      setPendingStaff(mapped);
    } else {
      await approveStaffApi(staffId);
      const [all, pending] = await Promise.all([
        getAllStaffApi(),
        getPendingStaffApi(),
      ]);
      setAllStaff(all);
      setPendingStaff(pending);
    }
  };

  const rejectStaff = async (staffId: string) => {
    if (user?.role === "hod") {
      await hodRejectStaffApi(staffId);
      const pending = await getHodPendingStaffApi();
      const mapped = pending.map((p) => ({
        id: p._id,
        username: p.username || p.email,
        name: p.fullName || p.name || p.username || p.email,
        email: p.email,
        role: "staff" as UserRole,
        department: p.department,
        status: "pending" as StaffStatus,
      }));
      setPendingStaff(mapped);
    } else {
      await rejectStaffApi(staffId);
      const [all, pending] = await Promise.all([
        getAllStaffApi(),
        getPendingStaffApi(),
      ]);
      setAllStaff(all);
      setPendingStaff(pending);
    }
  };

  // HoD: convenience helpers for deactivation/reactivation of approved staff
  async function hodDeactivateStaff(staffId: string) {
    if (user?.role !== "hod") return;
    await hodDeactivateStaffApi(staffId);
  }
  async function hodReactivateStaff(staffId: string) {
    if (user?.role !== "hod") return;
    await hodReactivateStaffApi(staffId);
  }

  const getAllStaff = () => allStaff;

  const getApprovedStaff = () => {
    try {
      return allStaff.filter((s) => {
        const rec = s as unknown as Record<string, unknown>;
        const status = String(rec["status"] ?? "").toLowerCase();
        if (status === "approved" || status === "active") return true;
        if (rec["isApproved"] === true) return true;
        if (rec["approved"] === true) return true;
        if (rec["isActive"] === true) return true;
        return false;
      });
    } catch (e) {
      return [];
    }
  };

  const logout = () => {
    setUser(null);
    setLogoutReason((prev) => prev ?? null);
  };

  const logoutWithReason = (reason: string) => {
    setUser(null);
    setLogoutReason(reason || "Account Deactivated by the admin");
  };

  const setUserName = (name: string) => {
    setUser((prev) => (prev ? { ...prev, name, fullName: name } : prev));
  };

  const updateUserProfile = (updates: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
        isCheckingAuth,
        pendingStaff,
        approveStaff,
        rejectStaff,
        getAllStaff,
        getApprovedStaff,
        setUserName,
        updateUserProfile,
        getLogoutReason: () => logoutReason,
        clearLogoutReason: () => setLogoutReason(null),
        logoutWithReason,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Safe fallback to avoid crashes during HMR or isolated renders
    return {
      user: null,
      login: async () => false,
      logout: () => void 0,
      isAuthenticated: false,
      isCheckingAuth: false,
      pendingStaff: [],
      approveStaff: async () => void 0,
      rejectStaff: async () => void 0,
      getAllStaff: () => [],
      getApprovedStaff: () => [],
      setUserName: () => void 0,
      updateUserProfile: () => void 0,
      getLogoutReason: () => null,
      clearLogoutReason: () => void 0,
      logoutWithReason: () => void 0,
    } as AuthContextType;
  }
  return context;
}
