import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import User from "../models/user.model.js";
import VerificationToken from "../models/verificationToken.model.js";
import { createUser } from "./helpers.js";

describe("Email verification API", () => {
  let unverifiedUser;
  let validToken;

  beforeEach(async () => {
    unverifiedUser = await createUser({
      email: "unverified@test.com",
      isVerified: false,
    });
    validToken = "abc123validtoken";
    await VerificationToken.create({
      userId: unverifiedUser._id,
      token: validToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
  });

  it("GET /api/verify-email rejects missing token", async () => {
    const res = await request(app).get("/api/verify-email");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/token is required/i);
  });

  it("GET /api/verify-email rejects invalid token", async () => {
    const res = await request(app).get("/api/verify-email").query({
      token: "not-a-real-token",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid or expired/i);
  });

  it("GET /api/verify-email rejects expired token", async () => {
    await VerificationToken.deleteMany({ userId: unverifiedUser._id });
    await VerificationToken.create({
      userId: unverifiedUser._id,
      token: "expired-token",
      expiresAt: new Date(Date.now() - 1000),
    });

    const res = await request(app).get("/api/verify-email").query({
      token: "expired-token",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/expired/i);
  });

  it("GET /api/verify-email verifies user and deletes token", async () => {
    const res = await request(app).get("/api/verify-email").query({
      token: validToken,
    });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/verified successfully/i);

    const user = await User.findById(unverifiedUser._id);
    expect(user.isVerified).toBe(true);

    const tokenDoc = await VerificationToken.findOne({ token: validToken });
    expect(tokenDoc).toBeNull();
  });

  it("POST /api/resend-verification sends new token for unverified user", async () => {
    const res = await request(app)
      .post("/api/resend-verification")
      .send({ email: "unverified@test.com" });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/verification email resent/i);

    const tokens = await VerificationToken.find({ userId: unverifiedUser._id });
    expect(tokens.length).toBe(1);
    expect(tokens[0].token).not.toBe(validToken);
  });

  it("POST /api/resend-verification rejects unknown email", async () => {
    const res = await request(app)
      .post("/api/resend-verification")
      .send({ email: "nobody@test.com" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/user not found/i);
  });

  it("POST /api/resend-verification rejects already verified user", async () => {
    await User.updateOne(
      { _id: unverifiedUser._id },
      { $set: { isVerified: true } }
    );

    const res = await request(app)
      .post("/api/resend-verification")
      .send({ email: "unverified@test.com" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already verified/i);
  });
});
