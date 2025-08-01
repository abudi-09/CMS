import User from "../models/user.model.js";

// Get all pending staff registrations
export const getPendingStaff = async (req, res) => {
  try {
    const pendingStaff = await User.find({
      role: "staff",
      isApproved: false,
      isRejected: { $ne: true },
    });
    res.status(200).json(pendingStaff);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch pending staff" });
  }
};

// Approve staff member
export const approveStaff = async (req, res) => {
  try {
    const staffId = req.params.id;
    const staff = await User.findById(staffId);

    if (!staff || staff.role !== "staff") {
      return res.status(404).json({ error: "Staff not found" });
    }

    staff.isApproved = true;
    await staff.save();

    res.status(200).json({ message: "Staff approved successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to approve staff" });
  }
};

// Reject staff member (mark as rejected)
export const rejectStaff = async (req, res) => {
  try {
    const staffId = req.params.id;
    const staff = await User.findOne({ _id: staffId, role: "staff" });

    if (!staff) {
      return res.status(404).json({ error: "Staff not found" });
    }

    staff.isRejected = true;
    staff.isApproved = false;
    await staff.save();

    res.status(200).json({ message: "Staff rejected successfully" });
  } catch (error) {
    console.error("Reject staff error:", error.message);
    res.status(500).json({ error: "Failed to reject staff" });
  }
};

// Get all staff (approved, pending, rejected)
export const getAllStaff = async (req, res) => {
  try {
    const staff = await User.find({ role: "staff" });
    res.status(200).json(staff);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};
