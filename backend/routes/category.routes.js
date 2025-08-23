import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  categoryStats,
  deleteAllCategories,
} from "../controllers/category.controller.js";

const router = express.Router();

// All authenticated users can list; optional role filter passed as query param
router.get("/", protectRoute, listCategories);

// Admin only operations - assume protectRoute sets req.user.role
const ensureAdmin = (req, res, next) => {
  if (req.user?.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  next();
};

router.post("/", protectRoute, ensureAdmin, createCategory);
router.patch("/:id", protectRoute, ensureAdmin, updateCategory);
router.delete("/:id", protectRoute, ensureAdmin, deleteCategory);
router.get("/stats/summary", protectRoute, ensureAdmin, categoryStats);
router.delete("/", protectRoute, ensureAdmin, deleteAllCategories);

export default router;
