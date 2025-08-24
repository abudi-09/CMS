import { useContext, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Folder,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  BarChart3,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { CategoryContext } from "@/context/CategoryContext";

interface CategoryLike {
  _id: string;
  name: string;
  roles?: string[];
  createdAt?: string;
  updatedAt?: string;
  status?: "active" | "inactive";
  description?: string;
}

function CategoryManagement() {
  const categoryCtx = useContext(CategoryContext);
  const {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    loading,
    error,
  } = categoryCtx || {
    categories: [],
    addCategory: async () => null,
    updateCategory: async () => null,
    deleteCategory: async () => false,
    loading: false,
    error: null,
  };
  // (Legacy single-role state removed; now supporting multi-role arrays)
  const roleOptions = ["staff", "hod", "dean", "admin"] as const;
  const [editRoles, setEditRoles] = useState<string[]>(["staff"]);
  const [newCategoryRoles, setNewCategoryRoles] = useState<string[]>(["staff"]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState<string>("All");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [newCategoryStatus, setNewCategoryStatus] = useState<
    "active" | "inactive"
  >("active");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryLike | null>(
    null
  );
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "inactive">("active");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDeleteCategory, setPendingDeleteCategory] =
    useState<CategoryLike | null>(null);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }
    const created = await addCategory(newCategoryName, newCategoryRoles);
    if (created) {
      // patch description/status if provided
      if (newCategoryDescription || newCategoryStatus !== "active") {
        await updateCategory(created._id, {
          description: newCategoryDescription,
          status: newCategoryStatus,
        });
      }
    }
    if (!created) {
      toast({
        title: "Error",
        description: "Failed to create category",
        variant: "destructive",
      });
      return;
    }
    setNewCategoryName("");
    setNewCategoryDescription("");
    setNewCategoryRoles(["staff"]);
    setNewCategoryStatus("active");
    setShowAddModal(false);

    toast({
      title: "Category Added",
      description: `${newCategoryName} has been created successfully`,
    });
  };

  const handleEditCategory = (category: CategoryLike) => {
    setEditingCategory(category);
    setEditName(category.name);
    setEditDescription(category.description || "");
    setEditRoles(
      category.roles && category.roles.length ? category.roles : ["staff"]
    );
    setEditStatus(category.status || "active");
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || !editingCategory) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }
    const updated = await updateCategory(editingCategory._id, {
      name: editName,
      roles: editRoles,
      status: editStatus,
      description: editDescription,
    });
    if (!updated) {
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive",
      });
      return;
    }

    setEditingCategory(null);
    setEditName("");
    setEditDescription("");
    setEditRoles(["staff"]);

    toast({
      title: "Category Updated",
      description: `${editName} has been updated successfully`,
    });
  };

  const handleDeleteCategory = async (category: CategoryLike) => {
    const ok = await deleteCategory(category._id);
    toast({
      title: ok ? "Category Deleted" : "Delete Failed",
      description: ok
        ? `${category.name} has been deleted successfully`
        : "Could not delete category. Make sure it is inactive first.",
      variant: ok ? "default" : "destructive",
    });
  };

  const handleDeleteClick = (category: CategoryLike) => {
    setPendingDeleteCategory(category);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (pendingDeleteCategory) {
      if (pendingDeleteCategory.status !== "inactive") {
        toast({
          title: "Cannot Delete",
          description: "Category must be inactive before deletion.",
          variant: "destructive",
        });
      } else {
        await handleDeleteCategory(pendingDeleteCategory);
      }
    }
    setDeleteDialogOpen(false);
    setPendingDeleteCategory(null);
  };

  const handleToggleStatus = async (categoryId: string) => {
    const cat = categories.find((c: CategoryLike) => c._id === categoryId);
    if (!cat) return;
    const next = cat.status === "active" ? "inactive" : "active";
    const updated = await updateCategory(categoryId, { status: next });
    if (!updated) {
      toast({
        title: "Update Failed",
        description: "Could not change status",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Status Updated",
        description: `${cat.name} is now ${next}`,
      });
    }
  };

  // Calculate summary stats
  const stats = useMemo(
    () => ({
      total: categories.length,
      active: categories.filter((c: CategoryLike) => c.status === "active")
        .length,
      inactive: categories.filter((c: CategoryLike) => c.status === "inactive")
        .length,
      totalComplaints: 0,
    }),
    [categories]
  );

  // Filter categories
  const filteredCategories = categories.filter((category: CategoryLike) => {
    const matchesSearch = category.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "All" ||
      (statusFilter === "Active" && category.status === "active") ||
      (statusFilter === "Inactive" && category.status === "inactive");
    const matchesRole =
      roleFilter === "All" ||
      // empty roles means available to all
      !category.roles ||
      category.roles.length === 0 ||
      category.roles.includes(roleFilter.toLowerCase());
    return matchesSearch && matchesStatus && matchesRole;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Category Management
        </h1>
        <p className="text-muted-foreground">
          Manage complaint categories and their settings
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Categories
            </CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg dark:bg-blue-900/20">
              <Folder className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All categories</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Categories
            </CardTitle>
            <div className="bg-green-50 p-2 rounded-lg dark:bg-green-900/20">
              <ToggleRight className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Inactive Categories
            </CardTitle>
            <div className="bg-red-50 p-2 rounded-lg dark:bg-red-900/20">
              <ToggleLeft className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inactive}</div>
            <p className="text-xs text-muted-foreground">Deactivated</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Complaints
            </CardTitle>
            <div className="bg-purple-50 p-2 rounded-lg dark:bg-purple-900/20">
              <BarChart3 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalComplaints}</div>
            <p className="text-xs text-muted-foreground">
              Across all categories
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add New Category Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Create New Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Category</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Category Name *
                  </label>
                  <Input
                    placeholder="Enter category name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Description (Optional)
                  </label>
                  <Input
                    placeholder="Enter category description"
                    value={newCategoryDescription}
                    onChange={(e) => setNewCategoryDescription(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Status
                  </label>
                  <Select
                    value={newCategoryStatus}
                    onValueChange={(v) =>
                      setNewCategoryStatus(v as "active" | "inactive")
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Roles (who can use it) *
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {roleOptions.map((r) => {
                      const checked = newCategoryRoles.includes(r);
                      return (
                        <label
                          key={r}
                          className="flex items-center gap-1 text-sm cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={checked}
                            onChange={() =>
                              setNewCategoryRoles((prev) =>
                                checked
                                  ? prev.filter((x) => x !== r)
                                  : [...prev, r]
                              )
                            }
                          />
                          {r === "hod"
                            ? "HoD"
                            : r.charAt(0).toUpperCase() + r.slice(1)}
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleAddCategory} className="flex-1">
                    Add Category
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddModal(false);
                      setNewCategoryName("");
                      setNewCategoryDescription("");
                      setNewCategoryRoles(["staff"]);
                      setNewCategoryStatus("active");
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Categories List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Categories ({filteredCategories.length})
          </CardTitle>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search categories by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    <SelectItem value="Active">Active only</SelectItem>
                    <SelectItem value="Inactive">Inactive only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All roles</SelectItem>
                    {roleOptions.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r === "hod"
                          ? "HoD"
                          : r.charAt(0).toUpperCase() + r.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                {searchTerm || statusFilter !== "All"
                  ? "No categories match your search criteria"
                  : "No categories found"}
              </div>
            ) : (
              filteredCategories.map((category) => (
                <Card
                  key={category._id}
                  className="relative hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Folder className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-lg">
                          {category.name}
                        </CardTitle>
                      </div>
                      <Badge
                        className={`text-xs ${
                          category.status === "active"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                        }`}
                        variant="outline"
                      >
                        {category.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {category.description && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {category.description}
                      </p>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">0</span>
                        <span className="text-sm text-muted-foreground">
                          complaints
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          Active
                        </span>
                        <Switch
                          checked={category.status === "active"}
                          onCheckedChange={() =>
                            handleToggleStatus(category._id)
                          }
                        />
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      <div>
                        Created:{" "}
                        {new Date(
                          category.createdAt || Date.now()
                        ).toLocaleDateString()}
                      </div>
                      <div>
                        Updated:{" "}
                        {new Date(
                          category.updatedAt || Date.now()
                        ).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditCategory(category)}
                        className="flex-1 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(category)}
                        className="flex-1 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600"
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Category Modal */}
      {editingCategory && (
        <Dialog
          open={!!editingCategory}
          onOpenChange={() => setEditingCategory(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Category Name *
                </label>
                <Input
                  placeholder="Enter category name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Description (Optional)
                </label>
                <Input
                  placeholder="Enter category description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Roles (who can use it) *
                </label>
                <div className="flex flex-wrap gap-3">
                  {roleOptions.map((r) => {
                    const checked = editRoles.includes(r);
                    return (
                      <label
                        key={r}
                        className="flex items-center gap-1 text-sm cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={checked}
                          onChange={() => {
                            setEditRoles((prev) =>
                              checked
                                ? prev.filter((x) => x !== r)
                                : [...prev, r]
                            );
                          }}
                        />
                        {r === "hod"
                          ? "HoD"
                          : r.charAt(0).toUpperCase() + r.slice(1)}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Status
                </label>
                <Select
                  value={editStatus}
                  onValueChange={(v) =>
                    setEditStatus(v as "active" | "inactive")
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={handleSaveEdit} className="flex-1">
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingCategory(null);
                    setEditName("");
                    setEditDescription("");
                    setEditRoles(["staff"]);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Category"
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setPendingDeleteCategory(null);
        }}
        onOpenChange={(open: boolean) => {
          setDeleteDialogOpen(open);
          if (!open) setPendingDeleteCategory(null);
        }}
        warning={
          pendingDeleteCategory && pendingDeleteCategory.status !== "inactive"
            ? "You must deactivate this category before deleting."
            : undefined
        }
      >
        {pendingDeleteCategory
          ? pendingDeleteCategory.status === "inactive"
            ? `Are you sure you want to permanently delete "${pendingDeleteCategory.name}"? This action cannot be undone.`
            : `"${pendingDeleteCategory.name}" is currently active. Toggle it inactive first, then delete.`
          : ""}
      </ConfirmDialog>
    </div>
  );
}

export default CategoryManagement;
