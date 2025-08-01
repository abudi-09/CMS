import { useState } from "react";
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

export function StaffManagement() {
  const { pendingStaff, approveStaff, rejectStaff, getAllStaff } = useAuth();

  const allStaff = getAllStaff();
  // Normalize status to string and lowercase for filtering
  const approvedStaff = allStaff.filter(
    (s) => (s.status || "").toLowerCase() === "approved"
  );
  const rejectedStaff = allStaff.filter(
    (s) => (s.status || "").toLowerCase() === "rejected"
  );
  const pendingStaffList = allStaff.filter(
    (s) => (s.status || "").toLowerCase() === "pending"
  );

  const handleApprove = (staffId: string, staffName: string) => {
    approveStaff(staffId);
    toast({
      title: "Staff Approved",
      description: `${staffName} has been approved and can now access the system.`,
    });
  };

  const handleReject = (staffId: string, staffName: string) => {
    rejectStaff(staffId);
    toast({
      title: "Staff Rejected",
      description: `${staffName}'s application has been rejected.`,
      variant: "destructive",
    });
  };

  const StaffTable = ({
    staff,
    showActions = false,
  }: {
    staff: any[];
    showActions?: boolean;
  }) => (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-sm">Name</TableHead>
              <TableHead className="text-sm">Email</TableHead>
              <TableHead className="text-sm">Department</TableHead>
              <TableHead className="text-sm">Registration Date</TableHead>
              <TableHead className="text-sm">Status</TableHead>
              {showActions && (
                <TableHead className="text-right text-sm">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showActions ? 6 : 5}
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
                  {showActions && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
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

                {showActions && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleApprove(member.id, member.fullName || member.name)
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
                        handleReject(member.id, member.fullName || member.name)
                      }
                      className="flex-1 text-red-600 hover:text-red-700 dark:hover:text-blue-400 text-xs"
                    >
                      <UserX className="h-3 w-3 mr-1" />
                      Reject
                    </Button>
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
              <StaffTable staff={pendingStaffList} showActions={true} />
            </TabsContent>

            <TabsContent value="approved" className="mt-6">
              <StaffTable staff={approvedStaff} />
            </TabsContent>

            <TabsContent value="rejected" className="mt-6">
              <StaffTable staff={rejectedStaff} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
