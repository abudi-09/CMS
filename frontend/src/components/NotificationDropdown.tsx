import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth/AuthContext";
import {
  getNotificationsApi, // unified API - returns unread only when unread=true
  type NotificationItem,
  openNotificationsEventSource,
  patchNotificationReadApi,
  patchAllNotificationsReadApi,
} from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export function NotificationDropdown() {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Track notifications we've already seen to avoid duplicate toasts
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const unreadCount = useMemo(
    () => items.filter((n) => !n.read).length,
    [items]
  );

  type MetaShape = {
    redirectPath?: string;
    complaintId?: string;
    status?: string;
    [key: string]: unknown;
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getNotificationsApi({
        page: 1,
        pageSize: 20,
        unread: false, // Load all notifications (read and unread)
      });
      setItems((prev) => {
        const next = res.items;
        const prevSeen = seenIdsRef.current;
        const currentIds = new Set<string>(next.map((n) => n._id));
        const newOnes = next.filter((n) => !prevSeen.has(n._id));
        seenIdsRef.current = currentIds;

        if (initializedRef.current && user?.role === "student") {
          for (const n of newOnes) {
            const meta: MetaShape = (n.meta as MetaShape) || {};
            const isResolved =
              n.type === "status" && meta.status === "Resolved";
            if (isResolved) {
              const redirect =
                typeof meta.redirectPath === "string"
                  ? meta.redirectPath
                  : undefined;
              const complaintId =
                typeof meta.complaintId === "string"
                  ? meta.complaintId
                  : undefined;

              const onClick = () => {
                if (redirect) {
                  const url = new URL(redirect, window.location.origin);
                  if (complaintId)
                    url.searchParams.set("complaintId", complaintId);
                  navigate(url.pathname + (url.search || ""));
                }
              };

              toast({ title: n.title, description: n.message, onClick });
            }
          }
        }

        if (!initializedRef.current) initializedRef.current = true;
        return next;
      });
    } catch (e) {
      console.warn("Failed to load notifications", e);
    } finally {
      setLoading(false);
    }
  }, [navigate, toast, user?.role]);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 60000);
    const es = openNotificationsEventSource((n) => {
      setItems((prev) => {
        if (prev.some((p) => p._id === n._id)) return prev;
        return [n, ...prev].slice(0, 50);
      });
    });
    return () => {
      window.clearInterval(id);
      es.close();
    };
  }, [load]);

  const markAsRead = async (id: string) => {
    try {
      await patchNotificationReadApi(id);
      setItems((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      ); // mark as read but keep in UI
    } catch (e) {
      console.warn("Failed to mark notification read", e);
    }
  };

  const handleNavigate = async (n: NotificationItem) => {
    const meta = n.meta || {};
    const redirect =
      typeof meta.redirectPath === "string" ? meta.redirectPath : undefined;
    const complaintId =
      typeof meta.complaintId === "string" ? meta.complaintId : undefined;
    try {
      if (!n.read) await markAsRead(n._id);
    } catch (e) {
      console.warn(
        "Failed to update notification read state before navigation",
        e
      );
    }
    if (redirect) {
      const url = new URL(redirect, window.location.origin);
      if (complaintId) url.searchParams.set("complaintId", complaintId);
      navigate(url.pathname + (url.search || ""));
    }
  };

  const markAllAsRead = async () => {
    try {
      await patchAllNotificationsReadApi();
      setItems((prev) => prev.map((n) => ({ ...n, read: true }))); // mark all as read but keep in UI
    } catch (e) {
      console.warn("Failed to mark all notifications read", e);
    }
  };

  const removeAndPersist = async (id: string) => {
    try {
      // Mark as read on the server so it won't return on reload
      await patchNotificationReadApi(id);
    } catch (e) {
      // Non-blocking: still remove locally for UX; it may reappear on next load if request failed
      console.warn("Failed to persist read state before removal", e);
    } finally {
      setItems((prev) => prev.filter((n) => n._id !== id));
    }
  };

  const getTimeAgo = (iso: string) => {
    const timestamp = new Date(iso);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - timestamp.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    // Removed auto-mark-as-read on dropdown open to prevent accidental marking
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 max-h-96 overflow-y-auto bg-popover border shadow-lg"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs"
            >
              Mark all read
            </Button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            {loading ? "Loading..." : "No notifications"}
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            {items.map((n) => (
              <div
                key={n._id}
                className={`p-3 border-b hover:bg-muted/50 cursor-pointer ${
                  !n.read ? "bg-muted/30" : ""
                }`}
                onClick={() => handleNavigate(n)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      {!n.read && (
                        <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {n.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getTimeAgo(n.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {!n.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(n._id);
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAndPersist(n._id);
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
