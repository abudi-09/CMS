import { beforeAll, afterAll, afterEach, inject, vi } from "vitest";
import mongoose from "mongoose";

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: "test-message-id" }),
    })),
  },
}));

beforeAll(async () => {
  process.env.EMAIL_USER = "test@example.com";
  process.env.EMAIL_PASS = "test-password";
  process.env.FRONTEND_URL = "http://localhost:8080";

  const mongoUri = inject("mongoUri");
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
  }
}, 300000);

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});
