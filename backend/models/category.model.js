import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    // Roles allowed to use/select this category (empty => all)
    roles: [
      {
        type: String,
        enum: ["student", "staff", "hod", "dean", "admin"],
      },
    ],
    description: { type: String, trim: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const Category = mongoose.model("Category", categorySchema);

// Seed default categories if collection empty
export async function ensureDefaultCategories() {
  // Intentionally left as a no-op unless SEED_CATEGORIES env flag is enabled.
  // Define minimal starter set if desired:
  const minimal = [
    { name: "Other", roles: [], description: "General / uncategorized" },
  ];
  for (const def of minimal) {
    await Category.findOneAndUpdate(
      { name: def.name },
      { $setOnInsert: def },
      { upsert: true, new: false }
    );
  }
}
