"use client";

import React, { useState } from "react";
import Button from "../../common/Button";

interface UserSearchInputProps {
  onAddMember: (userId: string) => Promise<void> | void;
  existingMemberIds: string[];
  placeholder?: string;
  disabled?: boolean;
}

const UserSearchInput: React.FC<UserSearchInputProps> = ({
  onAddMember,
  existingMemberIds,
  placeholder,
  disabled = false,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAddUserClick = async () => {
    if (disabled) return;
    const userId = searchQuery.trim();
    if (!userId) return;
    if (existingMemberIds.includes(userId)) {
      return;
    }
    setIsLoading(true);
    try {
      await onAddMember(userId);
      setSearchQuery("");
    } finally {
      setIsLoading(false);
    }
  };

  const isAddButtonDisabled =
    disabled || searchQuery.trim().length === 0 || isLoading;

  return (
    <div className="flex items-center gap-2 w-full">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder={placeholder || "Nhập email người dùng để thêm..."}
        className="flex-grow rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
        disabled={disabled}
      />
      <Button
        type="button"
        onClick={handleAddUserClick}
        disabled={isAddButtonDisabled}
        className="flex-shrink-0"
        backgroundColor="#111827"
        textColor="#ffffff"
        hoverClassName="hover:bg-black"
      >
        Thêm
      </Button>
    </div>
  );
};

export default UserSearchInput;
