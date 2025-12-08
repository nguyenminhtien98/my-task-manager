import { useEffect, useState } from "react";
import type { ModerationEvent } from "@/lib/axios";

export const useModeration = () => {
  const [isSuspended, setIsSuspended] = useState(false);
  const [suspendedMessage, setSuspendedMessage] = useState<string | null>(null);

  const [chatCooldown, setChatCooldown] = useState<{
    until: Date;
    message: string;
  } | null>(null);

  const [commentCooldown, setCommentCooldown] = useState<{
    until: Date;
    message: string;
  } | null>(null);

  useEffect(() => {
    const handleModeration = (event: CustomEvent<ModerationEvent>) => {
      const detail = event.detail;

      if (detail.type === "suspended") {
        setIsSuspended(true);
        setSuspendedMessage(detail.message);
      } else if (detail.type === "rateLimit") {
        const cooldownEnd = new Date(
          Date.now() + detail.cooldownMinutes * 60 * 1000
        );
        const cooldownData = { until: cooldownEnd, message: detail.message };

        if (detail.feature === "chat") {
          setChatCooldown(cooldownData);
        } else if (detail.feature === "comment") {
          setCommentCooldown(cooldownData);
        }
      }
    };

    window.addEventListener("moderation", handleModeration as EventListener);
    return () => {
      window.removeEventListener(
        "moderation",
        handleModeration as EventListener
      );
    };
  }, []);

  useEffect(() => {
    if (!chatCooldown) return;
    const remaining = chatCooldown.until.getTime() - Date.now();
    if (remaining <= 0) {
      setChatCooldown(null);
      return;
    }
    const timer = setTimeout(() => setChatCooldown(null), remaining);
    return () => clearTimeout(timer);
  }, [chatCooldown]);

  useEffect(() => {
    if (!commentCooldown) return;
    const remaining = commentCooldown.until.getTime() - Date.now();
    if (remaining <= 0) {
      setCommentCooldown(null);
      return;
    }
    const timer = setTimeout(() => setCommentCooldown(null), remaining);
    return () => clearTimeout(timer);
  }, [commentCooldown]);

  const isChatDisabled = isSuspended || chatCooldown !== null;
  const isCommentDisabled = isSuspended || commentCooldown !== null;

  return {
    isSuspended,
    suspendedMessage,
    chatCooldown,
    commentCooldown,
    isChatDisabled,
    isCommentDisabled,
  };
};
