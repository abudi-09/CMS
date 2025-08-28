import jwt from "jsonwebtoken";
import User, {
  normalizeRole as normalizeUserRole,
} from "../models/user.model.js";

export const protectRoute = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;
    if (!token) return res.status(401).json({ error: "Not authorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) return res.status(401).json({ error: "User not found" });

    // Normalize role to canonical for request lifecycle (DB value unchanged)
    if (user && typeof user.role === "string") {
      user.role = normalizeUserRole(user.role);
    }

    // Immediately block access for any deactivated account
    // This ensures that once an admin (or relevant authority) deactivates a user,
    // all protected API calls return 403 without waiting for re-login.
    if (user && user.isActive === false) {
      return res.status(403).json({
        error: "inactive-account",
        message: "Account Deactivated by the admin",
      });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token failed" });
  }
};

export const adminOnly = (req, res, next) => {
  const role = req.user?.role && normalizeUserRole(req.user.role);
  if (role === "admin") {
    next();
  } else {
    return res.status(403).json({ error: "Access denied: Admins only" });
  }
};

// Allow either Admin or Dean
export const adminOrDean = (req, res, next) => {
  const role = req.user?.role && normalizeUserRole(req.user.role);
  if (role === "admin" || role === "dean") {
    next();
  } else {
    return res
      .status(403)
      .json({ error: "Access denied: Admins or Deans only" });
  }
};
export const staffOnly = (req, res, next) => {
  const role = req.user?.role && normalizeUserRole(req.user.role);
  if (role === "staff" && req.user.isApproved) {
    next();
  } else {
    return res.status(403).json({ error: "Access denied: Staff only" });
  }
};

export const deanOnly = (req, res, next) => {
  const role = req.user?.role && normalizeUserRole(req.user.role);
  if (role === "dean") {
    next();
  } else {
    return res.status(403).json({ error: "Access denied: Deans only" });
  }
};

export const hodOnly = (req, res, next) => {
  const role = req.user?.role && normalizeUserRole(req.user.role);
  if (role === "hod") {
    next();
  } else {
    return res
      .status(403)
      .json({ error: "Access denied: Department Heads only" });
  }
};
