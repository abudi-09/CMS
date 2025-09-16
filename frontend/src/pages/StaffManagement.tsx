import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserCheck, UserX, Users, RefreshCcw } from "lucide-react";
import { StaffStatus } from "@/components/auth/AuthContext";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import UserProfileModal from "@/components/UserProfileModal";
import {
  getHodPendingStaffApi,
  getHodActiveStaffApi,
  getHodRejectedStaffApi,
  getHodDeactivatedStaffApi,
  hodApproveStaffApi,
  hodRejectStaffApi,
  hodDeactivateStaffApi,
  hodReactivateStaffApi,
} from "@/lib/api";
import { toast } from "@/hooks/use-toast";

type Staff = {
  id: string;
  name: string;
  email: string;
  department: string;
  position?: string;
  registeredDate: Date;
  status: "pending" | "approved" | "rejected" | "deactivated";
};

export interface StaffManagementProps {
  initialStaff?: Staff[];
  showDepartmentColumn?: boolean; // controls visibility of Department column
}

export default function StaffManagement({
  initialStaff,
  showDepartmentColumn = true,
}: StaffManagementProps) {
  const [staff, setStaff] = useState<Staff[]>(initialStaff ?? []);
  const [searchTerm, setSearchTerm] = useState("");
  const [tab, setTab] = useState("approved");
  const [loading, setLoading] = useState(false);
  const [refreshTs, setRefreshTs] = useState(0);
  // Pagination per tab
  const [page, setPage] = useState(1);
  const pageSize = 5;
  useEffect(() => {
    setPage(1);
  }, [searchTerm, tab]);

  // Fetch backend staff sets
  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      try {
        const [pending, active, rejected, deactivated] = await Promise.all([
          getHodPendingStaffApi().catch(() => []),
          getHodActiveStaffApi().catch(() => []),
          getHodRejectedStaffApi().catch(() => []),
          getHodDeactivatedStaffApi().catch(() => []),
        ]);
        if (ignore) return;
        // Normalize to unified list with status marker
        interface RawStaff {
          _id?: string;
          id?: string;
          name?: string;
          fullName?: string;
          username?: string;
          email?: string;
          department?: string;
          workingPlace?: string;
          position?: string;
          title?: string;
          createdAt?: string | Date;
        }
        const mapUser = (u: RawStaff, status: Staff["status"]): Staff => ({
          id: String(u._id || u.id),
          name: u.name || u.fullName || u.username || u.email,
          email: u.email,
          department: u.department || "-",
          position: u.workingPlace || u.position || u.title || undefined,
          registeredDate: new Date(u.createdAt || Date.now()),
          status,
        });
        const combined: Staff[] = [
          ...pending.map((u: unknown) => mapUser(u, "pending")),
          ...active.map((u: unknown) => mapUser(u, "approved")),
          ...rejected.map((u: unknown) => mapUser(u, "rejected")),
          ...deactivated.map((u: unknown) => mapUser(u, "deactivated")),
        ];
        // De-dupe by id preferring non-pending status ordering
        const order = {
          approved: 3,
          pending: 2,
          rejected: 1,
          deactivated: 0,
        } as const;
        const dedup = new Map<string, Staff>();
        combined.forEach((s) => {
          const existing = dedup.get(s.id);
          if (!existing || order[s.status] > order[existing.status])
            dedup.set(s.id, s);
        });
        setStaff(Array.from(dedup.values()));
      } catch (e) {
        toast({
          title: "Failed to load staff",
          description: (e as Error).message,
          variant: "destructive",
        });
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [refreshTs]);

  const filteredStaff = staff.filter(
    (s) =>
      (s.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.department || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const approvedStaff = filteredStaff.filter((s) => s.status === "approved");
  const pendingStaff = filteredStaff.filter((s) => s.status === "pending");
  const rejectedStaff = filteredStaff.filter((s) => s.status === "rejected");
  const deactivatedStaff = filteredStaff.filter(
    (s) => s.status === "deactivated"
  );

  // Select active dataset
  const activeData = useMemo(() => {
    if (tab === "pending") return pendingStaff;
    if (tab === "rejected") return rejectedStaff;
    if (tab === "deactivated") return deactivatedStaff;
    return approvedStaff;
  }, [tab, approvedStaff, pendingStaff, rejectedStaff, deactivatedStaff]);

  // Pagination helpers
  const totalItems = activeData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (page - 1) * pageSize;
  const pagedActive = activeData.slice(startIndex, startIndex + pageSize);
  const goToPage = (p: number) => setPage(Math.min(Math.max(1, p), totalPages));
  const getVisiblePages = () => {
    const maxToShow = 5;
    if (totalPages <= maxToShow)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: number[] = [];
    const left = Math.max(1, page - 2);
    const right = Math.min(totalPages, left + maxToShow - 1);
    for (let p = left; p <= right; p++) pages.push(p);
    return pages;
  };

  const safeUpdate = (id: string, status: Staff["status"]) => {
    setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  };
  const handleApprove = async (id: string) => {
    try {
      await hodApproveStaffApi(id);
      safeUpdate(id, "approved");
      toast({ title: "Staff Approved" });
    } catch (e) {
      toast({
        title: "Approve failed",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  };
  const handleReject = async (id: string) => {
    try {
      await hodRejectStaffApi(id);
      safeUpdate(id, "rejected");
      toast({ title: "Staff Rejected" });
    } catch (e) {
      toast({
        title: "Reject failed",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  };
  const handleDeactivate = async (id: string) => {
    try {
      await hodDeactivateStaffApi(id);
      safeUpdate(id, "deactivated");
      toast({ title: "Staff Deactivated" });
    } catch (e) {
      toast({
        title: "Deactivate failed",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  };
  const handleReactivate = async (id: string) => {
    try {
      await hodReactivateStaffApi(id);
      safeUpdate(id, "approved");
      toast({ title: "Staff Reactivated" });
    } catch (e) {
      toast({
        title: "Reactivate failed",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  };

  // Listen for promotion events (from StudentManagement)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.user) return;
      const u = detail.user as {
        _id?: string;
        name?: string;
        fullName?: string;
        username?: string;
        email?: string;
        department?: string;
        workingPlace?: string;
        createdAt?: string | Date;
      };
      setStaff((prev) => {
        if (prev.some((p) => p.id === u._id)) return prev; // already exists
        return [
          {
            id: String(u._id),
            name: u.name || u.fullName || u.username || u.email,
            email: u.email,
            department: u.department || "-",
            position: u.workingPlace || undefined,
            registeredDate: new Date(u.createdAt || Date.now()),
            status: "approved",
          },
          ...prev,
        ];
      });
    };
    window.addEventListener("hod:staff-promoted", handler as EventListener);
    return () =>
      window.removeEventListener(
        "hod:staff-promoted",
        handler as EventListener
      );
  }, []);

  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  const StaffTable = ({
    data,
    actions,
  }: {
    data: Staff[];
    actions: (s: Staff) => JSX.Element;
  }) => (
    <div>
      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {data.slice(startIndex, startIndex + pageSize).length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            No staff found
          </div>
        ) : (
          data.slice(startIndex, startIndex + pageSize).map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-semibold">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.email}</div>
                  {showDepartmentColumn && (
                    <div className="text-xs text-muted-foreground">
                      Dept: {s.department}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Position: {s.position}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Registered: {s.registeredDate.toLocaleDateString()}
                  </div>
                </div>
                <Badge
                  className={
                    s.status === "approved"
                      ? "bg-green-100 text-green-800"
                      : s.status === "pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                  }
                >
                  {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                </Badge>
              </div>
              <div className="mt-3 flex flex-col gap-2 [&>button]:w-full">
                {actions(s)}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Working Position</TableHead>
              {showDepartmentColumn && <TableHead>Department</TableHead>}
              <TableHead>Registration Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.slice(startIndex, startIndex + pageSize).length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showDepartmentColumn ? 7 : 6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No staff found
                </TableCell>
              </TableRow>
            ) : (
              data.slice(startIndex, startIndex + pageSize).map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.email}</TableCell>
                  <TableCell>{s.position || "-"}</TableCell>
                  {showDepartmentColumn && (
                    <TableCell>{s.department}</TableCell>
                  )}
                  <TableCell>{s.registeredDate.toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        s.status === "approved"
                          ? "bg-green-100 text-green-800"
                          : s.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }
                    >
                      {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{actions(s)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Staff Management</h1>
        <p className="text-muted-foreground">Manage staff in your university</p>
      </div>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Staff Directory</CardTitle>
          <div className="flex flex-wrap gap-2 mt-4">
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-md text-base md:text-lg py-2 md:py-3 px-4 transition-all"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="deactivated">Deactivated</TabsTrigger>
            </TabsList>
            <TabsContent value="approved">
              <StaffTable
                data={approvedStaff}
                actions={(s) => (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProfileUserId(s.id)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Users className="h-4 w-4" /> View Profile
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeactivate(s.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <UserX className="h-4 w-4" /> Deactivate
                    </Button>
                  </>
                )}
              />
            </TabsContent>
            <TabsContent value="pending">
              <StaffTable
                data={pendingStaff}
                actions={(s) => (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProfileUserId(s.id)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Users className="h-4 w-4" /> View Profile
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApprove(s.id)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <UserCheck className="h-4 w-4" /> Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(s.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <UserX className="h-4 w-4" /> Reject
                    </Button>
                  </>
                )}
              />
            </TabsContent>
            <TabsContent value="rejected">
              <StaffTable
                data={rejectedStaff}
                actions={(s) => (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApprove(s.id)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <UserCheck className="h-4 w-4" /> Re-approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProfileUserId(s.id)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Users className="h-4 w-4" /> View Profile
                    </Button>
                  </>
                )}
              />
            </TabsContent>
            <TabsContent value="deactivated">
              <StaffTable
                data={deactivatedStaff}
                actions={(s) => (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReactivate(s.id)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <UserCheck className="h-4 w-4" /> Reactivate
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProfileUserId(s.id)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Users className="h-4 w-4" /> View Profile
                    </Button>
                  </>
                )}
              />
            </TabsContent>
          </Tabs>
          {loading && (
            <div className="pt-4 text-sm text-muted-foreground">
              Loading staff...
            </div>
          )}
          <div className="pt-4 flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRefreshTs(Date.now())}
              disabled={loading}
              className="flex items-center gap-1"
            >
              <RefreshCcw className="h-4 w-4" /> Refresh
            </Button>
            <div className="text-xs text-muted-foreground self-center">
              Total: {staff.length}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="px-4 md:px-0">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    goToPage(page - 1);
                  }}
                  className={page === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              {getVisiblePages()[0] !== 1 && (
                <>
                  <PaginationItem className="hidden sm:list-item">
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        goToPage(1);
                      }}
                    >
                      1
                    </PaginationLink>
                  </PaginationItem>
                  <PaginationItem className="hidden sm:list-item">
                    <PaginationEllipsis />
                  </PaginationItem>
                </>
              )}
              {getVisiblePages().map((p) => (
                <PaginationItem key={p} className="hidden sm:list-item">
                  <PaginationLink
                    href="#"
                    isActive={p === page}
                    onClick={(e) => {
                      e.preventDefault();
                      goToPage(p);
                    }}
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ))}
              {getVisiblePages().slice(-1)[0] !== totalPages && (
                <>
                  <PaginationItem className="hidden sm:list-item">
                    <PaginationEllipsis />
                  </PaginationItem>
                  <PaginationItem className="hidden sm:list-item">
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        goToPage(totalPages);
                      }}
                    >
                      {totalPages}
                    </PaginationLink>
                  </PaginationItem>
                </>
              )}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    goToPage(page + 1);
                  }}
                  className={
                    page === totalPages ? "pointer-events-none opacity-50" : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <UserProfileModal
        userId={profileUserId || ""}
        open={!!profileUserId}
        onOpenChange={(o) => {
          if (!o) setProfileUserId(null);
        }}
      />
    </div>
  );
}
