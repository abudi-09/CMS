import User from "../models/user.model.js";

// HoD: manage Staff in same department
export const hodGetPendingStaff = async (req, res) => {
  try {
    const dept = req.user.department;
    const pending = await User.find({
      role: "staff",
      department: dept,
      isApproved: false,
      isRejected: { $ne: true },
    }).select("-password");
    res.status(200).json(pending);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch pending staff" });
  }
};

export const hodApproveStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const staff = await User.findById(id);
    if (!staff || staff.role !== "staff")
      return res.status(404).json({ error: "Staff not found" });
    if (staff.department !== req.user.department) {
      return res
        .status(403)
        .json({ error: "Can only approve staff in your department" });
    }
    staff.isApproved = true;
    staff.isActive = true;
    await staff.save();
    res.status(200).json({ message: "Staff approved" });
  } catch (e) {
    res.status(500).json({ error: "Failed to approve staff" });
  }
};

export const hodRejectStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const staff = await User.findById(id);
    if (!staff || staff.role !== "staff")
      return res.status(404).json({ error: "Staff not found" });
    if (staff.department !== req.user.department) {
      return res
        .status(403)
        .json({ error: "Can only reject staff in your department" });
    }
    staff.isRejected = true;
    staff.isApproved = false;
    staff.isActive = false;
    await staff.save();
    res.status(200).json({ message: "Staff rejected" });
  } catch (e) {
    res.status(500).json({ error: "Failed to reject staff" });
  }
};

// Dean: manage HoD
export const deanGetPendingHod = async (req, res) => {
  try {
    const pending = await User.find({
      role: "headOfDepartment",
      isApproved: false,
      isRejected: { $ne: true },
    }).select("-password");
    res.status(200).json(pending);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch pending department heads" });
  }
};

export const deanApproveHod = async (req, res) => {
  try {
    const { id } = req.params;
    const hod = await User.findById(id);
    if (!hod || hod.role !== "headOfDepartment")
      return res.status(404).json({ error: "Department head not found" });
    hod.isApproved = true;
    hod.isActive = true;
    await hod.save();
    res.status(200).json({ message: "Department head approved" });
  } catch (e) {
    res.status(500).json({ error: "Failed to approve department head" });
  }
};

export const deanRejectHod = async (req, res) => {
  try {
    const { id } = req.params;
    const hod = await User.findById(id);
    if (!hod || hod.role !== "headOfDepartment")
      return res.status(404).json({ error: "Department head not found" });
    hod.isRejected = true;
    hod.isApproved = false;
    hod.isActive = false;
    await hod.save();
    res.status(200).json({ message: "Department head rejected" });
  } catch (e) {
    res.status(500).json({ error: "Failed to reject department head" });
  }
};

// Admin: manage Dean
export const adminGetPendingDeans = async (req, res) => {
  try {
    const pending = await User.find({
      role: "dean",
      isApproved: false,
      isRejected: { $ne: true },
    }).select("-password");
    res.status(200).json(pending);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch pending deans" });
  }
};

export const adminApproveDean = async (req, res) => {
  try {
    const { id } = req.params;
    const dean = await User.findById(id);
    if (!dean || dean.role !== "dean")
      return res.status(404).json({ error: "Dean not found" });
    dean.isApproved = true;
    dean.isActive = true;
    await dean.save();
    res.status(200).json({ message: "Dean approved" });
  } catch (e) {
    res.status(500).json({ error: "Failed to approve dean" });
  }
};

export const adminRejectDean = async (req, res) => {
  try {
    const { id } = req.params;
    const dean = await User.findById(id);
    if (!dean || dean.role !== "dean")
      return res.status(404).json({ error: "Dean not found" });
    dean.isRejected = true;
    dean.isApproved = false;
    dean.isActive = false;
    await dean.save();
    res.status(200).json({ message: "Dean rejected" });
  } catch (e) {
    res.status(500).json({ error: "Failed to reject dean" });
  }
};
