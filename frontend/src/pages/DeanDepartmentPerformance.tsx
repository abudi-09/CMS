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

interface DepartmentPerformance {
  id: string;
  department: string;
  head: string;
  totalAssigned: number;
  resolved: number;
  avgResolutionTime: number; // in hours
  satisfaction: number;
}

const mockDepartmentData: DepartmentPerformance[] = [
  {
    id: "1",
    department: "IT Services",
    head: "Dr. Smith",
    totalAssigned: 45,
    resolved: 42,
    avgResolutionTime: 18,
    satisfaction: 93,
  },
  {
    id: "2",
    department: "Computer Science",
    head: "Dr. Johnson",
    totalAssigned: 38,
    resolved: 35,
    avgResolutionTime: 24,
    satisfaction: 92,
  },
  {
    id: "3",
    department: "Information Systems",
    head: "Dr. Lee",
    totalAssigned: 52,
    resolved: 47,
    avgResolutionTime: 30,
    satisfaction: 90,
  },
  {
    id: "4",
    department: "IT",
    head: "Dr. Patel",
    totalAssigned: 29,
    resolved: 24,
    avgResolutionTime: 36,
    satisfaction: 88,
  },
];

export default function DeanDepartmentPerformance() {
  const [sortBy, setSortBy] = useState("satisfaction");

  const sortedDepartments = [...mockDepartmentData].sort((a, b) => {
    if (sortBy === "satisfaction") return b.satisfaction - a.satisfaction;
    if (sortBy === "resolved") return b.resolved - a.resolved;
    return b.totalAssigned - a.totalAssigned;
  });

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-3xl font-bold mb-2">Department Performance</h1>
      <p className="text-muted-foreground mb-6">
        Performance analytics for all departments.
      </p>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Department Performance</CardTitle>
          <div className="flex flex-wrap gap-2 mt-4">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="satisfaction">Satisfaction</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="totalAssigned">Total Assigned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead>Head of Department</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Resolved</TableHead>
                <TableHead>Avg. Resolution Time (hrs)</TableHead>
                <TableHead>Satisfaction (%)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedDepartments.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No departments found
                  </TableCell>
                </TableRow>
              ) : (
                sortedDepartments.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.department}</TableCell>
                    <TableCell>{d.head}</TableCell>
                    <TableCell>{d.totalAssigned}</TableCell>
                    <TableCell>{d.resolved}</TableCell>
                    <TableCell>{d.avgResolutionTime}</TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-800">
                        {d.satisfaction}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
