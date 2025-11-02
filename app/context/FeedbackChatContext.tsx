"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface FeedbackChatContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const FeedbackChatContext =
  createContext<FeedbackChatContextValue | undefined>(undefined);

export const FeedbackChatProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  const value = useMemo<FeedbackChatContextValue>(
    () => ({
      isOpen,
      open,
      close,
      toggle,
    }),
    [close, isOpen, open, toggle]
  );

  return (
    <FeedbackChatContext.Provider value={value}>
      {children}
    </FeedbackChatContext.Provider>
  );
};

export const useFeedbackChat = (): FeedbackChatContextValue => {
  const context = useContext(FeedbackChatContext);
  if (!context) {
    throw new Error(
      "useFeedbackChat must be used within a FeedbackChatProvider"
    );
  }
  return context;
};
