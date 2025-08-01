import React, { useState } from "react";
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
import { useAuth } from "@/components/auth/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, UserCheck, Save, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { changePasswordApi } from "@/lib/api.profile";
import { getProfileStatsApi } from "@/lib/api.profile.stats";

export function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
  });

  // Profile stats state
  const [profileStats, setProfileStats] = useState<{
    memberSince?: string;
    totalComplaints?: number;
    resolvedComplaints?: number;
  }>({});
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");

  // Fetch real stats on mount
  React.useEffect(() => {
    setStatsLoading(true);
    getProfileStatsApi()
      .then((data) => {
        setProfileStats(data);
        setStatsLoading(false);
      })
      .catch((err) => {
        setStatsError(err.message || "Failed to load stats");
        setStatsLoading(false);
      });
  }, []);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [currentPasswordValid, setCurrentPasswordValid] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Real password check will be handled by backend on password change

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Remove current password blur check, handle on submit

  const handlePasswordChange = (field: string, value: string) => {
    if (field === "new") setNewPassword(value);
    if (field === "confirm") setConfirmPassword(value);
  };

  const validatePassword = () => {
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return false;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return false;
    }
    setPasswordError("");
    return true;
  };

  const handleSave = async () => {
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Profile Updated",
        description: "Your profile information has been successfully updated.",
      });
    }, 1000);
  };

  const handlePasswordSave = async () => {
    if (!validatePassword()) return;
    setIsLoading(true);
    try {
      await changePasswordApi(currentPassword, newPassword);
      setIsLoading(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setCurrentPasswordValid(false);
      setPasswordError("");
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully.",
      });
    } catch (err: any) {
      setIsLoading(false);
      setPasswordError(err.message || "Failed to change password");
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
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
            Manage your account information
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
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
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter your full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>
          </div>

          {/* Password Change Section */}
          <div className="space-y-2 pt-4">
            <Label htmlFor="current-password">Current Password</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter your current password"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => handlePasswordChange("new", e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) =>
                  handlePasswordChange("confirm", e.target.value)
                }
                placeholder="Confirm new password"
              />
            </div>
          </div>
          {passwordError && (
            <p className="text-xs text-destructive">{passwordError}</p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              onClick={handlePasswordSave}
              disabled={isLoading}
              className="flex items-center gap-2"
              variant="secondary"
            >
              <Save className="h-4 w-4" />
              {isLoading ? "Saving..." : "Change Password"}
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Username</Label>
            <Input
              value={user?.email?.split("@")[0] || ""}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Username cannot be changed
            </p>
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-muted-foreground" />
              <Badge variant={getRoleBadgeVariant(user?.role || "")}>
                {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Contact an administrator to change your role
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
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
              onClick={() =>
                setFormData({
                  name: user?.name || "",
                  email: user?.email || "",
                })
              }
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Account Statistics</CardTitle>
          <CardDescription>Your activity summary</CardDescription>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div>Loading...</div>
          ) : statsError ? (
            <div className="text-destructive">{statsError}</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Member Since</p>
                <p className="text-lg font-semibold">
                  {profileStats.memberSince || "-"}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Total Complaints
                </p>
                <p className="text-lg font-semibold">
                  {profileStats.totalComplaints ?? "-"}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="text-lg font-semibold text-success">
                  {profileStats.resolvedComplaints ?? "-"}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
