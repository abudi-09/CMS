import { useEffect, useState, ReactNode } from "react";
import { Theme, ThemeProviderContext } from "./theme-context";

type ThemeProviderProps = {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = import("./theme-context").ThemeProviderState;

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "ui-theme",
  ...props
}: ThemeProviderProps) {
  const getInitialTheme = (): Theme => {
    try {
      if (typeof window !== "undefined") {
        const stored = window.localStorage.getItem(storageKey) as Theme | null;
        if (stored === "light" || stored === "dark" || stored === "system") {
          return stored;
        }
      }
    } catch {
      // ignore localStorage access issues
    }
    return defaultTheme;
  };

  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  const value: ThemeProviderState = {
    theme,
    setTheme: (next: Theme) => {
      try {
        window.localStorage.setItem(storageKey, next);
      } catch {
        // ignore localStorage write issues
      }
      setThemeState(next);
    },
  };

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}
