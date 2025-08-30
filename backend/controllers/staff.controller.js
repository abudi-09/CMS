import User from "../models/user.model.js";

// List approved and active staff in the authenticated user's department
export const listActiveStaffForUserDepartment = async (req, res) => {
  try {
    const dept = req.user?.department;
    let staff;
    if (!dept) {
      // If no department, return all active staff
      staff = await User.find({
        role: "staff",
        isApproved: true,
        isActive: true,
        isRejected: { $ne: true },
      }).select("_id name fullName username email department");
    } else {
      staff = await User.find({
        role: "staff",
        department: dept,
        isApproved: true,
        isActive: true,
        isRejected: { $ne: true },
      }).select("_id name fullName username email department");
    }
    res.status(200).json(staff);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch staff" });
  }
};

// List all active HODs (approved, active, not rejected) and log them
export const listActiveHods = async (req, res) => {
  try {
    const hods = await User.find({
      role: "hod",
      isApproved: true,
      isActive: true,
      isRejected: { $ne: true },
    }).select("_id name email department workingPlace isActive isApproved isRejected approvedByDean");
    res.status(200).json(
      hods.map((h) => ({
        id: h._id,
        name: h.name,
        email: h.email,
        department: h.department,
        workingPlace: h.workingPlace,
        status: h.status,
      }))
    );
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch active HODs" });
  }
};
