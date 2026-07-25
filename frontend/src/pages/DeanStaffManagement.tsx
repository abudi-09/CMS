import { useEffect, useState } from "react";
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
import { UserCheck, UserX, RefreshCcw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  getDeanPendingStaffApi,
  getDeanActiveStaffApi,
  getDeanRejectedStaffApi,
  getDeanDeactivatedStaffApi,
  deanApproveStaffApi,
  deanRejectStaffApi,
  deanDeactivateStaffApi,
  deanReactivateStaffApi,
} from "@/lib/api";

type Staff = {
  id: string;
  name: string;
  email: string;
  department: string;
  workingPlace: string;
  registeredDate: Date;
  status: "pending" | "approved" | "rejected" | "deactivated";
};

type RawStaff = {
  _id?: string;
  id?: string;
  name?: string;
  fullName?: string;
  username?: string;
  email?: string;
  department?: string;
  workingPlace?: string;
  createdAt?: string;
};

function mapStaff(u: RawStaff, status: Staff["status"]): Staff {
  return {
    id: String(u._id || u.id || ""),
    name: u.fullName || u.name || u.username || u.email || "Unknown",
    email: u.email || "",
    department: u.department || "-",
    workingPlace: u.workingPlace || "-",
    registeredDate: u.createdAt ? new Date(u.createdAt) : new Date(),
    status,
  };
}

export default function DeanStaffManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [tab, setTab] = useState("approved");
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadStaff = async () => {
    setLoading(true);
    try {
      const [pending, active, rejected, deactivated] = await Promise.all([
        getDeanPendingStaffApi().catch(() => []),
        getDeanActiveStaffApi().catch(() => []),
        getDeanRejectedStaffApi().catch(() => []),
        getDeanDeactivatedStaffApi().catch(() => []),
      ]);
      const combined: Staff[] = [
        ...(Array.isArray(pending) ? pending : []).map((u: RawStaff) =>
          mapStaff(u, "pending")
        ),
        ...(Array.isArray(active) ? active : []).map((u: RawStaff) =>
          mapStaff(u, "approved")
        ),
        ...(Array.isArray(rejected) ? rejected : []).map((u: RawStaff) =>
          mapStaff(u, "rejected")
        ),
        ...(Array.isArray(deactivated) ? deactivated : []).map((u: RawStaff) =>
          mapStaff(u, "deactivated")
        ),
      ];
      setStaff(combined);
    } catch (e) {
      toast({
        title: "Failed to load staff",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const filteredStaff = staff.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.workingPlace.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const approvedStaff = filteredStaff.filter((s) => s.status === "approved");
  const pendingStaff = filteredStaff.filter((s) => s.status === "pending");
  const rejectedStaff = filteredStaff.filter((s) => s.status === "rejected");
  const deactivatedStaff = filteredStaff.filter(
    (s) => s.status === "deactivated"
  );

  const runAction = async (
    id: string,
    action: () => Promise<unknown>,
    successTitle: string
  ) => {
    setProcessingId(id);
    try {
      await action();
      toast({ title: successTitle });
      await loadStaff();
    } catch (e) {
      toast({
        title: "Action failed",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleApprove = (id: string) =>
    runAction(id, () => deanApproveStaffApi(id), "Staff approved");
  const handleReject = (id: string) =>
    runAction(id, () => deanRejectStaffApi(id), "Staff rejected");
  const handleDeactivate = (id: string) =>
    runAction(id, () => deanDeactivateStaffApi(id), "Staff deactivated");
  const handleReactivate = (id: string) =>
    runAction(id, () => deanReactivateStaffApi(id), "Staff reactivated");

  const StaffTable = ({
    data,
    actions,
  }: {
    data: Staff[];
    actions: (s: Staff) => JSX.Element;
  }) => (
    <>
      <div className="md:hidden space-y-3">
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            No staff found
          </div>
        ) : (
          data.map((s) => (
            <div key={s.id} className="border rounded-lg p-4 bg-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-base">{s.name}</p>
                  <p className="text-xs text-muted-foreground break-all">
                    {s.email}
                  </p>
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
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Working Place</p>
                  <p className="font-medium">{s.workingPlace}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Registered</p>
                  <p className="font-medium">
                    {s.registeredDate.toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                {actions(s)}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden md:block rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Working Place</TableHead>
              <TableHead>Registration Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No staff found
                </TableCell>
              </TableRow>
            ) : (
              data.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.email}</TableCell>
                  <TableCell>{s.workingPlace}</TableCell>
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
    </>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Staff Management</h1>
        <p className="text-muted-foreground">Manage staff in your department</p>
      </div>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
            <span>Staff Directory</span>
            <Button
              variant="outline"
              size="sm"
              onClick={loadStaff}
              disabled={loading}
            >
              <RefreshCcw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </CardTitle>
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
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Loading staff...
            </p>
          ) : (
            <Tabs value={tab} onValueChange={setTab} className="w-full">
              <TabsList>
                <TabsTrigger value="pending">
                  Pending ({pendingStaff.length})
                </TabsTrigger>
                <TabsTrigger value="approved">
                  Approved ({approvedStaff.length})
                </TabsTrigger>
                <TabsTrigger value="rejected">
                  Rejected ({rejectedStaff.length})
                </TabsTrigger>
                <TabsTrigger value="deactivated">
                  Deactivated ({deactivatedStaff.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="approved">
                <StaffTable
                  data={approvedStaff}
                  actions={(s) => (
                    <div className="flex flex-col md:flex-row gap-2 md:justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={processingId === s.id}
                        onClick={() => handleDeactivate(s.id)}
                        className="w-full md:w-auto text-red-600 hover:text-red-700"
                      >
                        <UserX className="h-4 w-4" /> Deactivate
                      </Button>
                    </div>
                  )}
                />
              </TabsContent>
              <TabsContent value="pending">
                <StaffTable
                  data={pendingStaff}
                  actions={(s) => (
                    <div className="flex flex-col md:flex-row gap-2 md:justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={processingId === s.id}
                        onClick={() => handleApprove(s.id)}
                        className="w-full md:w-auto text-green-600 hover:text-green-700"
                      >
                        <UserCheck className="h-4 w-4" /> Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={processingId === s.id}
                        onClick={() => handleReject(s.id)}
                        className="w-full md:w-auto text-red-600 hover:text-red-700"
                      >
                        <UserX className="h-4 w-4" /> Reject
                      </Button>
                    </div>
                  )}
                />
              </TabsContent>
              <TabsContent value="rejected">
                <StaffTable
                  data={rejectedStaff}
                  actions={(s) => (
                    <div className="flex flex-col md:flex-row gap-2 md:justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={processingId === s.id}
                        onClick={() => handleApprove(s.id)}
                        className="w-full md:w-auto text-green-600 hover:text-green-700"
                      >
                        <UserCheck className="h-4 w-4" /> Re-approve
                      </Button>
                    </div>
                  )}
                />
              </TabsContent>
              <TabsContent value="deactivated">
                <StaffTable
                  data={deactivatedStaff}
                  actions={(s) => (
                    <div className="flex flex-col md:flex-row gap-2 md:justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={processingId === s.id}
                        onClick={() => handleReactivate(s.id)}
                        className="w-full md:w-auto text-green-600 hover:text-green-700"
                      >
                        <UserCheck className="h-4 w-4" /> Reactivate
                      </Button>
                    </div>
                  )}
                />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
