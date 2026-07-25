import { describe, it, expect } from "vitest";
import request from "supertest";
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import app from "../app.js";
import {
  protectRoute,
  adminOnly,
  adminOrDean,
  adminDeanOrHod,
  staffOnly,
  deanOnly,
  hodOnly,
} from "../middleware/protectRoute.js";
import corsMiddleware from "../middleware/cors.js";
import { createUser, loginAgent } from "./helpers.js";

describe("protectRoute middleware", () => {
  it("returns 401 without cookie", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns 401 for invalid token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", "jwt=not-a-valid-token");
    expect(res.status).toBe(401);
  });

  it("blocks deactivated accounts", async () => {
    const user = await createUser({
      email: "inactive@test.com",
      role: "student",
      isActive: false,
      isApproved: true,
    });
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", `jwt=${token}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("inactive-account");
  });
});

describe("role guard middleware", () => {
  function buildApp(guard) {
    const testApp = express();
    testApp.use(cookieParser());
    testApp.get(
      "/test",
      protectRoute,
      guard,
      (_req, res) => res.json({ ok: true })
    );
    return testApp;
  }

  async function authCookieFor(user) {
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    return `jwt=${token}`;
  }

  it("enforces adminOnly", async () => {
    const admin = await createUser({ email: "mw-admin@test.com", role: "admin" });
    const student = await createUser({ email: "mw-student@test.com", role: "student" });
    const testApp = buildApp(adminOnly);
    expect(
      (await request(testApp).get("/test").set("Cookie", await authCookieFor(admin))).status
    ).toBe(200);
    expect(
      (await request(testApp).get("/test").set("Cookie", await authCookieFor(student))).status
    ).toBe(403);
  });

  it("enforces deanOnly, hodOnly, staffOnly, adminOrDean, adminDeanOrHod", async () => {
    const dean = await createUser({ email: "mw-dean@test.com", role: "dean" });
    const hod = await createUser({ email: "mw-hod@test.com", role: "hod" });
    const staff = await createUser({
      email: "mw-staff@test.com",
      role: "staff",
      isApproved: true,
      isActive: true,
    });
    const student = await createUser({ email: "mw-student2@test.com", role: "student" });

    const deanApp = buildApp(deanOnly);
    expect(
      (await request(deanApp).get("/test").set("Cookie", await authCookieFor(dean))).status
    ).toBe(200);
    expect(
      (await request(deanApp).get("/test").set("Cookie", await authCookieFor(student))).status
    ).toBe(403);

    const hodApp = buildApp(hodOnly);
    expect(
      (await request(hodApp).get("/test").set("Cookie", await authCookieFor(hod))).status
    ).toBe(200);

    const staffApp = buildApp(staffOnly);
    expect(
      (await request(staffApp).get("/test").set("Cookie", await authCookieFor(staff))).status
    ).toBe(200);
    const unapprovedStaff = await createUser({
      email: "mw-unapproved@test.com",
      role: "staff",
      isApproved: false,
    });
    expect(
      (
        await request(staffApp)
          .get("/test")
          .set("Cookie", await authCookieFor(unapprovedStaff))
      ).status
    ).toBe(403);

    const adminDeanApp = buildApp(adminOrDean);
    const admin = await createUser({ email: "mw-admin2@test.com", role: "admin" });
    expect(
      (await request(adminDeanApp).get("/test").set("Cookie", await authCookieFor(dean))).status
    ).toBe(200);
    expect(
      (await request(adminDeanApp).get("/test").set("Cookie", await authCookieFor(admin))).status
    ).toBe(200);

    const allThreeApp = buildApp(adminDeanOrHod);
    expect(
      (await request(allThreeApp).get("/test").set("Cookie", await authCookieFor(hod))).status
    ).toBe(200);
  });

  it("returns 401 when user no longer exists", async () => {
    const user = await createUser({ email: "gone@test.com", role: "student" });
    const cookie = await authCookieFor(user);
    await user.deleteOne();
    const testApp = buildApp(adminOnly);
    const res = await request(testApp).get("/test").set("Cookie", cookie);
    expect(res.status).toBe(401);
  });
});

describe("cors middleware", () => {
  it("allows configured origins and rejects unknown origins", async () => {
    const testApp = express();
    testApp.use(corsMiddleware);
    testApp.get("/", (_req, res) => res.send("ok"));

    const allowed = await request(testApp)
      .get("/")
      .set("Origin", "http://localhost:5173");
    expect(allowed.status).toBe(200);

    const blocked = await request(testApp)
      .get("/")
      .set("Origin", "http://evil.example.com");
    expect(blocked.status).toBe(500);
  });
});
