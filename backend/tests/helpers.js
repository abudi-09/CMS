import bcrypt from "bcryptjs";
import request from "supertest";
import app from "../app.js";
import User from "../models/user.model.js";
import Complaint from "../models/complaint.model.js";
import { Category } from "../models/category.model.js";

let userCounter = 0;

export function uniqueEmail(prefix = "user") {
  userCounter += 1;
  return `${prefix}${userCounter}@test.com`;
}

export async function createUser({
  name = "Test User",
  email,
  password = "password123",
  role = "student",
  department = "IT",
  workingPlace = "Office",
  isApproved = true,
  isActive = true,
  isRejected = false,
  approvedByDean = false,
  isVerified = true,
} = {}) {
  const resolvedEmail = email || uniqueEmail(role);
  return User.create({
    name,
    email: resolvedEmail,
    password: await bcrypt.hash(password, 10),
    role,
    department:
      role === "student" || role === "staff" || role === "hod" || role === "dean"
        ? department
        : undefined,
    workingPlace:
      role === "staff" || role === "hod" || role === "dean"
        ? workingPlace
        : undefined,
    isApproved,
    isActive,
    isRejected,
    approvedByDean,
    isVerified,
  });
}

export async function seedOrg({
  department = "IT",
} = {}) {
  const admin = await createUser({
    email: uniqueEmail("admin"),
    role: "admin",
    isApproved: true,
    isActive: true,
  });
  const dean = await createUser({
    email: uniqueEmail("dean"),
    role: "dean",
    department,
    workingPlace: "Dean Office",
    isApproved: true,
    isActive: true,
  });
  const hod = await createUser({
    email: uniqueEmail("hod"),
    role: "hod",
    department,
    workingPlace: "HoD Office",
    isApproved: true,
    isActive: true,
  });
  const staff = await createUser({
    email: uniqueEmail("staff"),
    role: "staff",
    department,
    workingPlace: "Lab",
    isApproved: true,
    isActive: true,
  });
  const student = await createUser({
    email: uniqueEmail("student"),
    role: "student",
    department,
    isApproved: true,
    isActive: true,
  });
  const pendingStaff = await createUser({
    email: uniqueEmail("pending-staff"),
    role: "staff",
    department,
    workingPlace: "Lab",
    isApproved: false,
    isActive: false,
    isRejected: false,
  });
  return { admin, dean, hod, staff, student, pendingStaff };
}

export async function loginAgent(agent, email, password = "password123") {
  return agent.post("/api/auth/login").send({ email, password });
}

export async function agentFor(user, password = "password123") {
  const agent = request.agent(app);
  const login = await loginAgent(agent, user.email, password);
  if (login.status !== 200) {
    throw new Error(`Login failed for ${user.email}: ${login.status} ${JSON.stringify(login.body)}`);
  }
  return agent;
}

export async function createComplaint({
  submittedBy,
  title = "Test complaint",
  description = "Test description",
  category = "Facilities",
  department = "IT",
  priority = "Medium",
  status = "Pending",
  submittedTo = "admin",
  assignedTo = null,
  assignedToRole = null,
  recipientRole = null,
  recipientId = null,
  sourceRole = "student",
  assignmentPath = ["student"],
  isAnonymous = false,
  assignedAt = null,
} = {}) {
  return Complaint.create({
    title,
    description,
    category,
    department,
    priority,
    status,
    submittedTo,
    submittedBy,
    assignedTo,
    assignedToRole,
    recipientRole,
    recipientId,
    sourceRole,
    assignmentPath,
    isAnonymous,
    assignedAt,
  });
}

export async function createCategory(name = "Facilities", description = "Facility issues") {
  return Category.create({ name, description, status: "active" });
}
