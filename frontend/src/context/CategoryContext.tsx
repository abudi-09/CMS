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
    "Grade Issue",
    "Disciplinary Issue",
    "Teacher Missed Class",
    "Dorm Issue",
    "Library Closed",
    "Café Issue",
    "Change Mid and Final Exam Date",
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
