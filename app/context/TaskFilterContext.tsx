"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  TaskFiltersState,
  createDefaultTaskFilters,
} from "../utils/taskFilters";

interface TaskFilterContextValue {
  filters: TaskFiltersState;
  updateFilters: (
    updater: (prev: TaskFiltersState) => TaskFiltersState
  ) => void;
  resetFilters: () => void;
}

const TaskFilterContext = createContext<TaskFilterContextValue | undefined>(
  undefined
);

export const TaskFilterProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [filters, setFilters] = useState<TaskFiltersState>(
    createDefaultTaskFilters()
  );

  const updateFilters = useCallback(
    (updater: (prev: TaskFiltersState) => TaskFiltersState) => {
      setFilters((prev) => updater(prev));
    },
    []
  );

  const resetFilters = useCallback(() => {
    setFilters(createDefaultTaskFilters());
  }, []);

  const value = useMemo(
    () => ({
      filters,
      updateFilters,
      resetFilters,
    }),
    [filters, resetFilters, updateFilters]
  );

  return (
    <TaskFilterContext.Provider value={value}>
      {children}
    </TaskFilterContext.Provider>
  );
};

export const useTaskFilter = (): TaskFilterContextValue => {
  const context = useContext(TaskFilterContext);
  if (!context) {
    throw new Error(
      "useTaskFilter must be used within a TaskFilterProvider"
    );
  }
  return context;
};
