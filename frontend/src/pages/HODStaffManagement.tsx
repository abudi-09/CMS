import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
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
        department: string;
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
      setPending(map(p, "pending"));
      setApproved(map(a, "approved"));
      setRejected(map(r, "rejected"));
      setDeactivated(map(d, "deactivated"));
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
    await hodApproveStaffApi(id);
    await loadAll();
  };
  const handleReject = async (id: string) => {
    await hodRejectStaffApi(id);
    await loadAll();
  };
  const handleDeactivate = async (id: string) => {
    await hodDeactivateStaffApi(id);
    await loadAll();
  };
  const handleReactivate = async (id: string) => {
    await hodReactivateStaffApi(id);
    await loadAll();
  };

  const StaffTable = ({
    data,
    actions,
  }: {
    data: Staff[];
    actions: (s: Staff) => JSX.Element;
  }) => (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Working Position</TableHead>
            <TableHead>Registration Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center py-8 text-muted-foreground"
              >
                {loading ? "Loading..." : "No staff found"}
              </TableCell>
            </TableRow>
          ) : (
            data.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.name}</TableCell>
                <TableCell>{s.email}</TableCell>
                <TableCell>{s.department}</TableCell>
                <TableCell>
                  {s.workingPlace || (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {s.registeredDate
                    ? s.registeredDate.toLocaleDateString()
                    : "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    className={
                      s.status === "approved"
                        ? "bg-green-100 text-green-800"
                        : s.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : s.status === "deactivated"
                        ? "bg-orange-100 text-orange-800"
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
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">HoD Staff Management</h1>
        <p className="text-muted-foreground">
          Approve, reject, deactivate and reactivate staff in your department
        </p>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Staff Directory</CardTitle>
          <div className="flex flex-wrap gap-2 mt-4">
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-md"
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
                data={filterList(approved)}
                actions={(s) => (
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProfileUserId(s.id)}
                      className="text-blue-600"
                    >
                      <Users className="h-4 w-4" /> View Profile
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeactivate(s.id)}
                      className="text-red-600"
                    >
                      <UserX className="h-4 w-4" /> Deactivate
                    </Button>
                  </div>
                )}
              />
            </TabsContent>

            <TabsContent value="pending">
              <StaffTable
                data={filterList(pending)}
                actions={(s) => (
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProfileUserId(s.id)}
                      className="text-blue-600"
                    >
                      <Users className="h-4 w-4" /> View Profile
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApprove(s.id)}
                      className="text-green-600"
                    >
                      <UserCheck className="h-4 w-4" /> Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(s.id)}
                      className="text-red-600"
                    >
                      <UserX className="h-4 w-4" /> Reject
                    </Button>
                  </div>
                )}
              />
            </TabsContent>

            <TabsContent value="rejected">
              <StaffTable
                data={filterList(rejected)}
                actions={(s) => (
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProfileUserId(s.id)}
                      className="text-blue-600"
                    >
                      <Users className="h-4 w-4" /> View Profile
                    </Button>
                  </div>
                )}
              />
            </TabsContent>

            <TabsContent value="deactivated">
              <StaffTable
                data={filterList(deactivated)}
                actions={(s) => (
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProfileUserId(s.id)}
                      className="text-blue-600"
                    >
                      <Users className="h-4 w-4" /> View Profile
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReactivate(s.id)}
                      className="text-green-600"
                    >
                      <UserCheck className="h-4 w-4" /> Reactivate
                    </Button>
                  </div>
                )}
              />
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
