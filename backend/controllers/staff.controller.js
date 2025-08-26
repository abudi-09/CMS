import User from "../models/user.model.js";

// List approved and active staff in the authenticated user's department
export const listActiveStaffForUserDepartment = async (req, res) => {
  try {
    const dept = req.user?.department;
    if (!dept) {
      return res
        .status(400)
        .json({ error: "User does not have a department set" });
    }
    const staff = await User.find({
      role: "staff",
      department: dept,
      isApproved: true,
      isActive: true,
      isRejected: { $ne: true },
    }).select("_id name fullName username email department");
    res.status(200).json(staff);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch staff" });
  }
};
