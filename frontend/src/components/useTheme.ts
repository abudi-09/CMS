import { useContext } from "react";
import { ThemeProvider } from "./ThemeProvider"; // for type augmentation
import { createContext } from "react";

// Reuse the same context from ThemeProvider via module augmentation would be complex here.
// Instead, export a minimal hook by re-importing the context via require hack is not ideal.
// Simpler: export the context from ThemeProvider.
