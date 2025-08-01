import mongoose from "mongoose";
const connectMongoDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected successfully");
    console.log("MONGO_URI =", process.env.MONGO_URI); // Check if it's undefined
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1); // Exit the process with failure
  }
};
export default connectMongoDB;
