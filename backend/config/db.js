import mongoose from "mongoose";
const connectMongoDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error("MONGO_URI is not set in environment");
    }
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 7000, // faster fail when DNS/host is unreachable
    });
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1); // Exit the process with failure
  }
};
export default connectMongoDB;
