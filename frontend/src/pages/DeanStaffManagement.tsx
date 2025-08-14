import { useState } from "react";
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
import { UserCheck, UserX, Clock, Users, Mail, Building } from "lucide-react";

type Staff = {
  id: string;
  name: string;
  email: string;
  department: string;
  workingPlace: string;
  registeredDate: Date;
  status: string;
};

const mockStaff = [
  {
    id: "st1",
    name: "Alex Johnson",
    email: "alex@university.edu",
    department: "IT",
    workingPlace: "IT Office",
    registeredDate: new Date("2023-09-01"),
    status: "pending",
  },
  {
    id: "st2",
    name: "Maria Lopez",
    email: "maria@university.edu",
    department: "IT",
    workingPlace: "IT Lab",
    registeredDate: new Date("2023-08-15"),
    status: "approved",
  },
  {
    id: "st3",
    name: "David Kim",
    email: "david@university.edu",
    department: "IT",
    workingPlace: "IT Helpdesk",
    registeredDate: new Date("2023-07-10"),
    status: "rejected",
  },
  {
    id: "st4",
    name: "Nina Patel",
    email: "nina@university.edu",
    department: "IT",
    workingPlace: "IT Office",
    registeredDate: new Date("2023-09-10"),
    status: "approved",
  },
  {
    id: "st5",
    name: "Brian Smith",
    email: "brian@university.edu",
    department: "IT",
    workingPlace: "Server Room",
    registeredDate: new Date("2023-06-20"),
    status: "pending",
  },
  {
    id: "st6",
    name: "Linda Green",
    email: "linda@university.edu",
    department: "IT",
    workingPlace: "IT Support",
    registeredDate: new Date("2023-05-05"),
    status: "approved",
  },
  {
    id: "st7",
    name: "Oscar White",
    email: "oscar@university.edu",
    department: "IT",
    workingPlace: "IT Lab",
    registeredDate: new Date("2023-04-12"),
    status: "rejected",
  },
  {
    id: "st8",
    name: "Priya Singh",
    email: "priya@university.edu",
    department: "IT",
    workingPlace: "IT Office",
    registeredDate: new Date("2023-03-30"),
    status: "approved",
  },
  {
    id: "st9",
    name: "Tom Brown",
    email: "tom@university.edu",
    department: "IT",
    workingPlace: "IT Helpdesk",
    registeredDate: new Date("2023-02-18"),
    status: "pending",
  },
  {
    id: "st10",
    name: "Emily Clark",
    email: "emily@university.edu",
    department: "IT",
    workingPlace: "IT Lab",
    registeredDate: new Date("2023-01-25"),
    status: "approved",
  },
];

export default function DeanStaffManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [tab, setTab] = useState("approved");
  const [staff, setStaff] = useState(mockStaff);

  const filteredStaff = staff.filter(
    (s) =>
      (s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
      s.department === "IT"
  );

  const approvedStaff = filteredStaff.filter((s) => s.status === "approved");
  const pendingStaff = filteredStaff.filter((s) => s.status === "pending");
  const rejectedStaff = filteredStaff.filter((s) => s.status === "rejected");

  const handleApprove = (id: string) => {
    setStaff((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "approved" } : s))
    );
  };
  const handleReject = (id: string) => {
    setStaff((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "rejected" } : s))
    );
  };
  const handleDeactivate = (id: string) => {
    setStaff((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "deactivated" } : s))
    );
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
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Staff Management</h1>
        <p className="text-muted-foreground">Manage staff in your department</p>
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
            </TabsList>
            <TabsContent value="approved">
              <StaffTable
                data={approvedStaff}
                actions={(s) => (
                  <>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleApprove(s.id)}
                    className="text-green-600 hover:text-green-700"
                  >
                    <UserCheck className="h-4 w-4" /> Re-approve
                  </Button>
                )}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
