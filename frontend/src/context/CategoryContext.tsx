import React, { createContext, useState, ReactNode } from "react";

interface CategoryContextType {
  categories: string[];
  addCategory: (category: string) => void;
}

export const CategoryContext = createContext<CategoryContextType | undefined>(
  undefined
);

// useCategories hook moved to a separate file for Fast Refresh compatibility.

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
