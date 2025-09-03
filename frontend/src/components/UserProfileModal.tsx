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
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {loading && (
            <p className="text-sm text-muted-foreground">Loading profile...</p>
          )}
          {error && !loading && (
            <p className="text-sm text-destructive">
              Failed to load profile: {error}
            </p>
          )}
          {!loading && !error && data && (
            <>
              <div className="flex gap-4 items-start">
                <Avatar className="h-20 w-20 border">
                  {avatarUrl && (
                    <AvatarImage
                      src={avatarUrl}
                      alt={data.name || data.email}
                    />
                  )}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <h3 className="text-xl font-semibold leading-tight">
                    {data.name || data.username || data.email}
                  </h3>
                  <div className="flex flex-wrap gap-2 items-center text-sm text-muted-foreground">
                    <Badge variant="secondary">{roleLabel(data.role)}</Badge>
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
                  <div className="flex flex-wrap gap-3 pt-2 text-sm">
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-4 w-4" /> {data.email}
                    </span>
                    {joined !== "-" && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-4 w-4" /> Joined {joined}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {statBlocks.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-lg border bg-card p-3 shadow-sm hover:shadow transition flex flex-col"
                  >
                    <span className="text-xs text-muted-foreground">
                      {s.label}
                    </span>
                    <span
                      className={`mt-1 text-lg font-semibold ${s.accent || ""}`}
                    >
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>
              <div className="pt-2 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
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
