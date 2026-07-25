import { useEffect, useMemo, useState } from "react";
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
import { Search, Star, RefreshCcw } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { getDeanStaffPerformanceApi } from "@/lib/api";

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
  avgResolutionTime: number;
  profilePicture?: string;
}

export default function DeanStaffPerformance() {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("successRate");

  const loadStaff = async () => {
    setLoading(true);
    try {
      const data = await getDeanStaffPerformanceApi();
      const mapped: StaffMember[] = (data.staff || []).map((s) => ({
        id: s.staffId,
        name: s.name,
        email: s.email || "",
        department: s.department || "",
        workPlace: s.workPlace || "",
        totalAssigned: s.totalAssigned,
        resolved: s.resolved,
        pending: s.pending,
        inProgress: s.inProgress,
        averageRating: s.avgRating,
        successRate: s.successRate,
        avgResolutionTime: s.avgResolutionHours,
        profilePicture: s.profilePicture,
      }));
      setStaffMembers(mapped);
    } catch (e) {
      toast({
        title: "Failed to load staff performance",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
      setStaffMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const filteredStaff = staffMembers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.workPlace.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedStaff = useMemo(() => {
    return [...filteredStaff].sort((a, b) => {
      if (sortBy === "successRate") return b.successRate - a.successRate;
      if (sortBy === "resolved") return b.resolved - a.resolved;
      if (sortBy === "averageRating") return b.averageRating - a.averageRating;
      return b.totalAssigned - a.totalAssigned;
    });
  }, [filteredStaff, sortBy]);

  const summary = {
    total: staffMembers.length,
    avgSuccess:
      staffMembers.length > 0
        ? (
            staffMembers.reduce((sum, s) => sum + s.successRate, 0) /
            staffMembers.length
          ).toFixed(1)
        : "0",
    totalResolved: staffMembers.reduce((sum, s) => sum + s.resolved, 0),
  };

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dean Department Performance</h1>
          <p className="text-muted-foreground">
            Performance analytics for staff in your department.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadStaff} disabled={loading}>
          <RefreshCcw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Staff Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.avgSuccess}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Resolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalResolved}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Staff Performance</CardTitle>
          <div className="flex flex-wrap gap-2 mt-4">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="successRate">Success Rate</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="totalAssigned">Total Assigned</SelectItem>
                <SelectItem value="averageRating">Avg. Rating</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Loading staff performance...
            </p>
          ) : (
            <>
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
                              <p className="text-lg font-bold text-green-600">
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
