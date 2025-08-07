import { useState } from "react";
import { useRef } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserCheck, UserX, Clock, Users, Mail, Building } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import { toast } from "@/hooks/use-toast";

interface StaffMember {
  id: string;
  fullName?: string;
  name?: string;
  email: string;
  department?: string;
  registeredDate?: string | Date;
  status: string;
}

export function StaffManagement() {
  // Confirmation dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | (() => void)>(null);
  const [confirmText, setConfirmText] = useState("");
  const [confirmWarning, setConfirmWarning] = useState("");
  const { pendingStaff, approveStaff, rejectStaff, getAllStaff } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const allStaff = getAllStaff();
  // Filter staff by search term
  const filteredStaff = allStaff.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      (s.fullName || s.name || "").toLowerCase().includes(term) ||
      (s.email || "").toLowerCase().includes(term) ||
      (s.department || "").toLowerCase().includes(term)
    );
  });
  // Normalize status to string and lowercase for filtering
  const approvedStaff = filteredStaff.filter(
    (s) => (s.status || "").toLowerCase() === "approved"
  );
  const rejectedStaff = filteredStaff.filter(
    (s) => (s.status || "").toLowerCase() === "rejected"
  );
  const pendingStaffList = filteredStaff.filter(
    (s) => (s.status || "").toLowerCase() === "pending"
  );

  // Confirmation dialog wrapper
  function showConfirm(action: () => void, text: string, warning: string = "") {
    setConfirmAction(() => action);
    setConfirmText(text);
    setConfirmWarning(warning);
    setConfirmOpen(true);
  }

  const handleApprove = (staffId: string, staffName: string) => {
    showConfirm(
      () => {
        approveStaff(staffId);
        toast({
          title: "Staff Approved",
          description: `${staffName} has been approved and can now access the system.`,
        });
      },
      `Approve ${staffName}?`,
      "This action will grant access to the system."
    );
  };

  const handleReject = (staffId: string, staffName: string) => {
    showConfirm(
      () => {
        rejectStaff(staffId);
        toast({
          title: "Staff Rejected",
          description: `${staffName}'s application has been rejected.`,
          variant: "destructive",
        });
      },
      `Reject ${staffName}?`,
      "This action is irreversible. The staff member will not be able to access the system."
    );
  };

  const handlePromote = (staffId: string, staffName: string) => {
    showConfirm(
      () => {
        // TODO: Implement promote logic (e.g., call promoteStaff)
        toast({
          title: "Staff Promoted",
          description: `${staffName} has been promoted to admin.`,
        });
      },
      `Promote ${staffName} to admin?`,
      "This action will grant admin privileges."
    );
  };

  const handleDeactivate = (staffId: string, staffName: string) => {
    showConfirm(
      () => {
        // TODO: Implement deactivate logic (e.g., call deactivateStaff)
        toast({
          title: "Staff Deactivated",
          description: `${staffName} has been deactivated and can no longer access the system.`,
          variant: "destructive",
        });
      },
      `Deactivate ${staffName}?`,
      "This action is irreversible. The staff member will lose access."
    );
  };

  const handleActivate = (staffId: string, staffName: string) => {
    showConfirm(
      () => {
        // TODO: Implement activate logic (e.g., call activateStaff)
        toast({
          title: "Staff Activated",
          description: `${staffName} has been activated and can now access the system.`,
        });
      },
      `Activate ${staffName}?`,
      "This action will restore access to the system."
    );
  };

  const StaffTable = ({
    staff,
    showActions = false,
    approvedActions = false,
    rejectedActions = false,
  }: {
    staff: StaffMember[];
    showActions?: boolean;
    approvedActions?: boolean;
    rejectedActions?: boolean;
  }) => (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-sm">Name</TableHead>
              <TableHead className="text-sm">Email</TableHead>
              <TableHead className="text-sm">
                Working place / Position
              </TableHead>
              <TableHead className="text-sm">Registration Date</TableHead>
              <TableHead className="text-sm">Status</TableHead>
              {(showActions || approvedActions || rejectedActions) && (
                <TableHead className="text-right text-sm">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={
                    showActions || approvedActions || rejectedActions ? 6 : 5
                  }
                  className="text-center py-8 text-muted-foreground"
                >
                  No staff members found
                </TableCell>
              </TableRow>
            ) : (
              staff.map((member) => (
                <TableRow key={member.id} className="dark:hover:bg-accent/10">
                  <TableCell className="font-medium text-sm">
                    {member.fullName || member.name}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {member.email}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      {member.department}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {member.registeredDate
                      ? typeof member.registeredDate === "string"
                        ? member.registeredDate
                        : new Date(member.registeredDate).toLocaleDateString()
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        member.status === "approved"
                          ? "bg-green-100 text-green-800 text-xs"
                          : member.status === "pending"
                          ? "bg-yellow-100 text-yellow-800 text-xs"
                          : "bg-red-100 text-red-800 text-xs"
                      }
                    >
                      {member.status}
                    </Badge>
                  </TableCell>
                  {(showActions || approvedActions || rejectedActions) && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {showActions && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleApprove(
                                  member.id,
                                  member.fullName || member.name
                                )
                              }
                              className="text-green-600 hover:text-green-700 dark:hover:text-blue-400 text-xs"
                            >
                              <UserCheck className="h-4 w-4" />
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleReject(
                                  member.id,
                                  member.fullName || member.name
                                )
                              }
                              className="text-red-600 hover:text-red-700 dark:hover:text-blue-400 text-xs"
                            >
                              <UserX className="h-4 w-4" />
                              Reject
                            </Button>
                          </>
                        )}
                        {approvedActions && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handlePromote(
                                  member.id,
                                  member.fullName || member.name
                                )
                              }
                              className="text-blue-600 hover:text-blue-700 dark:hover:text-blue-400 text-xs"
                            >
                              Promote
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleDeactivate(
                                  member.id,
                                  member.fullName || member.name
                                )
                              }
                              className="text-red-600 hover:text-red-700 dark:hover:text-blue-400 text-xs"
                            >
                              Deactivate
                            </Button>
                          </>
                        )}
                        {rejectedActions && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleActivate(
                                member.id,
                                member.fullName || member.name
                              )
                            }
                            className="text-green-600 hover:text-green-700 dark:hover:text-blue-400 text-xs"
                          >
                            Activate
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {staff.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No staff members found
          </div>
        ) : (
          staff.map((member) => (
            <Card key={member.id} className="p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-sm">
                      {member.fullName || member.name}
                    </h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Mail className="h-3 w-3" />
                      {member.email}
                    </p>
                  </div>
                  <Badge
                    className={
                      member.status === "approved"
                        ? "bg-green-100 text-green-800 text-xs"
                        : member.status === "pending"
                        ? "bg-yellow-100 text-yellow-800 text-xs"
                        : "bg-red-100 text-red-800 text-xs"
                    }
                  >
                    {member.status}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Building className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Department:</span>
                    <span className="font-medium">{member.department}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Registered:</span>
                    <span className="font-medium ml-2">
                      {member.registeredDate
                        ? typeof member.registeredDate === "string"
                          ? member.registeredDate
                          : new Date(member.registeredDate).toLocaleDateString()
                        : "N/A"}
                    </span>
                  </div>
                </div>

                {(showActions || approvedActions || rejectedActions) && (
                  <div className="flex gap-2 pt-2">
                    {showActions && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleApprove(
                              member.id,
                              member.fullName || member.name
                            )
                          }
                          className="flex-1 text-green-600 hover:text-green-700 dark:hover:text-blue-400 text-xs"
                        >
                          <UserCheck className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleReject(
                              member.id,
                              member.fullName || member.name
                            )
                          }
                          className="flex-1 text-red-600 hover:text-red-700 dark:hover:text-blue-400 text-xs"
                        >
                          <UserX className="h-3 w-3 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    {approvedActions && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handlePromote(
                              member.id,
                              member.fullName || member.name
                            )
                          }
                          className="flex-1 text-blue-600 hover:text-blue-700 dark:hover:text-blue-400 text-xs"
                        >
                          Promote
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleDeactivate(
                              member.id,
                              member.fullName || member.name
                            )
                          }
                          className="flex-1 text-gray-600 hover:text-gray-700 dark:hover:text-blue-400 text-xs"
                        >
                          Deactivate
                        </Button>
                      </>
                    )}
                    {rejectedActions && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleActivate(
                            member.id,
                            member.fullName || member.name
                          )
                        }
                        className="flex-1 text-green-600 hover:text-green-700 dark:hover:text-blue-400 text-xs"
                      >
                        Activate
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </>
  );

  return (
    <div className="space-y-8">
      {/* Reusable Confirmation Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmText}
        warning={confirmWarning}
        onConfirm={() => {
          if (confirmAction) confirmAction();
        }}
      />
      <div>
        <h1 className="text-3xl font-bold">Staff Management</h1>
        <p className="text-muted-foreground">
          Manage staff approvals and roles
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Approval
            </CardTitle>
            <div className="bg-yellow-50 p-2 rounded-lg">
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingStaff.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Approved Staff
            </CardTitle>
            <div className="bg-green-50 p-2 rounded-lg">
              <UserCheck className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedStaff.length}</div>
            <p className="text-xs text-muted-foreground">Active members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rejected
            </CardTitle>
            <div className="bg-red-50 p-2 rounded-lg">
              <UserX className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedStaff.length}</div>
            <p className="text-xs text-muted-foreground">
              Declined applications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Staff
            </CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allStaff.length}</div>
            <p className="text-xs text-muted-foreground">All registrations</p>
          </CardContent>
        </Card>
      </div>

      {/* Staff Management Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Directory</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search Bar inside Staff Directory */}
          <div className="max-w-md mb-4">
            <Input
              placeholder="Search staff by name, email, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <Tabs defaultValue="pending" className="w-full">
            <TabsList>
              <TabsTrigger value="pending">
                Pending Approval ({pendingStaff.length})
              </TabsTrigger>
              <TabsTrigger value="approved">
                Approved ({approvedStaff.length})
              </TabsTrigger>
              <TabsTrigger value="rejected">
                Rejected ({rejectedStaff.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-6">
              <StaffTable
                staff={pendingStaffList.map((s) => ({
                  ...s,
                  status: s.status ?? "",
                }))}
                showActions={true}
              />
            </TabsContent>

            <TabsContent value="approved" className="mt-6">
              <StaffTable
                staff={approvedStaff.map((s) => ({
                  ...s,
                  status: s.status ?? "",
                }))}
                approvedActions={true}
              />
            </TabsContent>

            <TabsContent value="rejected" className="mt-6">
              <StaffTable
                staff={rejectedStaff.map((s) => ({
                  ...s,
                  status: s.status ?? "",
                }))}
                rejectedActions={true}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
