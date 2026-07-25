import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";
import { Category } from "../models/category.model.js";
import { seedOrg, agentFor } from "./helpers.js";

describe("Categories API", () => {
  it("lets any authenticated user list categories", async () => {
    await Category.create({ name: "Facilities", status: "active" });
    const { student } = await seedOrg();
    const agent = await agentFor(student);

    const res = await agent.get("/api/categories");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((c) => c.name === "Facilities")).toBe(true);
  });

  it("creates a category as admin", async () => {
    const { admin } = await seedOrg();
    const agent = await agentFor(admin);

    const res = await agent.post("/api/categories").send({
      name: "IT Support",
      roles: ["student", "staff"],
    });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("IT Support");
    expect(res.body.roles).toEqual(["student", "staff"]);
  });

  it("updates a category as admin", async () => {
    const { admin } = await seedOrg();
    const cat = await Category.create({ name: "Old Name", status: "active" });
    const agent = await agentFor(admin);

    const res = await agent.patch(`/api/categories/${cat._id}`).send({
      name: "New Name",
      description: "Updated description",
      status: "inactive",
    });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("New Name");
    expect(res.body.description).toBe("Updated description");
    expect(res.body.status).toBe("inactive");
  });

  it("deletes an inactive category as admin", async () => {
    const { admin } = await seedOrg();
    const cat = await Category.create({ name: "To Delete", status: "inactive" });
    const agent = await agentFor(admin);

    const res = await agent.delete(`/api/categories/${cat._id}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);

    const gone = await Category.findById(cat._id);
    expect(gone).toBeNull();
  });

  it("returns category stats summary for admin", async () => {
    const { admin } = await seedOrg();
    await Category.create({ name: "Active Cat", status: "active" });
    await Category.create({ name: "Inactive Cat", status: "inactive" });
    const agent = await agentFor(admin);

    const res = await agent.get("/api/categories/stats/summary");
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(2);
    expect(res.body).toHaveProperty("active");
    expect(res.body).toHaveProperty("inactive");
  });

  it("returns 400 when creating a category without a name", async () => {
    const { admin } = await seedOrg();
    const agent = await agentFor(admin);

    const res = await agent.post("/api/categories").send({ roles: ["student"] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name is required/i);
  });

  it("returns 409 when creating a duplicate category", async () => {
    const { admin } = await seedOrg();
    await Category.create({ name: "Duplicate", status: "active" });
    const agent = await agentFor(admin);

    const res = await agent.post("/api/categories").send({ name: "Duplicate" });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it("returns 400 when deleting an active category", async () => {
    const { admin } = await seedOrg();
    const cat = await Category.create({ name: "Still Active", status: "active" });
    const agent = await agentFor(admin);

    const res = await agent.delete(`/api/categories/${cat._id}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/inactive before deletion/i);
  });

  it("returns 403 when a student tries to create a category", async () => {
    const { student } = await seedOrg();
    const agent = await agentFor(student);

    const res = await agent.post("/api/categories").send({ name: "Blocked" });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/forbidden/i);
  });

  it("returns 404 when updating a missing category", async () => {
    const { admin } = await seedOrg();
    const agent = await agentFor(admin);

    const res = await agent
      .patch("/api/categories/507f1f77bcf86cd799439011")
      .send({ name: "Missing" });
    expect(res.status).toBe(404);
  });

  it("returns 401 when listing categories without auth", async () => {
    const res = await request(app).get("/api/categories");
    expect(res.status).toBe(401);
  });
});
