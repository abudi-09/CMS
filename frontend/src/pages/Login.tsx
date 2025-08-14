import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, GraduationCap } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import { toast } from "@/hooks/use-toast";

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailTouched(true);
    setPasswordTouched(true);
    if (!validateEmail(email) || password.length < 4) return;
    setIsLoading(true);
    setError("");

    try {
      const result = await login(email, password);
      if (
        result !== null &&
        typeof result === "object" &&
        result &&
        "error" in result &&
        (result as { error?: string }).error === "pending-approval"
      ) {
        toast({
          title: "🕒 Staff Not Approved Yet",
          description:
            (result as { message?: string }).message ||
            "Please wait, your account has not been approved by the admin yet.",
          variant: "default",
        });
        return;
      } else if (!result) {
        setError("Invalid email or password");
        toast({
          title: "Login Failed",
          description: "Invalid email or password.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "✅ Login Success",
          description: "Login successful! Redirecting to your dashboard...",
          variant: "default",
        });
        setTimeout(() => {
          // Redirect based on user role
          if (
            result !== null &&
            typeof result === "object" &&
            result &&
            "role" in result
          ) {
            type UserResult = { role: string };
            const role = (result as UserResult).role;
            if (role === "admin") {
              navigate("/dashboard");
            } else if (role === "staff") {
              navigate("/dashboard");
            } else if (role === "dean") {
              navigate("/dean-dashboard");
            } else {
              navigate("/dashboard");
            }
          } else {
            navigate("/");
          }
        }, 1000);
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      toast({
        title: "Login Error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white dark:bg-black">
      {/* Left side - Hero Image */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-primary dark:bg-black">
        <img
          src="https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=1200&h=800&fit=crop"
          alt="University Campus"
          className="object-cover w-full h-full dark:hidden"
        />
        {/* Blue overlay for light mode, black for dark mode */}
        <div className="absolute inset-0 bg-primary opacity-90 dark:opacity-100 dark:bg-black pointer-events-none" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white dark:text-[#FFD700] p-8 w-full">
            <GraduationCap className="h-20 w-20 mx-auto mb-6 text-white dark:text-primary" />
            <h1 className="text-4xl font-bold mb-4 text-white dark:text-foreground">
              Gondar University
            </h1>
            <p className="text-xl mb-2 text-white dark:text-foreground">
              Complaint Management System
            </p>
            <p className="text-lg opacity-90 text-white dark:text-foreground">
              Your voice matters. Let us help you resolve your concerns.
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white dark:bg-black">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:hidden">
            <GraduationCap className="h-16 w-16 mx-auto mb-4 text-primary" />
            <h1 className="text-3xl font-bold"> University Of Gondar </h1>
            <p className="text-muted-foreground">Complaint Management System</p>
          </div>

          <Card className="shadow-elegant">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Welcome Back</CardTitle>
              <CardDescription>
                Sign in to your account to continue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    aria-label="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setEmailTouched(true)}
                    placeholder="your.email@gondar.edu"
                    required
                    autoComplete="username"
                  />
                  {emailTouched && !validateEmail(email) && (
                    <span className="text-xs text-red-500">
                      Enter a valid email address.
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      aria-label="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => setPasswordTouched(true)}
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={0}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  {passwordTouched && password.length < 4 && (
                    <span className="text-xs text-red-500">
                      Password must be at least 4 characters.
                    </span>
                  )}
                </div>

                {error && (
                  <Alert className="border-destructive/50 text-destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 focus:bg-primary/90 border-none shadow-md dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/80 dark:focus:bg-primary/80"
                  disabled={
                    isLoading || !validateEmail(email) || password.length < 4
                  }
                  aria-label="Sign in"
                >
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Sign In
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <Link
                    to="/signup"
                    className="font-medium text-primary hover:underline"
                  >
                    Sign up here
                  </Link>
                </p>
              </div>

              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Demo Credentials:
                </p>
                <div className="text-xs text-muted-foreground mt-2 space-y-1">
                  <div>Student: student@gondar.eduu / password</div>
                  <div>Staff: staff@gondar.eduu / password</div>
                  <div>Admin: admin@gondar.eduu / password</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
