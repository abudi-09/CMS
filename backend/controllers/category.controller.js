import { Category } from "../models/category.model.js";

// List (optionally filter by role usage)
export const listCategories = async (req, res) => {
  try {
    const { role, status } = req.query;
    const filter = {};
    if (role)
      Object.assign(filter, {
        $or: [{ roles: role }, { roles: { $size: 0 } }],
      });
    if (status) Object.assign(filter, { status });
    const categories = await Category.find(filter).sort({ name: 1 });
    res.status(200).json(categories);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
};

// Create (admin only assumed by route guard)
export const createCategory = async (req, res) => {
  try {
    const { name, roles } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }
    const existing = await Category.findOne({ name: name.trim() });
    if (existing) {
      return res.status(409).json({ error: "Category already exists" });
    }
    const doc = await Category.create({
      name: name.trim(),
      roles: Array.isArray(roles) ? roles : [],
      createdBy: req.user?._id,
    });
    res.status(201).json(doc);
  } catch (e) {
    res.status(500).json({ error: "Failed to create category" });
  }
};

// Update
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, roles, status, description } = req.body;
    const cat = await Category.findById(id);
    if (!cat) return res.status(404).json({ error: "Not found" });
    if (name) cat.name = name.trim();
    if (Array.isArray(roles)) cat.roles = roles;
    if (description !== undefined) cat.description = description;
    if (status && ["active", "inactive"].includes(status)) cat.status = status;
    await cat.save();
    res.status(200).json(cat);
  } catch (e) {
    res.status(500).json({ error: "Failed to update category" });
  }
};

// Delete
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    // Soft safety: only allow delete if inactive (prevent accidental loss)
    const cat = await Category.findById(id);
    if (!cat) return res.status(404).json({ error: "Not found" });
    if (cat.status !== "inactive") {
      return res
        .status(400)
        .json({ error: "Category must be inactive before deletion" });
    }
    await cat.deleteOne();
    res.status(200).json({ message: "Deleted", id: cat._id });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete category" });
  }
};

// Stats (admin)
export const categoryStats = async (req, res) => {
  try {
    const categories = await Category.find({}).sort({ name: 1 });
    const total = categories.length;
    const active = categories.filter((c) => c.status !== "inactive").length;
    const inactive = total - active;
    if (req.query.log === "1" || process.env.LOG_CATEGORIES === "true") {
      console.log(
        `\n[Category Summary] Total=${total} Active=${active} Inactive=${inactive}`
      );
      categories.forEach((c) => {
        console.log(
          ` - ${c.name} | status=${c.status} | roles=${
            c.roles && c.roles.length ? c.roles.join(",") : "all"
          }`
        );
      });
      console.log("");
    }
    res.json({
      total,
      active,
      inactive,
      categories: categories.map((c) => ({
        id: c._id,
        name: c.name,
        roles: c.roles,
        status: c.status,
        description: c.description,
      })),
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to compute category stats" });
  }
};

// Delete ALL categories (admin only) -- destructive
export const deleteAllCategories = async (req, res) => {
  try {
    const result = await Category.deleteMany({});
    res
      .status(200)
      .json({
        message: "All categories deleted",
        deletedCount: result.deletedCount,
      });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete all categories" });
  }
};
