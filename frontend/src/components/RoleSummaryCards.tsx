import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Users, UserCog, UserCheck } from "lucide-react";

type RoleCounts = {
  deans: number;
  departmentHeads: number;
  students: number;
  staff: number;
};

export function RoleSummaryCards({ counts }: { counts: RoleCounts }) {
  const cards = [
    {
      title: "Deans",
      value: counts.deans,
      icon: GraduationCap,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/20",
      hint: "Active deans",
    },
    {
      title: "Department Heads",
      value: counts.departmentHeads,
      icon: UserCog,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950/20",
      hint: "Active HoDs",
    },
    {
      title: "Students",
      value: counts.students,
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
      hint: "Active users",
    },
    {
      title: "Staff",
      value: counts.staff,
      icon: UserCheck,
      color: "text-green-600 dark:text-green-500",
      bgColor: "bg-green-50 dark:bg-green-950/20",
      hint: "Approved & active",
    },
  ];

  return (
    <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <Card key={i} className="hover:shadow-md transition-shadow w-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {c.title}
              </CardTitle>
              <div className={`${c.bgColor} p-2 rounded-lg`}>
                <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${c.color}`} />
              </div>
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <div className="text-xl sm:text-2xl font-bold">{c.value}</div>
              <p className="text-xs text-muted-foreground hidden sm:block mt-0.5">
                {c.hint}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
