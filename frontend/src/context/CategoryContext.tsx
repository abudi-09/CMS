import React, { createContext, useContext, useState, ReactNode } from "react";

interface CategoryContextType {
  categories: string[];
  addCategory: (category: string) => void;
}

const CategoryContext = createContext<CategoryContextType | undefined>(
  undefined
);

export const useCategories = () => {
  const ctx = useContext(CategoryContext);
  if (!ctx)
    throw new Error("useCategories must be used within CategoryProvider");
  return ctx;
};

export const CategoryProvider = ({ children }: { children: ReactNode }) => {
  const [categories, setCategories] = useState<string[]>([
    "IT & Technology",
    "Student Services",
    "Infrastructure & Facilities",
    "Academics",
    "Other",
  ]);

  const addCategory = (category: string) => {
    setCategories((prev) =>
      prev.includes(category) ? prev : [...prev, category]
    );
  };

  return (
    <CategoryContext.Provider value={{ categories, addCategory }}>
      {children}
    </CategoryContext.Provider>
  );
};
