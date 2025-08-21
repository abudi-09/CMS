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

export type UserRole = "user" | "staff" | "admin" | "dean" | "headOfDepartment";
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

  // Restore user session and fetch staff data
  useEffect(() => {
    async function restoreSessionAndFetchStaff() {
      try {
        // Try to restore user session
        const me = await getMeApi();
        setUser({
          id: me._id,
          username: me.username || "",
          name: me.fullName || me.username || me.name || "",
          email: me.email,
          role: me.role,
          fullName: me.fullName,
          department: me.department,
          status: me.isApproved ? "approved" : "pending",
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
        } else if (me.role === "headOfDepartment") {
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
      const role = success.role as UserRole;
      setUser({
        id: success._id,
        username: success.username || "",
        name: success.fullName || success.username || success.name || "",
        email: success.email,
        role,
        fullName: success.fullName,
        department: success.department,
        status: success.isApproved ? "approved" : "pending",
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
    if (user?.role === "headOfDepartment") {
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
    if (user?.role === "headOfDepartment") {
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
    if (user?.role !== "headOfDepartment") return;
    await hodDeactivateStaffApi(staffId);
  }
  async function hodReactivateStaff(staffId: string) {
    if (user?.role !== "headOfDepartment") return;
    await hodReactivateStaffApi(staffId);
  }

  const getAllStaff = () => allStaff;

  const logout = () => {
    setUser(null);
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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
