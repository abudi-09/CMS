import { useEffect, useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getUserPublicProfileApi } from "@/lib/api";
import { Calendar, Mail } from "lucide-react";

interface Props {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PublicProfile = Awaited<ReturnType<typeof getUserPublicProfileApi>>;

const roleLabel = (r?: string) => {
  if (!r) return "";
  const map: Record<string, string> = {
    student: "Student",
    user: "Student",
    staff: "Staff",
    hod: "Head of Department",
    headofdepartment: "Head of Department",
    dean: "Dean",
    admin: "Admin",
  };
  const k = r.toLowerCase();
  return map[k] || r;
};

export function UserProfileModal({ userId, open, onOpenChange }: Props) {
  const [data, setData] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !userId) return;
    let ignore = false;
    setLoading(true);
    setError(null);
    setData(null);
    getUserPublicProfileApi(userId)
      .then((res) => {
        if (!ignore) setData(res);
      })
      .catch((e) => {
        if (!ignore)
          setError(e instanceof Error ? e.message : "Failed to load profile");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [open, userId]);

  const initials = useMemo(() => {
    const name = data?.name || data?.username || data?.email || "U";
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  }, [data]);

  const joined = data?.memberSince
    ? new Date(data.memberSince).toLocaleDateString()
    : "-";

  const statBlocks = useMemo(() => {
    if (!data)
      return [] as Array<{
        label: string;
        value: string | number;
        accent?: string;
      }>;
    const arr: Array<{
      label: string;
      value: string | number;
      accent?: string;
    }> = [
      {
        label: "Submitted",
        value: data.submittedTotal || 0,
        accent: "text-blue-600",
      },
      {
        label: "Resolved (Submitted)",
        value: data.resolvedSubmitted || 0,
        accent: "text-green-600",
      },
    ];
    if (data.assignedTotal || data.resolvedAssigned) {
      arr.push({
        label: "Assigned",
        value: data.assignedTotal || 0,
        accent: "text-amber-600",
      });
      arr.push({
        label: "Resolved (Assigned)",
        value: data.resolvedAssigned || 0,
        accent: "text-emerald-600",
      });
    }
    const success = Math.round((data.successRate || 0) * 100) / 100;
    arr.push({
      label: "Success Rate",
      value: `${success}%`,
      accent: "text-purple-600",
    });
    return arr;
  }, [data]);

  const assetBase = (
    import.meta.env.VITE_API_BASE || "http://localhost:5000/api"
  ).replace(/\/api$/, "");
  const avatarUrl = data?.avatarUrl
    ? data.avatarUrl.startsWith("http")
      ? data.avatarUrl
      : `${assetBase}${data.avatarUrl}`
    : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md mx-auto sm:w-full sm:max-w-2xl">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-lg sm:text-xl">User Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 max-h-[70vh] overflow-y-auto">
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
              <p className="text-sm text-muted-foreground">
                Loading profile...
              </p>
            </div>
          )}
          {error && !loading && (
            <div className="text-center py-8">
              <p className="text-sm text-destructive bg-destructive/10 p-4 rounded-md">
                Failed to load profile: {error}
              </p>
            </div>
          )}
          {!loading && !error && data && (
            <>
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="flex justify-center sm:justify-start">
                  <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-2">
                    {avatarUrl && (
                      <AvatarImage
                        src={avatarUrl}
                        alt={data.name || data.email}
                      />
                    )}
                    <AvatarFallback className="text-lg sm:text-xl">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 space-y-3 text-center sm:text-left">
                  <h3 className="text-lg sm:text-xl font-semibold leading-tight">
                    {data.name || data.username || data.email}
                  </h3>
                  <div className="flex flex-wrap gap-2 items-center justify-center sm:justify-start">
                    <Badge variant="secondary" className="text-xs">
                      {roleLabel(data.role)}
                    </Badge>
                    {data.department && (
                      <Badge variant="outline" className="text-xs">
                        {data.department}
                      </Badge>
                    )}
                    {data.isActive === false && (
                      <Badge variant="destructive" className="text-xs">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 text-sm text-muted-foreground justify-center sm:justify-start">
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      <span className="break-all">{data.email}</span>
                    </span>
                    {joined !== "-" && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Joined {joined}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 grid-cols-2 sm:grid-cols-2 md:grid-cols-3">
                {statBlocks.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-lg border bg-card p-3 shadow-sm hover:shadow-md transition-shadow flex flex-col"
                  >
                    <span className="text-xs text-muted-foreground font-medium">
                      {s.label}
                    </span>
                    <span
                      className={`mt-1 text-lg sm:text-xl font-bold ${
                        s.accent || "text-foreground"
                      }`}
                    >
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex justify-end border-t">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="h-10 px-6"
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default UserProfileModal;
