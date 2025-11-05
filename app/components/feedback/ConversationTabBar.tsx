"use client";

import React from "react";
import Button from "../common/Button";
import { ConversationType } from "../../services/feedbackService";

interface ConversationTabBarProps {
  activeTab: ConversationType;
  onTabChange: (tab: ConversationType) => void;
  hasProject: boolean;
}

const ConversationTabBar: React.FC<ConversationTabBarProps> = ({
  activeTab,
  onTabChange,
  hasProject,
}) => (
  <div className="flex items-center gap-2 px-4 pt-3 pb-2">
    <Button
      variant="solid"
      onClick={() => onTabChange("member")}
      className={`rounded-full !px-3 !py-1 !text-xs ${
        activeTab === "member"
          ? "border bg-black text-white"
          : "border border-gray-300 bg-white text-[#111827]"
      }`}
      disabled={!hasProject}
    >
      Thành viên
    </Button>
    <Button
      variant="solid"
      onClick={() => onTabChange("feedback")}
      className={`rounded-full !px-3 !py-1 !text-xs ${
        activeTab === "feedback"
          ? "border bg-black text-white"
          : "border border-gray-300 bg-white text-[#111827]"
      }`}
    >
      Feedback
    </Button>
  </div>
);

export default ConversationTabBar;
