import { useState, useMemo } from "react";
import { updateProfileApi, changePasswordApi } from "@/lib/api";
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
} from "lucide-react";
import { useNavigate } from "react-router-dom";

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

  // Basic placeholder stats (could be replaced with real stats API)
  const performanceData = useMemo(() => {
    if (user?.role === "staff") {
      return {
        totalAssigned: 0,
        resolved: 0,
        inProgress: 0,
        pending: 0,
        resolutionRate: 0,
        averageRating: 0,
        averageResolutionTime: "-",
        satisfactionRating: 0,
        completionRate: 0,
      };
    }
    return {
      totalComplaints: 0,
      resolved: 0,
      inProgress: 0,
      pending: 0,
      resolutionRate: 0,
    };
  }, [user]);

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
      auth.setUserName?.(updated.name || formData.name);
      auth.updateUserProfile?.({
        phone: updated.phone,
        address: updated.address,
        bio: updated.bio,
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
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
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
                  <Avatar className="h-24 w-24 bg-muted">
                    {user?.role === "admin" ? (
                      <Shield className="h-10 w-10 text-primary absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                    ) : user?.role === "staff" ? (
                      <UserCheck className="h-10 w-10 text-primary absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                    ) : (
                      <User className="h-10 w-10 text-primary absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                    )}
                  </Avatar>

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
          ) : (
            user?.role !== "dean" && (
              <Card>
                <CardHeader>
                  <CardTitle>Account Statistics</CardTitle>
                  <CardDescription>Your activity summary</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {user?.role === "admin"
                          ? "Total Staff"
                          : "Total Complaints"}
                      </p>
                      <p className="text-lg font-semibold">
                        {user?.role === "admin"
                          ? "8"
                          : performanceData.totalComplaints}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Resolved</p>
                      <p className="text-lg font-semibold text-green-600">
                        {performanceData.resolved}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {user?.role === "admin"
                          ? "System Uptime"
                          : "Success Rate"}
                      </p>
                      <p className="text-lg font-semibold text-green-600">
                        {user?.role === "admin"
                          ? "99.9%"
                          : `${performanceData.resolutionRate}%`}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          )}
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
