import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const protectRoute = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;
    if (!token) return res.status(401).json({ error: "Not authorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) return res.status(401).json({ error: "User not found" });

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token failed" });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    return res.status(403).json({ error: "Access denied: Admins only" });
  }
};
export const staffOnly = (req, res, next) => {
  if (req.user && req.user.role === "staff" && req.user.isApproved) {
    next();
  } else {
    return res.status(403).json({ error: "Access denied: Staff only" });
  }
};
