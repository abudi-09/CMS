import { useState } from "react";
import { signupApi } from "@/lib/api";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Eye, EyeOff, Loader2, UserPlus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
    department: "",
    workingPlace: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Full name is required";
    if (!formData.username.trim()) newErrors.username = "Username is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (!validateEmail(formData.email))
      newErrors.email = "Invalid email format";
    if (!formData.password) newErrors.password = "Password is required";
    if (formData.password.length < 6)
      newErrors.password = "Password must be at least 6 characters";
    if (!formData.confirmPassword)
      newErrors.confirmPassword = "Please confirm your password";
    if (
      formData.password &&
      formData.confirmPassword &&
      formData.password !== formData.confirmPassword
    )
      newErrors.confirmPassword = "Passwords do not match";
    if (!formData.role) newErrors.role = "Please select a role";
    if (
      (formData.role === "user" ||
        formData.role === "dean" ||
        formData.role === "headOfDepartment") &&
      !formData.department.trim()
    )
      newErrors.department = "Department is required";
    if (formData.role === "staff" && !formData.workingPlace.trim())
      newErrors.workingPlace = "Working place is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      await signupApi(formData);
      if (
        formData.role === "staff" ||
        formData.role.toLowerCase() === "staff"
      ) {
        toast({
          title: "Account Created Successfully",
          description:
            "Your account is pending admin approval. Please verify your email. You will be notified once approved.",
        });
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      } else if (
        formData.role === "dean" ||
        formData.role.toLowerCase() === "dean"
      ) {
        toast({
          title: "Account Created Successfully",
          description:
            "Dean account created. Please check your email to verify your account.",
        });
        navigate("/login");
      } else if (formData.role === "headOfDepartment") {
        toast({
          title: "Account Created Successfully",
          description:
            "Head of Department account created. Please check your email to verify your account.",
        });
        navigate("/login");
      } else {
        toast({
          title: "Account Created Successfully",
          description: "Please check your email to verify your account.",
        });
        navigate("/login");
      }
    } catch (error) {
      let message = "An error occurred during signup. Please try again.";
      if (
        error &&
        typeof error === "object" &&
        "message" in error &&
        typeof (error as { message?: unknown }).message === "string"
      ) {
        message = (error as { message: string }).message;
      }
      toast({
        title: "Signup Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));
    // Re-validate on change
    setErrors((prev) => {
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
      <Card className="w-full max-w-md shadow-lg bg-card text-card-foreground">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <UserPlus className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>
            Enter your information to create your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                type="text"
                aria-label="Full Name"
                autoComplete="name"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
                className={errors.name ? "border-destructive" : ""}
              />
              {touched.name && errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                type="text"
                aria-label="Username"
                autoComplete="username"
                placeholder="Choose a username"
                value={formData.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                onBlur={() =>
                  setTouched((prev) => ({ ...prev, username: true }))
                }
                className={errors.username ? "border-destructive" : ""}
              />
              {touched.username && errors.username && (
                <p className="text-sm text-destructive">{errors.username}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                aria-label="Email address"
                autoComplete="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                className={errors.email ? "border-destructive" : ""}
              />
              {touched.email && errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  aria-label="Password"
                  autoComplete="new-password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={(e) =>
                    handleInputChange("password", e.target.value)
                  }
                  onBlur={() =>
                    setTouched((prev) => ({ ...prev, password: true }))
                  }
                  className={`pr-10 ${
                    errors.password ? "border-destructive" : ""
                  }`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {touched.password && errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  aria-label="Confirm password"
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    handleInputChange("confirmPassword", e.target.value)
                  }
                  onBlur={() =>
                    setTouched((prev) => ({ ...prev, confirmPassword: true }))
                  }
                  className={`pr-10 ${
                    errors.confirmPassword ? "border-destructive" : ""
                  }`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {touched.confirmPassword && errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => handleInputChange("role", value)}
              >
                <SelectTrigger
                  className={errors.role ? "border-destructive" : ""}
                  aria-label="Select role"
                >
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="dean">Dean</SelectItem>
                  <SelectItem value="headOfDepartment">
                    Head of Department
                  </SelectItem>
                </SelectContent>
              </Select>
              {touched.role && errors.role && (
                <p className="text-sm text-destructive">{errors.role}</p>
              )}
            </div>
            {(formData.role === "user" ||
              formData.role === "headOfDepartment") && (
              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Input
                  id="department"
                  type="text"
                  aria-label="Department"
                  autoComplete="organization"
                  placeholder="Enter your department"
                  value={formData.department}
                  onChange={(e) =>
                    handleInputChange("department", e.target.value)
                  }
                  onBlur={() =>
                    setTouched((prev) => ({ ...prev, department: true }))
                  }
                  className={errors.department ? "border-destructive" : ""}
                />
                {touched.department && errors.department && (
                  <p className="text-sm text-destructive">
                    {errors.department}
                  </p>
                )}
              </div>
            )}
            {formData.role === "staff" && (
              <div className="space-y-2">
                <Label htmlFor="workingPlace">Working Place *</Label>
                <Input
                  id="workingPlace"
                  type="text"
                  aria-label="Working Place"
                  autoComplete="organization"
                  placeholder="Enter your working place"
                  value={formData.workingPlace}
                  onChange={(e) =>
                    handleInputChange("workingPlace", e.target.value)
                  }
                  onBlur={() =>
                    setTouched((prev) => ({ ...prev, workingPlace: true }))
                  }
                  className={errors.workingPlace ? "border-destructive" : ""}
                />
                {touched.workingPlace && errors.workingPlace && (
                  <p className="text-sm text-destructive">
                    {errors.workingPlace}
                  </p>
                )}
              </div>
            )}
            {formData.role === "dean" && (
              <div className="space-y-2">
                <Label htmlFor="department">
                  Department or Working Place *
                </Label>
                <Input
                  id="department"
                  type="text"
                  aria-label="Department or Working Place"
                  autoComplete="organization"
                  placeholder="Enter your department or working place"
                  value={formData.department}
                  onChange={(e) =>
                    handleInputChange("department", e.target.value)
                  }
                  onBlur={() =>
                    setTouched((prev) => ({ ...prev, department: true }))
                  }
                  className={errors.department ? "border-destructive" : ""}
                />
                {touched.department && errors.department && (
                  <p className="text-sm text-destructive">
                    {errors.department}
                  </p>
                )}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={
                isLoading ||
                Object.keys(errors).length > 0 ||
                !formData.name.trim() ||
                !formData.username.trim() ||
                !formData.email.trim() ||
                !formData.password ||
                !formData.confirmPassword ||
                !formData.role ||
                ((formData.role === "user" ||
                  formData.role === "headOfDepartment") &&
                  !formData.department.trim()) ||
                (formData.role === "staff" && !formData.workingPlace.trim())
              }
              aria-label="Create account"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-medium text-primary hover:underline"
              >
                Login here
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
