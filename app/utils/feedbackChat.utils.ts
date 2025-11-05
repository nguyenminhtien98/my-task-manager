export const ADMIN_ROLES = new Set(["leader", "admin"]);

export const HEADER_BOTTOM_OFFSET = 120;

export const getBubbleBounds = () => {
  if (typeof window === "undefined") {
    return { min: HEADER_BOTTOM_OFFSET, max: 400 };
  }
  const min = HEADER_BOTTOM_OFFSET;
  const max = Math.max(min, window.innerHeight - 64);
  return { min, max };
};

export const conversationSortValue = (conversation: {
  lastMessageAt?: string | null;
  $updatedAt?: string | null;
  $createdAt?: string | null;
}): number => {
  const fallback =
    conversation.lastMessageAt ??
    conversation.$updatedAt ??
    conversation.$createdAt ??
    "";
  const value = new Date(fallback).getTime();
  return Number.isNaN(value) ? 0 : value;
};

export type BubblePosition = {
  side: "left" | "right";
  offset: number;
};

export const getInitialBubblePosition = (): BubblePosition => {
  const { max } = getBubbleBounds();
  return { side: "right", offset: max };
};
