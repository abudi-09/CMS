import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, UserCheck, Save, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
  });
  
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
          <p className="text-muted-foreground">Manage your account information</p>
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
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="Enter your email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Username</Label>
            <Input
              value={user?.email?.split('@')[0] || ""}
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
              onClick={() => setFormData({
                name: user?.name || "",
                email: user?.email || "",
              })}
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
          <CardDescription>
            Your activity summary
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Member Since</p>
              <p className="text-lg font-semibold">
                {new Date().toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            
            {user?.role === "user" && (
              <>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Total Complaints</p>
                  <p className="text-lg font-semibold">12</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Resolved</p>
                  <p className="text-lg font-semibold text-success">8</p>
                </div>
              </>
            )}
            
            {user?.role === "staff" && (
              <>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Assigned Complaints</p>
                  <p className="text-lg font-semibold">25</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Resolved</p>
                  <p className="text-lg font-semibold text-success">18</p>
                </div>
              </>
            )}
            
            {user?.role === "admin" && (
              <>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Total Staff</p>
                  <p className="text-lg font-semibold">8</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">System Uptime</p>
                  <p className="text-lg font-semibold text-success">99.9%</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}