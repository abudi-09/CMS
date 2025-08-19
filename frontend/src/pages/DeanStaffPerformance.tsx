import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Star,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  department: string;
  workPlace: string;
  totalAssigned: number;
  resolved: number;
  pending: number;
  inProgress: number;
  averageRating: number;
  successRate: number;
  avgResolutionTime: number; // in hours
  profilePicture?: string;
}

const mockStaffData: StaffMember[] = [
  {
    id: "1",
    name: "Dr. Sarah Johnson",
    email: "sarah.johnson@university.edu",
    department: "IT Services",
    workPlace: "Technology Center",
    totalAssigned: 45,
    resolved: 42,
    pending: 2,
    inProgress: 1,
    averageRating: 4.8,
    successRate: 93.3,
    avgResolutionTime: 18,
  },
  {
    id: "2",
    name: "Mark Thompson",
    email: "mark.thompson@university.edu",
    department: "Academic Affairs",
    workPlace: "Administration Building",
    totalAssigned: 38,
    resolved: 35,
    pending: 3,
    inProgress: 0,
    averageRating: 4.5,
    successRate: 92.1,
    avgResolutionTime: 24,
  },
  {
    id: "3",
    name: "Lisa Chen",
    email: "lisa.chen@university.edu",
    department: "Facilities",
    workPlace: "Maintenance Office",
    totalAssigned: 52,
    resolved: 47,
    pending: 4,
    inProgress: 1,
    averageRating: 4.6,
    successRate: 90.4,
    avgResolutionTime: 30,
  },
  {
    id: "4",
    name: "James Wilson",
    email: "james.wilson@university.edu",
    department: "Student Services",
    workPlace: "Student Center",
    totalAssigned: 29,
    resolved: 24,
    pending: 3,
    inProgress: 2,
    averageRating: 4.2,
    successRate: 82.8,
    avgResolutionTime: 36,
  },
];

export default function DeanStaffPerformance() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("successRate");

  const filteredStaff = mockStaffData.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedStaff = [...filteredStaff].sort((a, b) => {
    if (sortBy === "successRate") return b.successRate - a.successRate;
    if (sortBy === "resolved") return b.resolved - a.resolved;
    return b.totalAssigned - a.totalAssigned;
  });

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-3xl font-bold mb-2">Dean Department Performance</h1>
      <p className="text-muted-foreground mb-6">
        Performance analytics for all staff in the Dean's department.
      </p>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Dean Department Performance</CardTitle>
          <div className="flex flex-wrap gap-2 mt-4">
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-md text-base md:text-lg py-2 md:py-3 px-4 transition-all"
            />
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="successRate">Success Rate</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="totalAssigned">Total Assigned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile: cards */}
          <div className="md:hidden space-y-3">
            {sortedStaff.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                No staff found
              </div>
            ) : (
              sortedStaff.map((s) => (
                <div key={s.id} className="border rounded-lg p-4 bg-card">
                  <div className="flex items-start gap-3">
                    <Avatar>
                      <AvatarImage src={s.profilePicture} />
                      <AvatarFallback>{s.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-base">{s.name}</p>
                          <p className="text-xs text-muted-foreground break-all">
                            {s.email}
                          </p>
                        </div>
                        <Badge className="bg-green-100 text-green-800">
                          {s.successRate}%
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {s.department} • {s.workPlace}
                      </p>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-lg font-bold text-primary">
                            {s.totalAssigned}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Assigned
                          </p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-success">
                            {s.resolved}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Resolved
                          </p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-destructive">
                            {s.pending}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Pending
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-500 mr-1" />
                          {s.averageRating}
                        </span>
                        <span>
                          In Progress:{" "}
                          <span className="font-medium">{s.inProgress}</span>
                        </span>
                        <span>{s.avgResolutionTime}h</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Work Place</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Resolved</TableHead>
                  <TableHead>Pending</TableHead>
                  <TableHead>In Progress</TableHead>
                  <TableHead>Success Rate</TableHead>
                  <TableHead>Avg. Rating</TableHead>
                  <TableHead>Avg. Resolution Time (hrs)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStaff.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={11}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No staff found
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedStaff.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar>
                            <AvatarImage src={s.profilePicture} />
                            <AvatarFallback>{s.name[0]}</AvatarFallback>
                          </Avatar>
                          <span>{s.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{s.email}</TableCell>
                      <TableCell>{s.department}</TableCell>
                      <TableCell>{s.workPlace}</TableCell>
                      <TableCell>{s.totalAssigned}</TableCell>
                      <TableCell>{s.resolved}</TableCell>
                      <TableCell>{s.pending}</TableCell>
                      <TableCell>{s.inProgress}</TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800">
                          {s.successRate}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Star className="inline-block h-4 w-4 text-yellow-500 mr-1" />
                        {s.averageRating}
                      </TableCell>
                      <TableCell>{s.avgResolutionTime}</TableCell>
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
