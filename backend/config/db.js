import mongoose from "mongoose";

/**
 * Connect to MongoDB with retry/backoff to handle transient network or Atlas IP whitelist delays.
 * Exits the process only after exhausting attempts to avoid immediate nodemon crash on transient issues.
 *
 * Options:
 *  - retries: number of attempts (default 5)
 *  - initialDelayMs: base delay before retrying (default 2000)
 */
const connectMongoDB = async (options = {}) => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI is not set in environment");
  }

  const maxAttempts = Number(options.retries ?? 5);
  const initialDelayMs = Number(options.initialDelayMs ?? 2000);

  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 7000,
      });
      console.log("MongoDB connected successfully");
      return;
    } catch (error) {
      // Provide concise error summary for common Atlas connectivity issues
      console.error(
        `MongoDB connection attempt ${attempt} failed:`,
        error.message || error
      );
      if (attempt >= maxAttempts) {
        console.error(
          `Exceeded ${maxAttempts} MongoDB connection attempts. Exiting.`
        );
        process.exit(1);
      }
      // Exponential backoff with a cap
      const delay = Math.min(30000, initialDelayMs * Math.pow(2, attempt - 1));
      console.log(
        `Retrying MongoDB connection in ${Math.round(delay / 1000)}s...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

export default connectMongoDB;
