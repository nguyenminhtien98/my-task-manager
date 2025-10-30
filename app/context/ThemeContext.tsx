"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useProject } from "./ProjectContext";
import { DEFAULT_THEME_GRADIENT } from "../utils/themeColors";

interface ThemeContextType {
  theme: string;
  setTheme: (gradient: string) => void;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { currentProject } = useProject();
  const [theme, setThemeState] = useState<string>(DEFAULT_THEME_GRADIENT);

  const applyTheme = useCallback((gradient: string) => {
    setThemeState(gradient);
  }, []);

  const resetTheme = useCallback(() => {
    applyTheme(currentProject?.themeColor || DEFAULT_THEME_GRADIENT);
  }, [applyTheme, currentProject?.themeColor]);

  useEffect(() => {
    applyTheme(currentProject?.themeColor || DEFAULT_THEME_GRADIENT);
  }, [applyTheme, currentProject?.themeColor]);

  const value: ThemeContextType = {
    theme,
    setTheme: applyTheme,
    resetTheme,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
