import { useState, useMemo, useEffect, useRef } from "react";
import {
  updateProfileApi,
  changePasswordApi,
  uploadAvatarApi,
  saveCloudAvatarApi,
  resetAvatarApi,
  getMyStaffStatsApi,
  listMyAssignedComplaintsApi,
  getStaffFeedbackApi,
  getRoleCountsApi,
  getHodComplaintStatsApi,
} from "@/lib/api";
import type { StaffStats, AssignedComplaintLite } from "@/lib/api";
import { getProfileStatsApi } from "@/lib/api.profile.stats";
import { uploadAvatarFile } from "@/lib/cloudinaryAvatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/auth/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  Mail,
  UserCheck,
  Save,
  ArrowLeft,
  Edit,
  Phone,
  MapPin,
  Calendar,
  Star,
  Target,
  Clock,
  Award,
  Shield,
  Lock,
  CheckCircle,
  Pencil,
  RotateCcw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getMyComplaintsApi } from "@/lib/api";
import type { Complaint as FullComplaint } from "@/components/ComplaintCard";

// Helper to format role labels
const formatRole = (role?: string) => {
  if (!role) return "";
  const map: Record<string, string> = {
    student: "Student",
    user: "Student",
    staff: "Staff",
    hod: "Head of Department",
    headOfDepartment: "Head of Department",
    dean: "Dean",
    admin: "Admin",
  };
  return map[role] || role;
};

// Lightweight complaint subset for stats alignment
interface MiniComplaint {
  status: string;
  submittedDate?: string | Date;
}

export function Profile() {
  type AuthWithSetter = ReturnType<typeof useAuth> & {
    setUserName?: (name: string) => void;
  };
  const auth = useAuth() as AuthWithSetter;
  const { user } = auth;
  const { toast } = useToast();
  const navigate = useNavigate();

  // Derive live profile data from authenticated user
  const profileData = useMemo(() => {
    return {
      name: user?.fullName || user?.name || user?.username || "",
      email: user?.email || "",
      department: user?.department || "",
      role: user?.role,
      joinDate: user?.registeredDate
        ? String(user.registeredDate)
        : new Date().toISOString(),
      phone: user?.phone || "",
      address: user?.address || "",
      bio: user?.bio || "",
    };
  }, [user]);

  interface UserWithAvatar {
    avatarUrl?: string;
  }
  const userWithAvatar = user as typeof user & UserWithAvatar;

  // Build absolute avatar URL if backend returned a relative path like /uploads/avatars/xyz.png
  const assetBase = (
    import.meta.env.VITE_API_BASE || "http://localhost:5000/api"
  ).replace(/\/api$/, "");
  const avatarSrc = userWithAvatar?.avatarUrl
    ? userWithAvatar.avatarUrl.startsWith("http")
      ? userWithAvatar.avatarUrl
      : `${assetBase}${userWithAvatar.avatarUrl}`
    : undefined;

  // Stats state
  const [stats, setStats] = useState({
    totalComplaints: 0,
    resolvedComplaints: 0,
    inProgressComplaints: 0,
    pendingComplaints: 0,
    successRate: 0,
  });
  const [roleCounts, setRoleCounts] = useState<null | {
    deans: number;
    departmentHeads: number;
    students: number;
    staff: number;
  }>(null);

  // Staff-specific performance data
  const [staffPerf, setStaffPerf] = useState({
    totalAssigned: 0,
    resolved: 0,
    inProgress: 0,
    pending: 0,
    resolutionRate: 0,
    averageRating: 0,
    averageResolutionTime: "-",
  });

  const [myComplaints, setMyComplaints] = useState<MiniComplaint[]>([]);
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const data = await getMyComplaintsApi().catch(() => []);
        if (!ignore && Array.isArray(data)) {
          const mapped: MiniComplaint[] = (data as unknown[]).map(
            (c: unknown) => {
              const complaint = c as {
                status?: string;
                createdAt?: string;
                submittedDate?: string;
              };
              return {
                status: complaint.status || "Pending",
                submittedDate: complaint.createdAt || complaint.submittedDate,
              };
            }
          );
          setMyComplaints(mapped);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);
  const alignedUserStats = useMemo(() => {
    if (!Array.isArray(myComplaints) || !myComplaints.length) return null;
    const TOTAL = myComplaints.length;
    const ACTIVE = ["Assigned", "Accepted", "In Progress", "Under Review"];
    const pending = myComplaints.filter((c) => c.status === "Pending").length;
    const inProgress = myComplaints.filter((c) =>
      ACTIVE.includes(c.status)
    ).length;
    const resolved = myComplaints.filter((c) => c.status === "Resolved").length;
    const successRate = TOTAL ? Math.round((resolved / TOTAL) * 100) : 0;
    return { TOTAL, pending, inProgress, resolved, successRate };
  }, [myComplaints]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        // If the logged-in user is a HoD, use the HoD-scoped stats endpoint
        if (user && (user.role === "hod" || user.role === "headOfDepartment")) {
          const d = await getHodComplaintStatsApi();
          if (!ignore && d && typeof d === "object") {
            const total = d.total ?? 0;
            const resolved = d.resolved ?? 0;
            const inProg = d.inProgress ?? 0;
            const pending = d.pending ?? 0;
            const success = total ? Math.round((resolved / total) * 100) : 0;
            setStats({
              totalComplaints: total,
              resolvedComplaints: resolved,
              inProgressComplaints: inProg,
              pendingComplaints: pending,
              successRate: success,
            });
          }
          return;
        }

        // Fallback: user-scoped/profile stats for non-HoD roles
        const data = await getProfileStatsApi();
        if (!ignore) {
          // Some endpoints may return alternative field names; normalize them.
          const total =
            data.totalComplaints ?? data.submittedTotal ?? data.total ?? 0;
          const resolved =
            data.resolvedComplaints ??
            data.resolvedSubmitted ??
            data.resolved ??
            0;
          const inProg = data.inProgressComplaints ?? data.inProgress ?? 0;
          const pending = data.pendingComplaints ?? data.pending ?? 0;
          const success =
            data.successRate ??
            (total ? Number(((resolved / total) * 100).toFixed(2)) : 0);
          setStats({
            totalComplaints: total,
            resolvedComplaints: resolved,
            inProgressComplaints: inProg,
            pendingComplaints: pending,
            successRate: success,
          });
        }
      } catch (_) {
        // Silently ignore stats load failure
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [user]);
  useEffect(() => {
    if (user?.role !== "admin") return;
    let ignore = false;
    getRoleCountsApi()
      .then((rc) => {
        if (!ignore) setRoleCounts(rc);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [user?.role]);

  const performanceData = useMemo(() => {
    if (user?.role === "staff") {
      return {
        totalAssigned: staffPerf.totalAssigned,
        resolved: staffPerf.resolved,
        inProgress: staffPerf.inProgress,
        pending: staffPerf.pending,
        resolutionRate: staffPerf.resolutionRate,
        averageRating: staffPerf.averageRating,
        averageResolutionTime: staffPerf.averageResolutionTime,
        satisfactionRating: staffPerf.averageRating, // alias for now
        completionRate: staffPerf.resolutionRate,
      };
    }
    return {
      totalComplaints: stats.totalComplaints,
      resolved: stats.resolvedComplaints,
      inProgress: stats.inProgressComplaints,
      pending: stats.pendingComplaints,
      resolutionRate: stats.successRate,
    };
  }, [user, stats, staffPerf]);

  // Helpers
  const formatAvgDuration = (ms: number): string => {
    if (!Number.isFinite(ms) || ms <= 0) return "-";
    const minutes = Math.round(ms / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remMin = minutes % 60;
    if (hours < 24) return remMin ? `${hours}h ${remMin}m` : `${hours}h`;
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return remHours ? `${days}d ${remHours}h` : `${days}d`;
  };

  // Load staff workload + performance when role is staff
  useEffect(() => {
    if (user?.role !== "staff") return;
    let ignore = false;
    (async () => {
      try {
        type FeedbackItem = { feedback?: { rating?: number } | null };
        const workload: StaffStats = await getMyStaffStatsApi().catch(() => ({
          assigned: 0,
          pending: 0,
          inProgress: 0,
          resolved: 0,
        }));
        const assigned: AssignedComplaintLite[] =
          await listMyAssignedComplaintsApi().catch(() => []);
        const feedback: FeedbackItem[] = await getStaffFeedbackApi().catch(
          () => []
        );

        // Resolution rate
        const totalAssigned = Math.max(0, Number(workload.assigned || 0));
        const resolved = Math.max(0, Number(workload.resolved || 0));
        const inProgress = Math.max(0, Number(workload.inProgress || 0));
        const pending = Math.max(0, Number(workload.pending || 0));
        const resolutionRate =
          totalAssigned > 0 ? Math.round((resolved / totalAssigned) * 100) : 0;

        // Average rating from feedback
        const ratings: number[] = Array.isArray(feedback)
          ? feedback
              .map((f) => Number(f?.feedback?.rating))
              .filter((n) => Number.isFinite(n) && n > 0)
          : [];
        const avgRating = ratings.length
          ? Math.round(
              (ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10
            ) / 10
          : 0;

        // Average resolution time from assigned list (Resolved only)
        const resolvedItems: AssignedComplaintLite[] = Array.isArray(assigned)
          ? assigned.filter((c) => String(c.status) === "Resolved")
          : [];
        const durations = resolvedItems
          .map((c) => {
            const start = c.submittedDate
              ? new Date(c.submittedDate).getTime()
              : undefined;
            const endRaw = c.resolvedAt ?? c.lastUpdated;
            const end = endRaw ? new Date(endRaw).getTime() : undefined;
            if (!start || !end || end < start) return null;
            return end - start;
          })
          .filter((ms): ms is number => typeof ms === "number");
        const avgMs = durations.length
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          : 0;

        if (!ignore) {
          setStaffPerf({
            totalAssigned,
            resolved,
            inProgress,
            pending,
            resolutionRate,
            averageRating: avgRating,
            averageResolutionTime: formatAvgDuration(avgMs),
          });
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      ignore = true;
    };
  }, [user?.role]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Allow avatar editing for all authenticated roles now (previously only student/user)
  const canEditAvatar = !!user?.role; // if needed, could refine with explicit list
  // Progress animation state
  const [uploadPctDisplay, setUploadPctDisplay] = useState<number | null>(null);
  const [uploadPctTarget, setUploadPctTarget] = useState<number | null>(null);
  const progressAnimRef = useRef<number | null>(null);
  const fallbackSimIntervalRef = useRef<number | null>(null);
  const completedRef = useRef<boolean>(false); // prevent double 0->100 runs
  const [formData, setFormData] = useState({
    name: profileData.name,
    phone: profileData.phone,
    address: profileData.address,
    bio: profileData.bio,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      const updated = await updateProfileApi({
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        bio: formData.bio,
      });
      // API returns { user: ... }, so access updated.user
      const userData = (
        updated as {
          user?: {
            name?: string;
            phone?: string;
            address?: string;
            bio?: string;
          };
        }
      ).user;
      auth.setUserName?.(userData?.name || formData.name);
      auth.updateUserProfile?.({
        phone: userData?.phone,
        address: userData?.address,
        bio: userData?.bio,
      });
      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: "Your profile information has been successfully updated.",
      });
    } catch (e) {
      toast({
        title: "Update Failed",
        description: "Could not update profile.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSave = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toast({
        title: "Missing Fields",
        description: "Please fill current and new password.",
        variant: "destructive",
      });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Weak Password",
        description: "New password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirm password do not match.",
        variant: "destructive",
      });
      return;
    }
    try {
      setIsLoading(true);
      await changePasswordApi({
        oldPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      toast({
        title: "Password Updated",
        description: "Your password has been successfully changed.",
      });
    } catch (e) {
      toast({
        title: "Update Failed",
        description:
          (e && typeof e === "object" && "message" in e
            ? (e as { message: string }).message
            : undefined) || "Failed to change password.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum size is 2MB",
        variant: "destructive",
      });
      return;
    }
    try {
      setIsLoading(true);
      completedRef.current = false;
      let finalUrl: string | undefined;
      // Attempt direct Cloudinary unsigned upload first
      try {
        const direct = await uploadAvatarFile(file, {
          onProgress: (p) => {
            setUploadPctTarget(p);
            if (uploadPctDisplay === null) setUploadPctDisplay(0);
            if (p >= 100) completedRef.current = true;
          },
        });
        // Persist with backend (stores publicId and handles old delete)
        const saved = await saveCloudAvatarApi({
          avatarUrl: direct.url,
          publicId: direct.publicId,
        });
        finalUrl = saved.avatarUrl;
        completedRef.current = true;
      } catch (directErr) {
        // Fallback to backend multipart pipeline
        console.warn(
          "[Profile] Direct Cloudinary avatar upload failed, falling back:",
          directErr
        );
        // simulate progress to ~90% while backend processes
        if (uploadPctDisplay === null) setUploadPctDisplay(0);
        setUploadPctTarget(15);
        if (fallbackSimIntervalRef.current)
          window.clearInterval(fallbackSimIntervalRef.current);
        fallbackSimIntervalRef.current = window.setInterval(() => {
          setUploadPctTarget((prev) => {
            if (prev == null) return 0;
            if (prev < 90) return prev + 2.5;
            return prev;
          });
        }, 160);
        const legacy = await uploadAvatarApi(file);
        finalUrl = legacy.avatarUrl;
        completedRef.current = true; // will jump to 100 in finally
      }
      if (finalUrl) {
        auth.updateUserProfile?.({ avatarUrl: finalUrl });
        toast({
          title: "Avatar Updated",
          description: "Profile picture changed.",
        });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not upload avatar";
      toast({
        title: "Upload Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      if (fallbackSimIntervalRef.current) {
        window.clearInterval(fallbackSimIntervalRef.current);
        fallbackSimIntervalRef.current = null;
      }
      // Only force to 100 if not already reached (prevents second count)
      if (!completedRef.current) {
        if (uploadPctDisplay === null) setUploadPctDisplay(0);
        setUploadPctTarget(100);
        completedRef.current = true;
      }
      // Clear progress after short delay
      setTimeout(() => {
        setUploadPctTarget(null);
        setUploadPctDisplay(null);
        completedRef.current = false;
      }, 1000);
    }
  };

  const handleAvatarReset = async () => {
    try {
      setIsLoading(true);
      await resetAvatarApi();
      auth.updateUserProfile?.({ avatarUrl: "" });
      toast({
        title: "Avatar Reset",
        description: "Reverted to default profile picture.",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not reset avatar";
      toast({
        title: "Reset Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Animate progress toward target smoothly (we intentionally depend only on target; ignoring display to avoid restart loops)
  useEffect(() => {
    if (uploadPctTarget == null || uploadPctDisplay == null) return;
    if (progressAnimRef.current) cancelAnimationFrame(progressAnimRef.current);
    const step = () => {
      setUploadPctDisplay((curr) => {
        if (curr == null) return null;
        if (uploadPctTarget == null) return curr;
        if (curr >= uploadPctTarget) return curr; // stop advancing
        const delta = Math.max(0.5, (uploadPctTarget - curr) * 0.18 + 0.4);
        const next = Math.min(uploadPctTarget, curr + delta);
        return next;
      });
      // Continue only if not reached target yet
      progressAnimRef.current = requestAnimationFrame(step);
    };
    progressAnimRef.current = requestAnimationFrame(step);
    return () => {
      if (progressAnimRef.current)
        cancelAnimationFrame(progressAnimRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- uploadPctDisplay intentionally excluded to prevent animation restart loops
  }, [uploadPctTarget]);

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "staff":
        return "default";
      default:
        return "secondary";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating)
            ? "fill-yellow-400 text-yellow-400"
            : "text-gray-300"
        }`}
      />
    ));
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Profile Settings</h1>
          <p className="text-muted-foreground">
            Manage your account information and security
          </p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">Profile Information</TabsTrigger>
          <TabsTrigger value="security">Security Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Profile Card */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div
                    className={`relative ${
                      canEditAvatar && !isLoading ? "cursor-pointer" : ""
                    }`}
                    onClick={() => {
                      if (canEditAvatar && !isLoading)
                        fileInputRef.current?.click();
                    }}
                    title={
                      canEditAvatar
                        ? isLoading
                          ? "Uploading..."
                          : "Change profile picture"
                        : undefined
                    }
                    aria-label={
                      canEditAvatar ? "Change profile picture" : undefined
                    }
                  >
                    <Avatar
                      key={userWithAvatar?.avatarUrl || "no-avatar"}
                      className="h-24 w-24 bg-muted overflow-hidden relative"
                    >
                      {avatarSrc && (
                        <AvatarImage
                          src={avatarSrc}
                          alt={profileData.name}
                          className="object-cover"
                          onError={(e) => {
                            (
                              e.currentTarget as HTMLImageElement
                            ).style.display = "none";
                          }}
                        />
                      )}
                      <AvatarFallback className="flex items-center justify-center h-full w-full text-2xl font-semibold uppercase tracking-wide select-none text-gray-800 dark:text-gray-200">
                        {getInitials(
                          profileData.name ||
                            user?.fullName ||
                            user?.name ||
                            "U"
                        )}
                      </AvatarFallback>
                    </Avatar>
                    {canEditAvatar && (
                      <>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarChange}
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isLoading) fileInputRef.current?.click();
                          }}
                          className="absolute -bottom-2 -right-2 bg-white/95 rounded-full p-2 shadow hover:bg-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                          aria-label="Change profile picture"
                        >
                          <Pencil className="h-5 w-5 text-gray-700" />
                        </button>
                      </>
                    )}
                  </div>
                  {uploadPctDisplay !== null && (
                    <div className="w-full mt-2">
                      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-200"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(uploadPctDisplay)
                            )}%`,
                          }}
                        ></div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Uploading {Math.min(100, Math.round(uploadPctDisplay))}%
                      </p>
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-semibold">
                      {profileData.name}
                    </h3>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                      <Badge variant={getRoleBadgeVariant(user?.role || "")}>
                        {formatRole(user?.role)}
                      </Badge>
                    </div>
                  </div>
                </div>
                {canEditAvatar && (
                  <div className="pt-2 flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isLoading || !userWithAvatar?.avatarUrl}
                      onClick={handleAvatarReset}
                      className="flex items-center gap-1"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset Avatar
                    </Button>
                  </div>
                )}

                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{profileData.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{user?.phone || profileData.phone || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{user?.address || profileData.address || ""}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Joined{" "}
                      {new Date(profileData.joinDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Role-specific info */}
                {(user?.role === "student" ||
                  user?.role === "user" ||
                  user?.role === "staff" ||
                  user?.role === "hod" ||
                  user?.role === "dean") &&
                  profileData.department && (
                    <div className="space-y-2 pt-3 border-t">
                      <p className="text-sm text-muted-foreground">
                        Department
                      </p>
                      <p className="font-medium">{profileData.department}</p>
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* Editable Form */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Edit className="h-5 w-5" />
                    Personal Information
                  </CardTitle>
                  {!isEditing && (
                    <Button
                      onClick={() => setIsEditing(true)}
                      variant="outline"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  )}
                </div>
                <CardDescription>
                  Update your personal details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      disabled={!isEditing}
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      value={profileData.email}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Email cannot be changed
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        handleInputChange("phone", e.target.value)
                      }
                      disabled={!isEditing}
                      placeholder="Enter your phone number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) =>
                        handleInputChange("address", e.target.value)
                      }
                      disabled={!isEditing}
                      placeholder="Enter your address"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => handleInputChange("bio", e.target.value)}
                    disabled={!isEditing}
                    placeholder="Tell us about yourself"
                    className="min-h-20"
                  />
                </div>

                {isEditing && (
                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={handleSave}
                      disabled={isLoading}
                      className="flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {isLoading ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        setFormData({
                          name:
                            user?.fullName ||
                            user?.name ||
                            user?.username ||
                            "",
                          phone: user?.phone || "",
                          address: user?.address || "",
                          bio: user?.bio || "",
                        });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Performance/Statistics Section */}
          {user?.role === "staff" ? (
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Current Workload
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Resolved</span>
                    <Badge variant="secondary">
                      {performanceData.resolved}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">In Progress</span>
                    <Badge variant="default">
                      {performanceData.inProgress}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Pending</span>
                    <Badge variant="outline">{performanceData.pending}</Badge>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Total Assigned</span>
                      <span className="text-lg font-bold">
                        {performanceData.totalAssigned}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Resolution Rate</span>
                      <span className="font-medium">
                        {performanceData.resolutionRate}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${performanceData.resolutionRate}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Average Rating</span>
                    <div className="flex items-center gap-1">
                      {renderStars(performanceData.averageRating)}
                      <span className="ml-1 text-sm font-medium">
                        {performanceData.averageRating}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Avg. Resolution Time</span>
                    <span className="font-medium">
                      {performanceData.averageResolutionTime}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Manage your password and account security
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      handlePasswordChange("currentPassword", e.target.value)
                    }
                    placeholder="Enter your current password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      handlePasswordChange("newPassword", e.target.value)
                    }
                    placeholder="Enter your new password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      handlePasswordChange("confirmPassword", e.target.value)
                    }
                    placeholder="Confirm your new password"
                  />
                </div>

                <Button
                  onClick={handlePasswordSave}
                  disabled={
                    isLoading ||
                    !passwordData.currentPassword ||
                    !passwordData.newPassword
                  }
                  className="flex items-center gap-2"
                >
                  <Lock className="h-4 w-4" />
                  {isLoading ? "Updating..." : "Update Password"}
                </Button>
              </div>

              <div className="pt-6 border-t">
                <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      Account Security Status: Active
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      Your account is secure and all security measures are
                      active.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
