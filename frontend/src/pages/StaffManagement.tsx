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

type Dean = {
  id: string;
  name: string;
  email: string;
  department: string;
  office: string;
  registeredDate: Date;
  status: string;
};

const mockDeans: Dean[] = [
  {
    id: "dean1",
    name: "Dr. Alice Carter",
    email: "alice@university.edu",
    department: "Engineering",
    office: "Eng-101",
    registeredDate: new Date("2023-09-01"),
    status: "pending",
  },
  {
    id: "dean2",
    name: "Dr. Bob Lee",
    email: "bob@university.edu",
    department: "Science",
    office: "Sci-201",
    registeredDate: new Date("2023-08-15"),
    status: "approved",
  },
  {
    id: "dean3",
    name: "Dr. Carol Smith",
    email: "carol@university.edu",
    department: "Business",
    office: "Bus-301",
    registeredDate: new Date("2023-07-10"),
    status: "rejected",
  },
  {
    id: "dean4",
    name: "Dr. David Kim",
    email: "david@university.edu",
    department: "Arts",
    office: "Arts-401",
    registeredDate: new Date("2023-09-10"),
    status: "approved",
  },
  {
    id: "dean5",
    name: "Dr. Emily Turner",
    email: "emily@university.edu",
    department: "Law",
    office: "Law-501",
    registeredDate: new Date("2023-06-20"),
    status: "pending",
  },
  {
    id: "dean6",
    name: "Dr. Frank Miller",
    email: "frank@university.edu",
    department: "Medicine",
    office: "Med-601",
    registeredDate: new Date("2023-05-05"),
    status: "approved",
  },
];

export default function DeanManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [tab, setTab] = useState("approved");
  const [deans, setDeans] = useState(mockDeans);

  const filteredDeans = deans.filter(
    (d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const approvedDeans = filteredDeans.filter((d) => d.status === "approved");
  const pendingDeans = filteredDeans.filter((d) => d.status === "pending");
  const rejectedDeans = filteredDeans.filter((d) => d.status === "rejected");

  const handleApprove = (id: string) => {
    setDeans((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "approved" } : d))
    );
  };
  const handleReject = (id: string) => {
    setDeans((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "rejected" } : d))
    );
  };
  const handleDeactivate = (id: string) => {
    setDeans((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "deactivated" } : d))
    );
  };

  const DeanTable = ({
    data,
    actions,
  }: {
    data: Dean[];
    actions: (d: Dean) => JSX.Element;
  }) => (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Office</TableHead>
            <TableHead>Department</TableHead>
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
                No deans found
              </TableCell>
            </TableRow>
          ) : (
            data.map((d) => (
              <TableRow key={d.id}>
                <TableCell>{d.name}</TableCell>
                <TableCell>{d.email}</TableCell>
                <TableCell>{d.office}</TableCell>
                <TableCell>{d.department}</TableCell>
                <TableCell>{d.registeredDate.toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge
                    className={
                      d.status === "approved"
                        ? "bg-green-100 text-green-800"
                        : d.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }
                  >
                    {d.status.charAt(0).toUpperCase() + d.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{actions(d)}</TableCell>
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
        <h1 className="text-2xl md:text-3xl font-bold">Dean Management</h1>
        <p className="text-muted-foreground">Manage deans in your university</p>
      </div>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Dean Directory</CardTitle>
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
              <DeanTable
                data={approvedDeans}
                actions={(d) => (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeactivate(d.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <UserX className="h-4 w-4" /> Deactivate
                    </Button>
                  </>
                )}
              />
            </TabsContent>
            <TabsContent value="pending">
              <DeanTable
                data={pendingDeans}
                actions={(d) => (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApprove(d.id)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <UserCheck className="h-4 w-4" /> Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(d.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <UserX className="h-4 w-4" /> Reject
                    </Button>
                  </>
                )}
              />
            </TabsContent>
            <TabsContent value="rejected">
              <DeanTable
                data={rejectedDeans}
                actions={(d) => (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleApprove(d.id)}
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
