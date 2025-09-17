import { useContext, useEffect, useMemo, useState } from "react";
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
import { getCategoryCountsApi } from "@/lib/api";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

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
  // Counts state from backend
  const [categoryCountsByName, setCategoryCountsByName] = useState<
    Record<string, number>
  >({});
  const [categoryCountsById, setCategoryCountsById] = useState<
    Record<string, number>
  >({});
  const [totalComplaints, setTotalComplaints] = useState<number>(0);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getCategoryCountsApi();
        // Expected shape: { total: number, categories: [{ category: string, count: number }] }
        if (!mounted || !data) return;
        setTotalComplaints(Number(data.total || 0));
        const byName: Record<string, number> = {};
        const byId: Record<string, number> = {};
        for (const entry of data.categories || []) {
          const key = String(entry.category ?? "");
          const cnt = Number(entry.count || 0);
          // Heuristic: if looks like ObjectId (24 hex), treat as id; else treat as name
          if (/^[a-f\d]{24}$/i.test(key)) byId[key] = cnt;
          else byName[key] = cnt;
        }
        setCategoryCountsByName(byName);
        setCategoryCountsById(byId);
      } catch (e) {
        toast({
          title: "Failed to load category counts",
          variant: "destructive",
        });
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

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
      totalComplaints: totalComplaints,
    }),
    [categories, totalComplaints]
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

  // Pagination logic
  const totalPages = Math.ceil(filteredCategories.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedCategories = filteredCategories.slice(
    startIndex,
    startIndex + pageSize
  );

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, roleFilter]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4 md:px-6 md:py-6 max-w-7xl">
        <div className="space-y-4 md:space-y-6">
          <div className="flex flex-col gap-2 md:gap-4">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Category Management
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Manage complaint categories and their settings
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <Card className="p-4 md:p-6 hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 md:pb-3">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                  Total Categories
                </CardTitle>
                <div className="bg-blue-50 p-1.5 md:p-2 rounded-lg dark:bg-blue-900/20 flex-shrink-0">
                  <Folder className="h-3 w-3 md:h-4 md:w-4 text-blue-600 dark:text-blue-400" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl md:text-2xl font-bold">
                  {stats.total}
                </div>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  All categories
                </p>
              </CardContent>
            </Card>

            <Card className="p-4 md:p-6 hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 md:pb-3">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                  Active Categories
                </CardTitle>
                <div className="bg-green-50 p-1.5 md:p-2 rounded-lg dark:bg-green-900/20 flex-shrink-0">
                  <ToggleRight className="h-3 w-3 md:h-4 md:w-4 text-green-600 dark:text-green-400" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl md:text-2xl font-bold">
                  {stats.active}
                </div>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  Currently active
                </p>
              </CardContent>
            </Card>

            <Card className="p-4 md:p-6 hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 md:pb-3">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                  Inactive Categories
                </CardTitle>
                <div className="bg-red-50 p-1.5 md:p-2 rounded-lg dark:bg-red-900/20 flex-shrink-0">
                  <ToggleLeft className="h-3 w-3 md:h-4 md:w-4 text-red-600 dark:text-red-400" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl md:text-2xl font-bold">
                  {stats.inactive}
                </div>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  Deactivated
                </p>
              </CardContent>
            </Card>

            <Card className="p-4 md:p-6 hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 md:pb-3">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                  Total Complaints
                </CardTitle>
                <div className="bg-purple-50 p-1.5 md:p-2 rounded-lg dark:bg-purple-900/20 flex-shrink-0">
                  <BarChart3 className="h-3 w-3 md:h-4 md:w-4 text-purple-600 dark:text-purple-400" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl md:text-2xl font-bold">
                  {stats.totalComplaints}
                </div>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  Across all categories
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Add New Category Section */}
          <Card className="p-4 md:p-6">
            <CardHeader className="pb-3 md:pb-4">
              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                <Plus className="h-4 w-4 md:h-5 md:w-5" />
                Add New Category
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                <DialogTrigger asChild>
                  <Button className="w-full h-10 md:h-11 text-sm md:text-base">
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Category
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] md:max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader className="pb-3 md:pb-4">
                    <DialogTitle className="text-lg md:text-xl">
                      Add New Category
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 md:space-y-6">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">
                        Category Name *
                      </label>
                      <Input
                        placeholder="Enter category name"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="h-10 md:h-11"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">
                        Description (Optional)
                      </label>
                      <Input
                        placeholder="Enter category description"
                        value={newCategoryDescription}
                        onChange={(e) =>
                          setNewCategoryDescription(e.target.value)
                        }
                        className="h-10 md:h-11"
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
                        <SelectTrigger className="w-full h-10 md:h-11">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-3 block">
                        Roles (who can use it) *
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {roleOptions.map((r) => {
                          const checked = newCategoryRoles.includes(r);
                          return (
                            <label
                              key={r}
                              className="flex items-center gap-2 text-sm cursor-pointer select-none p-2 rounded-md hover:bg-accent/50 transition-colors"
                            >
                              <input
                                type="checkbox"
                                className="h-4 w-4 text-primary border-primary rounded focus:ring-primary"
                                checked={checked}
                                onChange={() =>
                                  setNewCategoryRoles((prev) =>
                                    checked
                                      ? prev.filter((x) => x !== r)
                                      : [...prev, r]
                                  )
                                }
                              />
                              <span className="font-medium">
                                {r === "hod"
                                  ? "HoD"
                                  : r.charAt(0).toUpperCase() + r.slice(1)}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                      <Button
                        onClick={handleAddCategory}
                        className="flex-1 h-10 md:h-11"
                      >
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
                        className="flex-1 h-10 md:h-11"
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
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search categories by name or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10 md:h-11"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <Select
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                    >
                      <SelectTrigger className="w-full sm:w-32 h-10 md:h-11">
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
                      <SelectTrigger className="w-full sm:w-40 h-10 md:h-11">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {paginatedCategories.length === 0 ? (
                  <div className="col-span-full text-center py-8 md:py-12 text-muted-foreground">
                    <Folder className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-4 text-muted-foreground/50" />
                    <div className="text-sm md:text-base">
                      {searchTerm || statusFilter !== "All"
                        ? "No categories match your search criteria"
                        : "No categories found"}
                    </div>
                  </div>
                ) : (
                  paginatedCategories.map((category) => (
                    <Card
                      key={category._id}
                      className="relative hover:shadow-md transition-shadow duration-200 border-l-4"
                      style={{
                        borderLeftColor:
                          category.status === "active" ? "#22c55e" : "#ef4444",
                      }}
                    >
                      <CardHeader className="pb-3 md:pb-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Folder className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground flex-shrink-0" />
                            <CardTitle className="text-base md:text-lg truncate">
                              {category.name}
                            </CardTitle>
                          </div>
                          <Badge
                            className={`text-xs px-2 py-1 flex-shrink-0 ${
                              category.status === "active"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                            }`}
                            variant="outline"
                          >
                            {category.status === "active"
                              ? "Active"
                              : "Inactive"}
                          </Badge>
                        </div>
                        {category.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {category.description}
                          </p>
                        )}
                      </CardHeader>

                      <CardContent className="space-y-3 md:space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <BarChart3 className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {categoryCountsByName[category.name] ??
                                categoryCountsById[category._id] ??
                                0}
                            </span>
                            <span className="text-xs md:text-sm text-muted-foreground">
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
                              className="scale-75 md:scale-100"
                            />
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground space-y-1">
                          <div className="flex justify-between">
                            <span>Created:</span>
                            <span>
                              {new Date(
                                category.createdAt || Date.now()
                              ).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Updated:</span>
                            <span>
                              {new Date(
                                category.updatedAt || Date.now()
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditCategory(category)}
                            className="flex-1 h-8 md:h-9 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          >
                            <Edit className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClick(category)}
                            className="flex-1 h-8 md:h-9 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600"
                            disabled={loading}
                          >
                            <Trash2 className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 md:mt-8">
                  <Pagination>
                    <PaginationContent className="flex-wrap gap-1 md:gap-2">
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage((p) => Math.max(1, p - 1));
                          }}
                          className={`min-h-[44px] px-3 md:px-4 text-sm ${
                            currentPage === 1
                              ? "pointer-events-none opacity-50"
                              : ""
                          }`}
                        />
                      </PaginationItem>

                      {(() => {
                        const pages: number[] = [];
                        const maxVisible = 5;
                        let start = Math.max(
                          1,
                          currentPage - Math.floor(maxVisible / 2)
                        );
                        const end = Math.min(
                          totalPages,
                          start + maxVisible - 1
                        );

                        if (end - start + 1 < maxVisible) {
                          start = Math.max(1, end - maxVisible + 1);
                        }

                        for (let i = start; i <= end; i++) {
                          pages.push(i);
                        }

                        return (
                          <>
                            {start > 1 && (
                              <>
                                <PaginationItem>
                                  <PaginationLink
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setCurrentPage(1);
                                    }}
                                    className="min-h-[44px] min-w-[44px] px-3 md:px-4 text-sm"
                                  >
                                    1
                                  </PaginationLink>
                                </PaginationItem>
                                {start > 2 && (
                                  <PaginationItem>
                                    <PaginationEllipsis />
                                  </PaginationItem>
                                )}
                              </>
                            )}

                            {pages.map((page) => (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  href="#"
                                  isActive={page === currentPage}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setCurrentPage(page);
                                  }}
                                  className="min-h-[44px] min-w-[44px] px-3 md:px-4 text-sm"
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            ))}

                            {end < totalPages && (
                              <>
                                {end < totalPages - 1 && (
                                  <PaginationItem>
                                    <PaginationEllipsis />
                                  </PaginationItem>
                                )}
                                <PaginationItem>
                                  <PaginationLink
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setCurrentPage(totalPages);
                                    }}
                                    className="min-h-[44px] min-w-[44px] px-3 md:px-4 text-sm"
                                  >
                                    {totalPages}
                                  </PaginationLink>
                                </PaginationItem>
                              </>
                            )}
                          </>
                        );
                      })()}

                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage((p) => Math.min(totalPages, p + 1));
                          }}
                          className={`min-h-[44px] px-3 md:px-4 text-sm ${
                            currentPage === totalPages
                              ? "pointer-events-none opacity-50"
                              : ""
                          }`}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>

                  <div className="text-center text-sm text-muted-foreground mt-3">
                    Page {currentPage} of {totalPages} (
                    {filteredCategories.length} total categories)
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit Category Modal */}
          {editingCategory && (
            <Dialog
              open={!!editingCategory}
              onOpenChange={() => setEditingCategory(null)}
            >
              <DialogContent className="max-w-[95vw] md:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader className="pb-3 md:pb-4">
                  <DialogTitle className="text-lg md:text-xl">
                    Edit Category
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 md:space-y-6">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Category Name *
                    </label>
                    <Input
                      placeholder="Enter category name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-10 md:h-11"
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
                      className="h-10 md:h-11"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-3 block">
                      Roles (who can use it) *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {roleOptions.map((r) => {
                        const checked = editRoles.includes(r);
                        return (
                          <label
                            key={r}
                            className="flex items-center gap-2 text-sm cursor-pointer select-none p-2 rounded-md hover:bg-accent/50 transition-colors"
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-primary border-primary rounded focus:ring-primary"
                              checked={checked}
                              onChange={() => {
                                setEditRoles((prev) =>
                                  checked
                                    ? prev.filter((x) => x !== r)
                                    : [...prev, r]
                                );
                              }}
                            />
                            <span className="font-medium">
                              {r === "hod"
                                ? "HoD"
                                : r.charAt(0).toUpperCase() + r.slice(1)}
                            </span>
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
                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <Button
                      onClick={handleSaveEdit}
                      className="flex-1 h-11 sm:h-10"
                    >
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
                      className="flex-1 h-11 sm:h-10"
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
              pendingDeleteCategory &&
              pendingDeleteCategory.status !== "inactive"
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
      </div>
    </div>
  );
}

export default CategoryManagement;
