import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserCheck, UserX, Users } from "lucide-react";
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

type Staff = {
  id: string;
  name: string;
  email: string;
  department: string;
  workingPlace?: string;
  registeredDate?: Date;
  status: "approved" | "pending" | "rejected" | "deactivated";
};

export default function HODStaffManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [tab, setTab] = useState("approved");
  const [approved, setApproved] = useState<Staff[]>([]);
  const [pending, setPending] = useState<Staff[]>([]);
  const [rejected, setRejected] = useState<Staff[]>([]);
  const [deactivated, setDeactivated] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [p, a, r, d] = await Promise.all([
        getHodPendingStaffApi(),
        getHodActiveStaffApi(),
        getHodRejectedStaffApi(),
        getHodDeactivatedStaffApi(),
      ]);
      type Raw = {
        _id: string;
        name?: string;
        fullName?: string;
        username?: string;
        email: string;
        department?: string;
        workingPlace?: string;
        createdAt?: string;
      };
      const map = (arr: Raw[], status: Staff["status"]): Staff[] =>
        arr.map((u: Raw) => ({
          id: u._id,
          name: u.fullName || u.name || u.username || u.email,
          email: u.email,
          department: u.department,
          workingPlace: u.workingPlace,
          registeredDate: u.createdAt ? new Date(u.createdAt) : undefined,
          status,
        }));
      setPending(map(p as Raw[], "pending"));
      setApproved(map(a as Raw[], "approved"));
      setRejected(map(r as Raw[], "rejected"));
      setDeactivated(map(d as Raw[], "deactivated"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  // Respect ?tab=... query param so external links can open a specific tab
  const location = useLocation();
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const t = params.get("tab");
      if (t && ["pending", "approved", "rejected", "deactivated"].includes(t)) {
        setTab(t);
      }
    } catch (err) {
      // ignore malformed url
    }
  }, [location.search]);

  useEffect(() => {
    type PromotedDetail = {
      user?: {
        _id?: string;
        id?: string;
        fullName?: string;
        name?: string;
        username?: string;
        email?: string;
        department?: string;
        workingPlace?: string;
      };
      id?: string;
      name?: string;
      email?: string;
      department?: string;
      workingPlace?: string;
      status?: "approved" | "pending";
    };

    const handler = (e: CustomEvent<PromotedDetail>) => {
      try {
        const d = e.detail as PromotedDetail | undefined;
        if (!d) return;
        const u = d.user;
        if (d.status === "approved") {
          const newApproved: Staff = u
            ? {
                id: u._id || u.id,
                name:
                  u.fullName || u.name || u.username || u.email || "Unknown",
                email: u.email || "",
                department: u.department || "",
                workingPlace: u.workingPlace,
                status: "approved",
              }
            : {
                id: d.id,
                name: d.name || "Unknown",
                email: d.email || "",
                department: d.department || "",
                workingPlace: d.workingPlace,
                status: "approved",
              };
          setApproved((prev) => [newApproved, ...prev]);
          return;
        }
        // default: add to pending
        const newPending: Staff = {
          id: d.id,
          name: d.name || "Unknown",
          email: d.email || "",
          department: d.department || "",
          workingPlace: d.workingPlace,
          status: "pending",
        };
        setPending((prev) => [newPending, ...prev]);
      } catch (err) {
        // ignore
      }
    };
    window.addEventListener("hod:staff-promoted", handler as EventListener);
    return () =>
      window.removeEventListener(
        "hod:staff-promoted",
        handler as unknown as EventListener
      );
  }, []);

  const filterList = (list: Staff[]) =>
    list.filter(
      (s) =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.workingPlace || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    // Save current state for possible rollback
    const prevApproved = approved;
    const prevPending = pending;
    const prevRejected = rejected;
    const prevDeactivated = deactivated;

    try {
      const res = await hodApproveStaffApi(id);
      // If backend returns the updated user, use it to construct the Staff item.
      const returned = (res &&
        (res as unknown) &&
        (res as unknown as { user?: unknown }).user) as
        | {
            _id?: string;
            name?: string;
            fullName?: string;
            username?: string;
            email?: string;
            department?: string;
            workingPlace?: string;
            createdAt?: string;
          }
        | undefined;

      const promoted: Staff = returned
        ? {
            id: returned._id || "",
            name:
              returned.fullName ||
              returned.name ||
              returned.username ||
              returned.email ||
              "Unknown",
            email: returned.email || "",
            department: returned.department || "",
            workingPlace: returned.workingPlace,
            registeredDate: returned.createdAt
              ? new Date(returned.createdAt)
              : undefined,
            status: "approved",
          }
        : // Fallback to existing source if API didn't return user
          ((pending.find((x) => x.id === id) ||
            rejected.find((x) => x.id === id) ||
            deactivated.find((x) => x.id === id) ||
            approved.find((x) => x.id === id) || {
              id,
              name: "Unknown",
              email: "",
              department: "",
              status: "approved",
            }) as Staff);

      setApproved((prev) => [promoted, ...prev.filter((p) => p.id !== id)]);
      setPending((prev) => prev.filter((p) => p.id !== id));
      setRejected((prev) => prev.filter((p) => p.id !== id));
      setDeactivated((prev) => prev.filter((p) => p.id !== id));
      setTab("approved");
      toast({ title: "Approved", description: "Staff has been approved." });
    } catch (err) {
      // Rollback to previous lists
      setApproved(prevApproved);
      setPending(prevPending);
      setRejected(prevRejected);
      setDeactivated(prevDeactivated);
      toast({
        title: "Approve Failed",
        description: (err as Error)?.message || "Could not approve staff.",
        variant: "destructive",
      });
    } finally {
      setProcessingId((p) => (p === id ? null : p));
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      await hodRejectStaffApi(id);
      toast({ title: "Rejected", description: "Staff has been rejected." });
      await loadAll();
    } catch (err) {
      toast({
        title: "Reject Failed",
        description: (err as Error)?.message || "Could not reject staff.",
        variant: "destructive",
      });
    } finally {
      setProcessingId((p) => (p === id ? null : p));
    }
  };

  const handleDeactivate = async (id: string) => {
    setProcessingId(id);
    try {
      await hodDeactivateStaffApi(id);
      toast({
        title: "Deactivated",
        description: "Staff has been deactivated.",
      });
      await loadAll();
    } catch (err) {
      toast({
        title: "Deactivate Failed",
        description: (err as Error)?.message || "Could not deactivate staff.",
        variant: "destructive",
      });
    } finally {
      setProcessingId((p) => (p === id ? null : p));
    }
  };

  const handleReactivate = async (id: string) => {
    setProcessingId(id);
    try {
      await hodReactivateStaffApi(id);
      toast({
        title: "Reactivated",
        description: "Staff has been reactivated.",
      });
      await loadAll();
    } catch (err) {
      toast({
        title: "Reactivate Failed",
        description: (err as Error)?.message || "Could not reactivate staff.",
        variant: "destructive",
      });
    } finally {
      setProcessingId((p) => (p === id ? null : p));
    }
  };

  const StaffTable = ({
    data,
    actions,
  }: {
    data: Staff[];
    actions: (s: Staff) => JSX.Element;
  }) => (
    <div className="hidden lg:block rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[150px] md:w-[200px] text-sm">
              Name
            </TableHead>
            <TableHead className="text-sm">Email</TableHead>
            <TableHead className="text-sm">Department</TableHead>
            <TableHead className="text-sm">Working Position</TableHead>
            <TableHead className="text-sm">Registration Date</TableHead>
            <TableHead className="text-sm">Status</TableHead>
            <TableHead className="text-right text-sm">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center py-8 text-muted-foreground text-sm md:text-base"
              >
                {loading ? "Loading..." : "No staff found"}
              </TableCell>
            </TableRow>
          ) : (
            data.map((s) => (
              <TableRow key={s.id} className="hover:bg-muted/50">
                <TableCell className="font-medium text-sm">
                  <div className="max-w-[150px] md:max-w-[200px] truncate">
                    {s.name}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  <div className="truncate max-w-[200px]">{s.email}</div>
                </TableCell>
                <TableCell className="text-sm">
                  <div className="truncate max-w-[120px]">{s.department}</div>
                </TableCell>
                <TableCell className="text-sm">
                  <div className="truncate max-w-[150px]">
                    {s.workingPlace || (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {s.registeredDate
                    ? s.registeredDate.toLocaleDateString()
                    : "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    className={`text-xs ${
                      s.status === "approved"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                        : s.status === "pending"
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                        : s.status === "deactivated"
                        ? "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
                        : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                    }`}
                    variant="outline"
                  >
                    {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 md:gap-2 justify-end flex-wrap">
                    {actions(s)}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  // Stats summary
  const stats = {
    total:
      approved.length + pending.length + rejected.length + deactivated.length,
    approved: approved.length,
    pending: pending.length,
    rejected: rejected.length,
    deactivated: deactivated.length,
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 lg:space-y-8">
      <div className="space-y-2 md:space-y-3">
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight">
          HoD Staff Management
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Approve, reject, deactivate and reactivate staff in your department
        </p>
      </div>

      {/* Stats summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 lg:gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center space-x-2 md:space-x-3">
              <div className="bg-blue-50 p-1.5 md:p-2 rounded-lg dark:bg-blue-900/20 flex-shrink-0">
                <Users className="h-4 w-4 md:h-5 md:w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">
                  Total Staff
                </p>
                <p className="text-lg md:text-2xl font-bold text-blue-600">
                  {stats.total}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center space-x-2 md:space-x-3">
              <div className="bg-green-50 p-1.5 md:p-2 rounded-lg dark:bg-green-900/20 flex-shrink-0">
                <UserCheck className="h-4 w-4 md:h-5 md:w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">
                  Approved
                </p>
                <p className="text-lg md:text-2xl font-bold text-green-600">
                  {stats.approved}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center space-x-2 md:space-x-3">
              <div className="bg-yellow-50 p-1.5 md:p-2 rounded-lg dark:bg-yellow-900/20 flex-shrink-0">
                <UserCheck className="h-4 w-4 md:h-5 md:w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">
                  Pending
                </p>
                <p className="text-lg md:text-2xl font-bold text-yellow-600">
                  {stats.pending}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center space-x-2 md:space-x-3">
              <div className="bg-red-50 p-1.5 md:p-2 rounded-lg dark:bg-red-900/20 flex-shrink-0">
                <UserX className="h-4 w-4 md:h-5 md:w-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">
                  Rejected
                </p>
                <p className="text-lg md:text-2xl font-bold text-red-600">
                  {stats.rejected}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center space-x-2 md:space-x-3">
              <div className="bg-orange-50 p-1.5 md:p-2 rounded-lg dark:bg-orange-900/20 flex-shrink-0">
                <UserX className="h-4 w-4 md:h-5 md:w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">
                  Deactivated
                </p>
                <p className="text-lg md:text-2xl font-bold text-orange-600">
                  {stats.deactivated}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="p-3 md:p-6">
        <CardHeader className="p-0 pb-3 md:pb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg md:text-xl">
                Staff Directory
              </CardTitle>
              <p className="text-xs md:text-sm text-muted-foreground">
                Manage staff accounts and permissions
              </p>
            </div>
            <div className="relative w-full md:max-w-md">
              <Input
                placeholder="Search by name, email, or position..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9 md:h-10 text-sm"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto p-1">
              <TabsTrigger
                value="pending"
                className="text-xs md:text-sm py-2 px-2 md:px-3"
              >
                Pending
              </TabsTrigger>
              <TabsTrigger
                value="approved"
                className="text-xs md:text-sm py-2 px-2 md:px-3"
              >
                Approved
              </TabsTrigger>
              <TabsTrigger
                value="rejected"
                className="text-xs md:text-sm py-2 px-2 md:px-3"
              >
                Rejected
              </TabsTrigger>
              <TabsTrigger
                value="deactivated"
                className="text-xs md:text-sm py-2 px-2 md:px-3"
              >
                Deactivated
              </TabsTrigger>
            </TabsList>

            <TabsContent value="approved">
              <StaffTable
                data={filterList(approved)}
                actions={(s) => (
                  <div className="flex gap-1 md:gap-2 justify-end flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProfileUserId(s.id)}
                      className="hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 text-xs h-8 px-2 md:px-3"
                    >
                      <Users className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                      <span className="hidden sm:inline">View Profile</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeactivate(s.id)}
                      className="hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 text-xs h-8 px-2 md:px-3"
                      disabled={processingId === s.id}
                    >
                      <UserX className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                      <span className="hidden sm:inline">Deactivate</span>
                    </Button>
                  </div>
                )}
              />
              {/* Mobile Cards - Approved */}
              <div className="lg:hidden space-y-3 md:space-y-4 mt-4">
                {filterList(approved).length === 0 ? (
                  <div className="text-center py-8 md:py-12 text-muted-foreground text-sm md:text-base">
                    {loading ? "Loading..." : "No approved staff found"}
                  </div>
                ) : (
                  filterList(approved).map((s) => (
                    <Card
                      key={s.id}
                      className="p-3 md:p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="space-y-3 md:space-y-4">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm md:text-base leading-tight line-clamp-2">
                              {s.name}
                            </h3>
                            <div className="flex items-center gap-1 mt-1">
                              <Badge
                                className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 text-xs"
                                variant="outline"
                              >
                                APPROVED
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-xs md:text-sm text-muted-foreground min-w-fit">
                              Email:
                            </span>
                            <span className="truncate text-xs md:text-sm">
                              {s.email}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs md:text-sm text-muted-foreground min-w-fit">
                              Department:
                            </span>
                            <span className="truncate text-xs md:text-sm">
                              {s.department}
                            </span>
                          </div>
                          {s.workingPlace && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs md:text-sm text-muted-foreground min-w-fit">
                                Position:
                              </span>
                              <span className="truncate text-xs md:text-sm">
                                {s.workingPlace}
                              </span>
                            </div>
                          )}
                          {s.registeredDate && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs md:text-sm text-muted-foreground min-w-fit">
                                Joined:
                              </span>
                              <span className="text-xs md:text-sm whitespace-nowrap">
                                {s.registeredDate.toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setProfileUserId(s.id)}
                            className="hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 text-xs h-8"
                          >
                            <Users className="h-3 w-3 mr-1" />
                            View Profile
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeactivate(s.id)}
                            className="hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 text-xs h-8"
                            disabled={processingId === s.id}
                          >
                            <UserX className="h-3 w-3 mr-1" />
                            Deactivate
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="pending">
              <StaffTable
                data={filterList(pending)}
                actions={(s) => (
                  <div className="flex gap-1 md:gap-2 justify-end flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProfileUserId(s.id)}
                      className="hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 text-xs h-8 px-2 md:px-3"
                    >
                      <Users className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                      <span className="hidden sm:inline">View Profile</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApprove(s.id)}
                      className="hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 text-xs h-8 px-2 md:px-3"
                      disabled={processingId === s.id}
                    >
                      <UserCheck className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                      <span className="hidden sm:inline">Approve</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(s.id)}
                      className="hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 text-xs h-8 px-2 md:px-3"
                      disabled={processingId === s.id}
                    >
                      <UserX className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                      <span className="hidden sm:inline">Reject</span>
                    </Button>
                  </div>
                )}
              />
              {/* Mobile Cards - Pending */}
              <div className="lg:hidden space-y-3 md:space-y-4 mt-4">
                {filterList(pending).length === 0 ? (
                  <div className="text-center py-8 md:py-12 text-muted-foreground text-sm md:text-base">
                    {loading ? "Loading..." : "No pending staff found"}
                  </div>
                ) : (
                  filterList(pending).map((s) => (
                    <Card
                      key={s.id}
                      className="p-3 md:p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="space-y-3 md:space-y-4">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm md:text-base leading-tight line-clamp-2">
                              {s.name}
                            </h3>
                            <div className="flex items-center gap-1 mt-1">
                              <Badge
                                className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 text-xs"
                                variant="outline"
                              >
                                PENDING
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-xs md:text-sm text-muted-foreground min-w-fit">
                              Email:
                            </span>
                            <span className="truncate text-xs md:text-sm">
                              {s.email}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs md:text-sm text-muted-foreground min-w-fit">
                              Department:
                            </span>
                            <span className="truncate text-xs md:text-sm">
                              {s.department}
                            </span>
                          </div>
                          {s.workingPlace && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs md:text-sm text-muted-foreground min-w-fit">
                                Position:
                              </span>
                              <span className="truncate text-xs md:text-sm">
                                {s.workingPlace}
                              </span>
                            </div>
                          )}
                          {s.registeredDate && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs md:text-sm text-muted-foreground min-w-fit">
                                Applied:
                              </span>
                              <span className="text-xs md:text-sm whitespace-nowrap">
                                {s.registeredDate.toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setProfileUserId(s.id)}
                            className="hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 text-xs h-8"
                          >
                            <Users className="h-3 w-3 mr-1" />
                            View Profile
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApprove(s.id)}
                            className="hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 text-xs h-8"
                            disabled={processingId === s.id}
                          >
                            <UserCheck className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReject(s.id)}
                            className="hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 text-xs h-8"
                            disabled={processingId === s.id}
                          >
                            <UserX className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="rejected">
              <StaffTable
                data={filterList(rejected)}
                actions={(s) => (
                  <div className="flex gap-1 md:gap-2 justify-end flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProfileUserId(s.id)}
                      className="hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 text-xs h-8 px-2 md:px-3"
                    >
                      <Users className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                      <span className="hidden sm:inline">View Profile</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApprove(s.id)}
                      className="hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 text-xs h-8 px-2 md:px-3"
                      disabled={processingId === s.id}
                    >
                      <UserCheck className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                      <span className="hidden sm:inline">Re-approve</span>
                    </Button>
                  </div>
                )}
              />
              {/* Mobile Cards - Rejected */}
              <div className="lg:hidden space-y-3 md:space-y-4 mt-4">
                {filterList(rejected).length === 0 ? (
                  <div className="text-center py-8 md:py-12 text-muted-foreground text-sm md:text-base">
                    {loading ? "Loading..." : "No rejected staff found"}
                  </div>
                ) : (
                  filterList(rejected).map((s) => (
                    <Card
                      key={s.id}
                      className="p-3 md:p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="space-y-3 md:space-y-4">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm md:text-base leading-tight line-clamp-2">
                              {s.name}
                            </h3>
                            <div className="flex items-center gap-1 mt-1">
                              <Badge
                                className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 text-xs"
                                variant="outline"
                              >
                                REJECTED
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-xs md:text-sm text-muted-foreground min-w-fit">
                              Email:
                            </span>
                            <span className="truncate text-xs md:text-sm">
                              {s.email}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs md:text-sm text-muted-foreground min-w-fit">
                              Department:
                            </span>
                            <span className="truncate text-xs md:text-sm">
                              {s.department}
                            </span>
                          </div>
                          {s.workingPlace && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs md:text-sm text-muted-foreground min-w-fit">
                                Position:
                              </span>
                              <span className="truncate text-xs md:text-sm">
                                {s.workingPlace}
                              </span>
                            </div>
                          )}
                          {s.registeredDate && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs md:text-sm text-muted-foreground min-w-fit">
                                Applied:
                              </span>
                              <span className="text-xs md:text-sm whitespace-nowrap">
                                {s.registeredDate.toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setProfileUserId(s.id)}
                            className="hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 text-xs h-8"
                          >
                            <Users className="h-3 w-3 mr-1" />
                            View Profile
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApprove(s.id)}
                            className="hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 text-xs h-8"
                            disabled={processingId === s.id}
                          >
                            <UserCheck className="h-3 w-3 mr-1" />
                            Re-approve
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="deactivated">
              <StaffTable
                data={filterList(deactivated)}
                actions={(s) => (
                  <div className="flex gap-1 md:gap-2 justify-end flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProfileUserId(s.id)}
                      className="hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 text-xs h-8 px-2 md:px-3"
                    >
                      <Users className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                      <span className="hidden sm:inline">View Profile</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReactivate(s.id)}
                      className="hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 text-xs h-8 px-2 md:px-3"
                      disabled={processingId === s.id}
                    >
                      <UserCheck className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                      <span className="hidden sm:inline">Reactivate</span>
                    </Button>
                  </div>
                )}
              />
              {/* Mobile Cards - Deactivated */}
              <div className="lg:hidden space-y-3 md:space-y-4 mt-4">
                {filterList(deactivated).length === 0 ? (
                  <div className="text-center py-8 md:py-12 text-muted-foreground text-sm md:text-base">
                    {loading ? "Loading..." : "No deactivated staff found"}
                  </div>
                ) : (
                  filterList(deactivated).map((s) => (
                    <Card
                      key={s.id}
                      className="p-3 md:p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="space-y-3 md:space-y-4">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm md:text-base leading-tight line-clamp-2">
                              {s.name}
                            </h3>
                            <div className="flex items-center gap-1 mt-1">
                              <Badge
                                className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 text-xs"
                                variant="outline"
                              >
                                DEACTIVATED
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-xs md:text-sm text-muted-foreground min-w-fit">
                              Email:
                            </span>
                            <span className="truncate text-xs md:text-sm">
                              {s.email}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs md:text-sm text-muted-foreground min-w-fit">
                              Department:
                            </span>
                            <span className="truncate text-xs md:text-sm">
                              {s.department}
                            </span>
                          </div>
                          {s.workingPlace && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs md:text-sm text-muted-foreground min-w-fit">
                                Position:
                              </span>
                              <span className="truncate text-xs md:text-sm">
                                {s.workingPlace}
                              </span>
                            </div>
                          )}
                          {s.registeredDate && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs md:text-sm text-muted-foreground min-w-fit">
                                Joined:
                              </span>
                              <span className="text-xs md:text-sm whitespace-nowrap">
                                {s.registeredDate.toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setProfileUserId(s.id)}
                            className="hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 text-xs h-8"
                          >
                            <Users className="h-3 w-3 mr-1" />
                            View Profile
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReactivate(s.id)}
                            className="hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 text-xs h-8"
                            disabled={processingId === s.id}
                          >
                            <UserCheck className="h-3 w-3 mr-1" />
                            Reactivate
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <UserProfileModal
        userId={profileUserId || ""}
        open={!!profileUserId}
        onOpenChange={(o) => !o && setProfileUserId(null)}
      />
    </div>
  );
}
