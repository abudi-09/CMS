import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Mail, Building } from "lucide-react";

interface DeanMember {
  id: string;
  fullName?: string;
  name?: string;
  email: string;
  department?: string;
  office?: string;
  registeredDate?: string | Date;
  status: string;
}

const mockDeans: DeanMember[] = [
  {
    id: "dean1",
    fullName: "Dr. Alice Carter",
    email: "alice.carter@university.edu",
    department: "Engineering",
    office: "Eng-101",
    registeredDate: "2023-01-10",
    status: "active",
  },
  {
    id: "dean2",
    fullName: "Dr. Bob Lee",
    email: "bob.lee@university.edu",
    department: "Science",
    office: "Sci-201",
    registeredDate: "2022-09-15",
    status: "active",
  },
  {
    id: "dean3",
    fullName: "Dr. Carol Smith",
    email: "carol.smith@university.edu",
    department: "Business",
    office: "Bus-301",
    registeredDate: "2021-05-20",
    status: "inactive",
  },
  {
    id: "dean4",
    fullName: "Dr. David Kim",
    email: "david.kim@university.edu",
    department: "Arts",
    office: "Arts-401",
    registeredDate: "2020-11-05",
    status: "active",
  },
];

export function DeanManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const allDeans = mockDeans;
  // Filter deans by search term
  const filteredDeans = allDeans.filter((d) => {
    const term = searchTerm.toLowerCase();
    return (
      (d.fullName || d.name || "").toLowerCase().includes(term) ||
      (d.email || "").toLowerCase().includes(term) ||
      (d.department || "").toLowerCase().includes(term) ||
      (d.office || "").toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dean Management</h1>
        <p className="text-muted-foreground">
          Directory and status of all deans
        </p>
      </div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Deans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredDeans.filter((d) => d.status === "active").length}
            </div>
            <p className="text-xs text-muted-foreground">Currently serving</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Inactive Deans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredDeans.filter((d) => d.status === "inactive").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Not currently serving
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Deans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredDeans.length}</div>
            <p className="text-xs text-muted-foreground">
              All registered deans
            </p>
          </CardContent>
        </Card>
      </div>
      {/* Dean Directory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Dean Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-md mb-4">
            <Input
              placeholder="Search dean by name, email, department, or office..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-sm">Name</TableHead>
                  <TableHead className="text-sm">Email</TableHead>
                  <TableHead className="text-sm">Department</TableHead>
                  <TableHead className="text-sm">Office</TableHead>
                  <TableHead className="text-sm">Registration Date</TableHead>
                  <TableHead className="text-sm">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeans.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No deans found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDeans.map((dean) => (
                    <TableRow key={dean.id} className="dark:hover:bg-accent/10">
                      <TableCell className="font-medium text-sm">
                        {dean.fullName || dean.name}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {dean.email}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {dean.department}
                      </TableCell>
                      <TableCell className="text-sm">{dean.office}</TableCell>
                      <TableCell className="text-sm">
                        {dean.registeredDate
                          ? typeof dean.registeredDate === "string"
                            ? dean.registeredDate
                            : new Date(dean.registeredDate).toLocaleDateString()
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            dean.status === "active"
                              ? "bg-green-100 text-green-800 text-xs"
                              : "bg-gray-100 text-gray-800 text-xs"
                          }
                        >
                          {dean.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default DeanManagement;
