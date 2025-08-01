import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  loginApi,
  getAllStaffApi,
  getPendingStaffApi,
  getMeApi,
} from "@/lib/api";

export type UserRole = "user" | "staff" | "admin";
export type StaffStatus = "pending" | "approved" | "rejected";

interface User {
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
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isCheckingAuth: boolean;
  pendingStaff: User[];
  approveStaff: (staffId: string) => void;
  rejectStaff: (staffId: string) => void;
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
          name: me.fullName || me.username || me.name || "",
          email: me.email,
          role: me.role,
          fullName: me.fullName,
          department: me.department,
          status: me.isApproved ? "approved" : "pending",
        });
      } catch (err) {
        setUser(null);
      }
      // Always fetch staff data for admin panel
      try {
        const [all, pending] = await Promise.all([
          getAllStaffApi(),
          getPendingStaffApi(),
        ]);
        setAllStaff(all);
        setPendingStaff(pending);
      } catch (err) {
        // Optionally handle error
      }
      setIsCheckingAuth(false);
    }
    restoreSessionAndFetchStaff();
  }, []);

  const login = async (email: string, password: string): Promise<any> => {
    try {
      const data = await loginApi(email, password);
      setUser({
        id: data._id,
        name: data.fullName || data.username || data.name || "",
        email: data.email,
        role: data.role,
        fullName: data.fullName,
        department: data.department,
        status: data.isApproved ? "approved" : "pending",
      });
      return data; // Return the backend response for status checks
    } catch (err: any) {
      // If backend returns a 403 for pending staff, surface the error
      if (err.message && err.message.includes("pending admin approval")) {
        return { error: "pending-approval" };
      }
      return false;
    }
  };

  const approveStaff = (staffId: string) => {
    setPendingStaff((prev) => prev.filter((s) => s.id !== staffId));
    setAllStaff((prev) =>
      prev.map((s) =>
        s.id === staffId ? { ...s, status: "approved" as StaffStatus } : s
      )
    );
  };

  const rejectStaff = (staffId: string) => {
    setPendingStaff((prev) => prev.filter((s) => s.id !== staffId));
    setAllStaff((prev) =>
      prev.map((s) =>
        s.id === staffId ? { ...s, status: "rejected" as StaffStatus } : s
      )
    );
  };

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

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
