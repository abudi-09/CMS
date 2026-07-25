import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["./backend/tests/globalSetup.js"],
    setupFiles: ["./backend/tests/setup.js"],
    include: ["backend/tests/**/*.test.js"],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 300000,
    coverage: {
      provider: "v8",
      include: ["backend/**/*.js"],
      exclude: [
        "backend/tests/**",
        "backend/scripts/**",
        "backend/server.js",
        "backend/config/db.js",
        "backend/config/cloudinary.js",
      ],
      thresholds: {
        lines: 80,
        functions: 85,
        branches: 40,
        statements: 80,
      },
    },
  },
});
