import React from "react";

export type ReactionType = "like" | "heart" | "haha" | "laugh" | "love" | "wow" | "angry";

export interface Reaction {
  type: ReactionType;
  emoji: string;
  label: string;
}

export const REACTION_CONFIGS: Reaction[] = [
  { type: "like", emoji: "👍", label: "Like" },
  { type: "heart", emoji: "♥️", label: "Yêu thích" },
  { type: "haha", emoji: "😆", label: "Haha" },
  { type: "laugh", emoji: "😂", label: "Cười" },
  { type: "love", emoji: "😍", label: "Thích" },
  { type: "wow", emoji: "😲", label: "Wow" },
  { type: "angry", emoji: "😠", label: "Giận" },
];

export const getReactionByType = (type: ReactionType): Reaction | undefined => {
  return REACTION_CONFIGS.find((r) => r.type === type);
};

export const renderReactionEmoji = (type: ReactionType): React.ReactNode => {
  const reaction = getReactionByType(type);
  return reaction ? reaction.emoji : null;
};

export const getReactionLabel = (type: ReactionType): string => {
  const reaction = getReactionByType(type);
  return reaction?.label || "";
};
