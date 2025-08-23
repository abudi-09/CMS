import User from "../models/user.model.js";
import { sendDecisionEmail } from "../utils/sendDecisionEmail.js";

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

// HoD: deactivate/reactivate approved staff in their department
export const hodDeactivateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const staff = await User.findById(id);
    if (!staff || staff.role !== "staff")
      return res.status(404).json({ error: "Staff not found" });
    if (staff.department !== req.user.department) {
      return res
        .status(403)
        .json({ error: "Can only deactivate staff in your department" });
    }
    if (!staff.isApproved || staff.isRejected) {
      return res.status(400).json({
        error:
          "Only approved staff can be deactivated. Use approve or reject for pending accounts.",
      });
    }
    staff.isActive = false;
    await staff.save();
    res.status(200).json({ message: "Staff deactivated" });
  } catch (e) {
    res.status(500).json({ error: "Failed to deactivate staff" });
  }
};

export const hodReactivateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const staff = await User.findById(id);
    if (!staff || staff.role !== "staff")
      return res.status(404).json({ error: "Staff not found" });
    if (staff.department !== req.user.department) {
      return res
        .status(403)
        .json({ error: "Can only reactivate staff in your department" });
    }
    if (!staff.isApproved || staff.isRejected) {
      return res.status(400).json({
        error:
          "Only approved staff can be reactivated. Approve staff to move out of rejected/pending.",
      });
    }
    staff.isActive = true;
    await staff.save();
    res.status(200).json({ message: "Staff reactivated" });
  } catch (e) {
    res.status(500).json({ error: "Failed to reactivate staff" });
  }
};

// HoD: list approved(active), deactivated, rejected staff in their department
// HoD: list users (students) in their department
export const hodGetUsers = async (req, res) => {
  try {
    const dept = req.user.department;
    const users = await User.find({
      department: dept,
      role: { $in: ["student", "staff"] },
    }).select("_id name email department role isActive createdAt updatedAt");
    res.status(200).json(users);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

// HoD: activate a user in their department
export const hodActivateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user || user.role !== "student")
      return res.status(404).json({ error: "User not found" });
    if (user.department !== req.user.department) {
      return res
        .status(403)
        .json({ error: "Can only activate users in your department" });
    }
    user.isActive = true;
    await user.save();
    res.status(200).json({ message: "User activated" });
  } catch (e) {
    res.status(500).json({ error: "Failed to activate user" });
  }
};

// HoD: deactivate a user in their department
export const hodDeactivateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user || user.role !== "student")
      return res.status(404).json({ error: "User not found" });
    if (user.department !== req.user.department) {
      return res
        .status(403)
        .json({ error: "Can only deactivate users in your department" });
    }
    user.isActive = false;
    await user.save();
    res.status(200).json({ message: "User deactivated" });
  } catch (e) {
    res.status(500).json({ error: "Failed to deactivate user" });
  }
};

// HoD: promote a user to staff in their department
export const hodPromoteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { workingPlace } = req.body;
    const user = await User.findById(id);
    if (!user || user.role !== "student")
      return res.status(404).json({ error: "User not found" });
    if (user.department !== req.user.department) {
      return res
        .status(403)
        .json({ error: "Can only promote users in your department" });
    }
    if (!workingPlace) {
      return res
        .status(400)
        .json({ error: "Working position is required to promote to staff" });
    }
    // Promote and auto-approve: make the user a staff member and mark active/approved
    user.role = "staff";
    user.workingPlace = workingPlace;
    user.isApproved = true;
    user.isRejected = false;
    user.isActive = true;
    await user.save();

    // Return the updated user (without password) so frontend can render immediately
    const returned = user.toObject();
    if (returned.password) delete returned.password;
    res.status(200).json({
      message: "User promoted to staff and approved.",
      user: returned,
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to promote user" });
  }
};
export const hodGetActiveStaff = async (req, res) => {
  try {
    const dept = req.user.department;
    const active = await User.find({
      role: "staff",
      department: dept,
      isApproved: true,
      isActive: true,
      isRejected: { $ne: true },
    }).select("-password");
    res.status(200).json(active);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch active staff" });
  }
};

export const hodGetDeactivatedStaff = async (req, res) => {
  try {
    const dept = req.user.department;
    const deactivated = await User.find({
      role: "staff",
      department: dept,
      isApproved: true,
      isActive: false,
      isRejected: { $ne: true },
    }).select("-password");
    res.status(200).json(deactivated);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch deactivated staff" });
  }
};

export const hodGetRejectedStaff = async (req, res) => {
  try {
    const dept = req.user.department;
    const rejected = await User.find({
      role: "staff",
      department: dept,
      isRejected: true,
    }).select("-password");
    res.status(200).json(rejected);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch rejected staff" });
  }
};

// Dean: manage HoD
export const deanGetPendingHod = async (req, res) => {
  try {
    const pending = await User.find({
      role: "hod",
      isApproved: false,
      approvedByDean: { $ne: true },
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
    if (!hod || hod.role !== "hod")
      return res.status(404).json({ error: "Department head not found" });
    // Dean final approval: activate and approve account
    hod.isApproved = true;
    hod.isActive = true;
    hod.isRejected = false;
    // approvedByDean is not needed in dean-only flow; keep false for clarity
    hod.approvedByDean = false;
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
    if (!hod || hod.role !== "hod")
      return res.status(404).json({ error: "Department head not found" });
    hod.isRejected = true;
    hod.isApproved = false;
    hod.isActive = false;
    hod.approvedByDean = false;
    await hod.save();
    try {
      await sendDecisionEmail({
        to: hod.email,
        decision: "rejected",
        name: hod.name || "",
        role: "Head of Department",
      });
    } catch {}
    res.status(200).json({ message: "Department head rejected" });
  } catch (e) {
    res.status(500).json({ error: "Failed to reject department head" });
  }
};

// Dean: deactivate/reactivate HoD (keep approved status, toggle active)
export const deanDeactivateHod = async (req, res) => {
  try {
    const { id } = req.params;
    const hod = await User.findById(id);
    if (!hod || hod.role !== "hod")
      return res.status(404).json({ error: "Department head not found" });
    // Only allowed for approved HoDs; otherwise use reject/deapprove flows
    if (!hod.isApproved || hod.isRejected) {
      return res.status(400).json({
        error:
          "Only approved HoD accounts can be deactivated. Use reject or de-approve instead.",
      });
    }
    hod.isActive = false;
    await hod.save();
    res.status(200).json({ message: "Department head deactivated" });
  } catch (e) {
    res.status(500).json({ error: "Failed to deactivate department head" });
  }
};

export const deanReactivateHod = async (req, res) => {
  try {
    const { id } = req.params;
    const hod = await User.findById(id);
    if (!hod || hod.role !== "hod")
      return res.status(404).json({ error: "Department head not found" });
    // Only change active flag; don't change approval/rejection state
    if (!hod.isApproved || hod.isRejected) {
      return res.status(400).json({
        error:
          "Only approved HoD accounts can be reactivated. Use approve to move out of rejected/pending.",
      });
    }
    hod.isActive = true;
    await hod.save();
    res.status(200).json({ message: "Department head reactivated" });
  } catch (e) {
    res.status(500).json({ error: "Failed to reactivate department head" });
  }
};

// Dean: reversal controls
export const deanDeapproveHod = async (req, res) => {
  try {
    const { id } = req.params;
    const hod = await User.findById(id);
    if (!hod || hod.role !== "hod")
      return res.status(404).json({ error: "Department head not found" });
    // Move back to Pending
    hod.isApproved = false;
    hod.isActive = false;
    hod.isRejected = false;
    hod.approvedByDean = false;
    await hod.save();
    res.status(200).json({ message: "Department head set to pending" });
  } catch (e) {
    res.status(500).json({ error: "Failed to de-approve department head" });
  }
};

export const deanReapproveHod = async (req, res) => {
  try {
    const { id } = req.params;
    const hod = await User.findById(id);
    if (!hod || hod.role !== "hod")
      return res.status(404).json({ error: "Department head not found" });
    // Move to Active again
    hod.isRejected = false;
    hod.isApproved = true;
    hod.isActive = true;
    await hod.save();
    res.status(200).json({ message: "Department head re-approved" });
  } catch (e) {
    res.status(500).json({ error: "Failed to re-approve department head" });
  }
};

export const deanGetActiveHod = async (req, res) => {
  try {
    const active = await User.find({
      role: "hod",
      isApproved: true,
      isRejected: { $ne: true },
      isActive: true,
    }).select("-password");
    res.status(200).json(active);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch active HoDs" });
  }
};

export const deanGetRejectedHod = async (req, res) => {
  try {
    const rejected = await User.find({
      role: "hod",
      $or: [
        { isRejected: true },
        { isApproved: true, isActive: false }, // deactivated but still approved
      ],
    }).select("-password");
    res.status(200).json(rejected);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch rejected HoDs" });
  }
};

// Dean: fetch all HODs grouped by status
export const deanGetAllHod = async (req, res) => {
  try {
    const hods = await User.find({ role: "hod" }).select("-password");
    const pending = [];
    const approved = [];
    const rejected = [];
    const deactivated = [];

    hods.forEach((u) => {
      const obj = {
        _id: u._id,
        name: u.fullName || u.name || u.username || u.email,
        email: u.email,
        department: u.department,
        isApproved: !!u.isApproved,
        isRejected: !!u.isRejected,
        isActive: !!u.isActive,
      };
      if (u.isRejected) rejected.push(obj);
      else if (!u.isApproved) pending.push(obj);
      else if (u.isApproved && !u.isActive) deactivated.push(obj);
      else if (u.isApproved && u.isActive) approved.push(obj);
      else pending.push(obj);
    });

    res.status(200).json({ pending, approved, rejected, deactivated });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch HODs" });
  }
};

// Admin: manage HoD after Dean approval (final approval stage)
export const adminGetPendingHod = async (req, res) => {
  try {
    const pending = await User.find({
      role: "hod",
      approvedByDean: true,
      isApproved: false,
      isRejected: { $ne: true },
    }).select("-password");
    res.status(200).json(pending);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch pending HoDs for admin" });
  }
};

export const adminApproveHod = async (req, res) => {
  try {
    const { id } = req.params;
    const hod = await User.findById(id);
    if (!hod || hod.role !== "hod")
      return res.status(404).json({ error: "Department head not found" });
    hod.isApproved = true;
    hod.isActive = true;
    await hod.save();
    try {
      await sendDecisionEmail({
        to: hod.email,
        decision: "approved",
        name: hod.name || "",
        role: "Head of Department",
      });
    } catch {}
    res.status(200).json({ message: "Department head approved by Admin" });
  } catch (e) {
    res.status(500).json({ error: "Failed to approve HoD by admin" });
  }
};

export const adminRejectHod = async (req, res) => {
  try {
    const { id } = req.params;
    const hod = await User.findById(id);
    if (!hod || hod.role !== "hod")
      return res.status(404).json({ error: "Department head not found" });
    hod.isRejected = true;
    hod.isApproved = false;
    hod.isActive = false;
    hod.approvedByDean = false;
    await hod.save();
    try {
      await sendDecisionEmail({
        to: hod.email,
        decision: "rejected",
        name: hod.name || "",
        role: "Head of Department",
      });
    } catch {}
    res.status(200).json({ message: "Department head rejected by Admin" });
  } catch (e) {
    res.status(500).json({ error: "Failed to reject HoD by admin" });
  }
};

export const adminGetActiveHod = async (req, res) => {
  try {
    const active = await User.find({
      role: "hod",
      isApproved: true,
      isRejected: { $ne: true },
    }).select("-password");
    res.status(200).json(active);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch active HoDs" });
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

export const adminGetActiveDeans = async (req, res) => {
  try {
    const active = await User.find({
      role: "dean",
      isApproved: true,
      isRejected: { $ne: true },
    }).select("-password");
    res.status(200).json(active);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch active deans" });
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
    try {
      await sendDecisionEmail({
        to: dean.email,
        decision: "approved",
        name: dean.name || "",
        role: "Dean",
      });
    } catch {}
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
    try {
      await sendDecisionEmail({
        to: dean.email,
        decision: "rejected",
        name: dean.name || "",
        role: "Dean",
      });
    } catch {}
    res.status(200).json({ message: "Dean rejected" });
  } catch (e) {
    res.status(500).json({ error: "Failed to reject dean" });
  }
};

// Admin: deactivate/activate an already approved dean
export const adminDeactivateDean = async (req, res) => {
  try {
    const { id } = req.params;
    const dean = await User.findById(id);
    if (!dean || dean.role !== "dean")
      return res.status(404).json({ error: "Dean not found" });
    dean.isActive = false;
    await dean.save();
    res.status(200).json({ message: "Dean deactivated" });
  } catch (e) {
    res.status(500).json({ error: "Failed to deactivate dean" });
  }
};

export const adminReactivateDean = async (req, res) => {
  try {
    const { id } = req.params;
    const dean = await User.findById(id);
    if (!dean || dean.role !== "dean")
      return res.status(404).json({ error: "Dean not found" });
    // Keep approval as-is, only toggle active back
    dean.isActive = true;
    await dean.save();
    res.status(200).json({ message: "Dean reactivated" });
  } catch (e) {
    res.status(500).json({ error: "Failed to reactivate dean" });
  }
};
