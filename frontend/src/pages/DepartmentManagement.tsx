import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Users, UserCheck, UserX } from "lucide-react";

type Status = "pending" | "approved" | "rejected";

interface HoD {
  id: string;
  name: string;
  department: string;
  email: string;
  status: Status;
  active: boolean; // true only when approved & active
}

const initialHoDs: HoD[] = [
  {
    id: "1",
    name: "Dr. Smith",
    department: "IT Services",
    email: "smith@gondar.edu",
    status: "approved",
    active: true,
  },
  {
    id: "2",
    name: "Dr. Johnson",
    department: "Computer Science",
    email: "johnson@gondar.edu",
    status: "pending",
    active: false,
  },
  {
    id: "3",
    name: "Dr. Lee",
    department: "Facilities",
    email: "lee@gondar.edu",
    status: "rejected",
    active: false,
  },
  {
    id: "4",
    name: "Dr. Patel",
    department: "IT",
    email: "patel@gondar.edu",
    status: "approved",
    active: true,
  },
];

type ActionType = "approve" | "reject" | "deactivate" | "reapprove";

export default function DepartmentManagement() {
  const [hods, setHods] = useState<HoD[]>(initialHoDs);
  const [activeTab, setActiveTab] = useState<Status>("pending");
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("all");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: ActionType;
    hod: HoD | null;
  }>({ type: "approve", hod: null });

  // Derived values for summary cards
  const totalHods = hods.length;
  const activeHods = hods.filter(
    (h) => h.status === "approved" && h.active
  ).length;
  const inactiveHods = totalHods - activeHods;

  const departments = useMemo(
    () => Array.from(new Set(hods.map((h) => h.department))).sort(),
    [hods]
  );

  const listForTab = useMemo(() => {
    let rows = hods.filter((h) => {
      if (activeTab === "approved") return h.status === "approved" && h.active;
      return h.status === activeTab; // pending or rejected
    });

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          h.email.toLowerCase().includes(q) ||
          h.department.toLowerCase().includes(q)
      );
    }

    if (deptFilter !== "all") {
      rows = rows.filter((h) => h.department === deptFilter);
    }

    return rows;
  }, [hods, activeTab, search, deptFilter]);

  function openConfirm(type: ActionType, hod: HoD) {
    setPendingAction({ type, hod });
    setConfirmOpen(true);
  }

  function applyAction() {
    const action = pendingAction.type;
    const hod = pendingAction.hod;
    if (!hod) return setConfirmOpen(false);

    setHods((prev) => {
      return prev.map((h) => {
        if (h.id !== hod.id) return h;
        switch (action) {
          case "approve":
            return { ...h, status: "approved", active: true };
          case "reject":
            return { ...h, status: "rejected", active: false };
          case "deactivate":
            // Move approved -> rejected (inactive)
            return { ...h, status: "rejected", active: false };
          case "reapprove":
            return { ...h, status: "approved", active: true };
          default:
            return h;
        }
      });
    });

    setConfirmOpen(false);
  }

  const confirmText = useMemo(() => {
    switch (pendingAction.type) {
      case "approve":
        return "Are you sure you want to approve this Head of Department?";
      case "reject":
        return "Are you sure you want to reject this Head of Department?";
      case "deactivate":
        return "Are you sure you want to deactivate this Head of Department?";
      case "reapprove":
        return "Are you sure you want to re-approve this Head of Department?";
      default:
        return "Confirm action";
    }
  }, [pendingAction.type]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h1 className="text-3xl font-bold">Head of Department Management</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border border-blue-200 bg-blue-50 dark:bg-blue-950/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Total HoDs
            </CardTitle>
            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-800 dark:text-blue-200">
              {totalHods}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-green-200 bg-green-50 dark:bg-green-950/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
              Active HoDs
            </CardTitle>
            <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-800 dark:text-green-200">
              {activeHods}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-red-200 bg-red-50 dark:bg-red-950/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">
              Inactive HoDs
            </CardTitle>
            <UserX className="h-5 w-5 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-800 dark:text-red-200">
              {inactiveHods}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-md shadow-sm overflow-hidden border">
          {(
            [
              { key: "pending", label: "Pending" },
              { key: "approved", label: "Approved" },
              { key: "rejected", label: "Rejected" },
            ] as { key: Status; label: string }[]
          ).map((t, i) => (
            <Button
              key={t.key}
              variant={activeTab === t.key ? "default" : "ghost"}
              className={`rounded-none ${
                i === 0 ? "rounded-l-md" : i === 2 ? "rounded-r-md" : ""
              }`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </Button>
          ))}
        </div>

        {/* Search and filter */}
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Search by name, email, or department"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {activeTab === "pending"
              ? "Pending List"
              : activeTab === "approved"
              ? "Approved List"
              : "Rejected List"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {listForTab.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">No results</div>
            ) : (
              listForTab.map((h) => (
                <Card key={h.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-sm">{h.name}</div>
                      <div className="text-xs text-muted-foreground">{h.email}</div>
                      <div className="text-xs text-muted-foreground">Dept: {h.department}</div>
                      {activeTab === "approved" && (
                        <div className="mt-1 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                          Active
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-col gap-2 [&>button]:w-full">
                    {activeTab === "pending" && (
                      <>
                        <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => openConfirm("approve", h)}>
                          Approve
                        </Button>
                        <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => openConfirm("reject", h)}>
                          Reject
                        </Button>
                      </>
                    )}
                    {activeTab === "approved" && (
                      <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => openConfirm("deactivate", h)}>
                        Deactivate
                      </Button>
                    )}
                    {activeTab === "rejected" && (
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => openConfirm("reapprove", h)}>
                        Re-approve
                      </Button>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Email</TableHead>
                  {activeTab === "approved" && <TableHead>Status</TableHead>}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listForTab.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={activeTab === "approved" ? 5 : 4}
                      className="text-center text-muted-foreground"
                    >
                      No results
                    </TableCell>
                  </TableRow>
                ) : (
                  listForTab.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="font-medium">{h.name}</TableCell>
                      <TableCell>{h.department}</TableCell>
                      <TableCell>{h.email}</TableCell>
                      {activeTab === "approved" && (
                        <TableCell>
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            Active
                          </span>
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        {activeTab === "pending" && (
                          <div className="flex justify-end gap-2">
                            <Button
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => openConfirm("approve", h)}
                            >
                              Approve
                            </Button>
                            <Button
                              className="bg-red-600 hover:bg-red-700 text-white"
                              onClick={() => openConfirm("reject", h)}
                            >
                              Reject
                            </Button>
                          </div>
                        )}

                        {activeTab === "approved" && (
                          <Button
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => openConfirm("deactivate", h)}
                          >
                            Deactivate
                          </Button>
                        )}

                        {activeTab === "rejected" && (
                          <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => openConfirm("reapprove", h)}
                          >
                            Re-approve
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>{confirmText}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={applyAction}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
