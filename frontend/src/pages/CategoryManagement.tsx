import { useState } from "react";
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

interface Category {
  id: string;
  name: string;
  complaintsCount: number;
  status: "Active" | "Inactive";
  description?: string;
  createdDate: Date;
  lastUpdated: Date;
}

// Mock data for categories
const mockCategories: Category[] = [
  {
    id: "CAT-001",
    name: "Academic",
    complaintsCount: 45,
    status: "Active",
    description:
      "Issues related to academic activities, courses, and curriculum",
    createdDate: new Date("2023-09-01"),
    lastUpdated: new Date("2024-01-15"),
  },
  {
    id: "CAT-002",
    name: "Facility",
    complaintsCount: 32,
    status: "Active",
    description: "Infrastructure and facility-related issues",
    createdDate: new Date("2023-09-01"),
    lastUpdated: new Date("2024-01-10"),
  },
  {
    id: "CAT-003",
    name: "Finance",
    complaintsCount: 18,
    status: "Active",
    description: "Financial matters, fees, and billing issues",
    createdDate: new Date("2023-09-01"),
    lastUpdated: new Date("2024-01-20"),
  },
  {
    id: "CAT-004",
    name: "ICT Support",
    complaintsCount: 28,
    status: "Active",
    description: "Technology and IT-related issues",
    createdDate: new Date("2023-09-01"),
    lastUpdated: new Date("2024-01-18"),
  },
  {
    id: "CAT-005",
    name: "Cafeteria",
    complaintsCount: 12,
    status: "Active",
    description: "Food services and cafeteria-related issues",
    createdDate: new Date("2023-09-01"),
    lastUpdated: new Date("2024-01-12"),
  },
  {
    id: "CAT-006",
    name: "Library Services",
    complaintsCount: 0,
    status: "Inactive",
    description: "Library-related issues and services",
    createdDate: new Date("2023-09-01"),
    lastUpdated: new Date("2023-12-15"),
  },
];

function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDeleteCategory, setPendingDeleteCategory] =
    useState<Category | null>(null);

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicates
    if (
      categories.some(
        (cat) => cat.name.toLowerCase() === newCategoryName.toLowerCase()
      )
    ) {
      toast({
        title: "Error",
        description: "A category with this name already exists",
        variant: "destructive",
      });
      return;
    }

    const newCategory: Category = {
      id: `CAT-${String(categories.length + 1).padStart(3, "0")}`,
      name: newCategoryName,
      complaintsCount: 0,
      status: "Active",
      description: newCategoryDescription,
      createdDate: new Date(),
      lastUpdated: new Date(),
    };

    setCategories((prev) => [...prev, newCategory]);
    setNewCategoryName("");
    setNewCategoryDescription("");
    setShowAddModal(false);

    toast({
      title: "Category Added",
      description: `${newCategoryName} has been created successfully`,
    });
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setEditName(category.name);
    setEditDescription(category.description || "");
  };

  const handleSaveEdit = () => {
    if (!editName.trim() || !editingCategory) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicates (excluding current category)
    if (
      categories.some(
        (cat) =>
          cat.id !== editingCategory.id &&
          cat.name.toLowerCase() === editName.toLowerCase()
      )
    ) {
      toast({
        title: "Error",
        description: "A category with this name already exists",
        variant: "destructive",
      });
      return;
    }

    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === editingCategory.id
          ? {
              ...cat,
              name: editName,
              description: editDescription,
              lastUpdated: new Date(),
            }
          : cat
      )
    );

    setEditingCategory(null);
    setEditName("");
    setEditDescription("");

    toast({
      title: "Category Updated",
      description: `${editName} has been updated successfully`,
    });
  };

  const handleDeleteCategory = (categoryId: string, categoryName: string) => {
    const category = categories.find((cat) => cat.id === categoryId);
    if (category && category.complaintsCount > 0) {
      toast({
        title: "Cannot Delete",
        description: `${categoryName} has ${category.complaintsCount} complaints. Please reassign or resolve them first.`,
        variant: "destructive",
      });
      return;
    }
    setCategories((prev) => prev.filter((cat) => cat.id !== categoryId));
    toast({
      title: "Category Deleted",
      description: `${categoryName} has been deleted successfully`,
    });
  };

  const handleDeleteClick = (category: Category) => {
    setPendingDeleteCategory(category);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (pendingDeleteCategory) {
      handleDeleteCategory(
        pendingDeleteCategory.id,
        pendingDeleteCategory.name
      );
    }
    setDeleteDialogOpen(false);
    setPendingDeleteCategory(null);
  };

  const handleToggleStatus = (
    categoryId: string,
    currentStatus: Category["status"]
  ) => {
    const newStatus = currentStatus === "Active" ? "Inactive" : "Active";

    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId
          ? { ...cat, status: newStatus, lastUpdated: new Date() }
          : cat
      )
    );

    toast({
      title: "Status Updated",
      description: `Category has been ${newStatus.toLowerCase()}`,
    });
  };

  // Calculate summary stats
  const stats = {
    total: categories.length,
    active: categories.filter((c) => c.status === "Active").length,
    inactive: categories.filter((c) => c.status === "Inactive").length,
    totalComplaints: categories.reduce(
      (sum, cat) => sum + cat.complaintsCount,
      0
    ),
  };

  // Filter categories
  const filteredCategories = categories.filter((category) => {
    const matchesSearch =
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false;
    const matchesStatus =
      statusFilter === "All" || category.status === statusFilter;

    return matchesSearch && matchesStatus;
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
                  key={category.id}
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
                          category.status === "Active"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                        }`}
                        variant="outline"
                      >
                        {category.status}
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
                        <span className="text-sm font-medium">
                          {category.complaintsCount}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          complaints
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          Active
                        </span>
                        <Switch
                          checked={category.status === "Active"}
                          onCheckedChange={() =>
                            handleToggleStatus(category.id, category.status)
                          }
                        />
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      <div>
                        Created: {category.createdDate.toLocaleDateString()}
                      </div>
                      <div>
                        Updated: {category.lastUpdated.toLocaleDateString()}
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
                        disabled={category.complaintsCount > 0}
                        className="flex-1 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 disabled:opacity-50"
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
        content={
          pendingDeleteCategory
            ? `Are you sure you want to delete the category "${pendingDeleteCategory.name}"? This action cannot be undone.`
            : ""
        }
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setPendingDeleteCategory(null);
        }}
        variant="destructive"
      />
    </div>
  );
}

export default CategoryManagement;
