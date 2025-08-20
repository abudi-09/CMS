import { useState } from "react";
import StaffManagement from "./StaffManagement";

// Mock IT department staff data
const mockITStaff = [
  {
    id: "it1",
    name: "Amanuel Tadesse",
    email: "amanuel.it@university.edu",
    department: "Information Technology",
    position: "Network Engineer",
    registeredDate: new Date("2023-09-01"),
    status: "approved",
  },
  {
    id: "it2",
    name: "Selamawit Bekele",
    email: "selamawit.it@university.edu",
    department: "IT",
    position: "System Administrator",
    registeredDate: new Date("2023-08-15"),
    status: "pending",
  },
  {
    id: "it3",
    name: "Kebede Alemu",
    email: "kebede.it@university.edu",
    department: "Information Technology",
    position: "Software Developer",
    registeredDate: new Date("2023-07-10"),
    status: "rejected",
  },
  {
    id: "it4",
    name: "Mulugeta Tesfaye",
    email: "mulugeta.it@university.edu",
    department: "IT",
    position: "Database Administrator",
    registeredDate: new Date("2023-06-20"),
    status: "approved",
  },
  {
    id: "it5",
    name: "Hanna Gebremedhin",
    email: "hanna.it@university.edu",
    department: "Information Technology",
    position: "Helpdesk Specialist",
    registeredDate: new Date("2023-05-15"),
    status: "pending",
  },
  {
    id: "it6",
    name: "Samuel Worku",
    email: "samuel.it@university.edu",
    department: "IT",
    position: "Security Analyst",
    registeredDate: new Date("2023-04-10"),
    status: "approved",
  },
  // Extra approved staff to ensure pagination is visible on default tab
  {
    id: "it7",
    name: "Yared Mekonnen",
    email: "yared.it@university.edu",
    department: "IT",
    position: "Systems Engineer",
    registeredDate: new Date("2023-03-05"),
    status: "approved",
  },
  {
    id: "it8",
    name: "Ruth Alem",
    email: "ruth.it@university.edu",
    department: "Information Technology",
    position: "QA Engineer",
    registeredDate: new Date("2023-02-12"),
    status: "approved",
  },
  {
    id: "it9",
    name: "Brook Hailemariam",
    email: "brook.it@university.edu",
    department: "IT",
    position: "DevOps Specialist",
    registeredDate: new Date("2023-01-28"),
    status: "approved",
  },
  {
    id: "it10",
    name: "Lulit Getachew",
    email: "lulit.it@university.edu",
    department: "Information Technology",
    position: "UI/UX Designer",
    registeredDate: new Date("2022-12-18"),
    status: "approved",
  },
];

export default function HODStaffManagement() {
  // Pass mockITStaff as a prop or override StaffManagement's state if needed
  // For demonstration, we can render a table or pass to StaffManagement
  // If StaffManagement accepts a prop, use: <StaffManagement staff={mockITStaff} />
  // Otherwise, display mock data here
  return (
    <StaffManagement initialStaff={mockITStaff} showDepartmentColumn={false} />
  );
}
