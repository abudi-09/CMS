import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  Users,
} from "lucide-react";
import { Complaint } from "./ComplaintCard";

interface SummaryCardsProps {
  complaints: Complaint[];
  userRole?: "user" | "staff" | "admin" | "headOfDepartment";
}

export function SummaryCards({
  complaints,
  userRole = "user",
}: SummaryCardsProps) {
  const stats = {
    total: complaints.length,
    pending: complaints.filter((c) => c.status === "Pending").length,
    inProgress: complaints.filter((c) => c.status === "In Progress").length,
    resolved: complaints.filter((c) => c.status === "Resolved").length,
    closed: complaints.filter((c) => c.status === "Closed").length,
    // Replace unassigned with total students (assuming complaints from students)
    totalStudents: complaints.filter((c) => c.submittedBy).length,
  };

  const cards = [
    {
      title: "Total Complaints",
      value: stats.total,
      icon: FileText,
      color: "text-primary",
      bgColor: "bg-primary/10",
      show: true,
    },
    {
      title: "Pending",
      value: stats.pending,
      icon: Clock,
      color: "text-yellow-600 dark:text-yellow-500",
      bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
      show: true,
    },
    {
      title: "In Progress",
      value: stats.inProgress,
      icon: AlertCircle,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
      show: true,
    },
    {
      title: "Resolved",
      value: stats.resolved,
      icon: CheckCircle,
      color: "text-success",
      bgColor: "bg-success/10",
      show: true,
    },
    {
      title: userRole === "user" ? "Closed" : "Total Students",
      value: userRole === "user" ? stats.closed : stats.totalStudents,
      icon: userRole === "user" ? XCircle : Users,
      color:
        userRole === "user"
          ? "text-muted-foreground"
          : "text-orange-600 dark:text-orange-400",
      bgColor:
        userRole === "user"
          ? "bg-muted/50"
          : "bg-orange-50 dark:bg-orange-950/20",
      show: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
      {cards
        .filter((card) => card.show)
        .map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className={`${card.bgColor} p-1.5 sm:p-2 rounded-lg`}>
                  <Icon className={`h-3 w-3 sm:h-4 sm:w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-lg sm:text-2xl font-bold">
                  {card.value}
                </div>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  {index === 0
                    ? "Total submitted"
                    : index === 1
                    ? "Awaiting review"
                    : index === 2
                    ? "Being handled"
                    : index === 3
                    ? "Successfully resolved"
                    : userRole === "user"
                    ? "Completed cases"
                    : "Need assignment"}
                </p>
              </CardContent>
            </Card>
          );
        })}
    </div>
  );
}
