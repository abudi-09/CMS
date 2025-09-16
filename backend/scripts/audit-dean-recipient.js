// Audit legacy complaints: submittedTo includes 'dean' but missing recipientId
import mongoose from "mongoose";
import Complaint from "../models/complaint.model.js";

async function run() {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) {
      console.error("MONGO_URI not set");
      process.exit(1);
    }
    await mongoose.connect(uri);
    const invalid = await Complaint.find({
      isDeleted: { $ne: true },
      submittedTo: { $regex: /dean/i },
      $or: [{ recipientId: { $exists: false } }, { recipientId: null }],
    })
      .select(
        "_id complaintCode title submittedBy createdAt recipientRole recipientId"
      )
      .lean();
    console.log(
      JSON.stringify({ count: invalid.length, items: invalid }, null, 2)
    );
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("audit-dean-recipient error:", err?.message || err);
    process.exit(2);
  }
}

run();
