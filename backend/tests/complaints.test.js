import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";
import Complaint from "../models/complaint.model.js";
import { createUser, loginAgent } from "./helpers.js";

describe("Complaints API", () => {
  it("lets a student submit and list their complaints", async () => {
    const student = await createUser({
      email: "complain@test.com",
      role: "student",
    });

    const agent = request.agent(app);
    await loginAgent(agent, "complain@test.com");

    const submit = await agent.post("/api/complaints/submit").send({
      title: "Broken projector",
      description: "Projector not working in room 101",
      category: "Facilities",
      priority: "Medium",
      submittedTo: "admin",
    });

    expect(submit.status).toBe(201);

    const list = await agent.get("/api/complaints/my-complaints");
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body.length).toBeGreaterThanOrEqual(1);
    expect(list.body[0].title).toBe("Broken projector");
  });

  it("returns assigned complaints for approved staff", async () => {
    const student = await createUser({
      email: "submitter@test.com",
      role: "student",
    });
    const staff = await createUser({
      email: "staff@test.com",
      role: "staff",
      isApproved: true,
      isActive: true,
    });

    await Complaint.create({
      title: "WiFi issue",
      description: "No WiFi in lab",
      category: "IT",
      department: "IT",
      priority: "High",
      status: "Pending",
      submittedBy: student._id,
      assignedTo: staff._id,
      sourceRole: "student",
      assignmentPath: ["student"],
    });

    const agent = request.agent(app);
    await loginAgent(agent, "staff@test.com");

    const res = await agent.get("/api/complaints/assigned");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].title).toBe("WiFi issue");
  });
});
