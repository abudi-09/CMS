import User from "../models/user.model.js";
// Deactivate staff member
export const deactivateStaff = async (req, res) => {
  try {
    const staffId = req.params.id;
    const staff = await User.findOne({ _id: staffId, role: "staff" });
    if (!staff) {
      return res.status(404).json({ error: "Staff not found" });
    }
    staff.isActive = false;
    await staff.save();
    res.status(200).json({ message: "Staff deactivated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to deactivate staff" });
  }
};

// Activate staff member
export const activateStaff = async (req, res) => {
  try {
    const staffId = req.params.id;
    const staff = await User.findOne({ _id: staffId, role: "staff" });
    if (!staff) {
      return res.status(404).json({ error: "Staff not found" });
    }
    staff.isActive = true;
    await staff.save();
    res.status(200).json({ message: "Staff activated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to activate staff" });
  }
};

// Get all pending staff registrations
export const getPendingStaff = async (req, res) => {
  try {
    const pendingStaff = await User.find({
      role: "staff",
      isApproved: false,
      isRejected: { $ne: true },
    });
    console.log("[DEBUG] Pending staff found:", pendingStaff);
    res.status(200).json(pendingStaff);
  } catch (error) {
    console.error("[DEBUG] Error fetching pending staff:", error);
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

// Admin: get all users across roles, with optional role and department filters
export const getAllUsers = async (req, res) => {
  try {
    const { role, department } = req.query;
    const query = {};
    if (role) {
      // allow frontend to pass DB role values (user, staff, headOfDepartment, dean, admin)
      query.role = role;
    }
    if (department) {
      query.department = department;
    }
    const users = await User.find(query).select("-password");
    res.status(200).json(users);
  } catch (error) {
    console.error("Failed to fetch users", error?.message || error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};
