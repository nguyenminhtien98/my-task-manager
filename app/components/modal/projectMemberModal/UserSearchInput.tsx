"use client";

import React, { useState } from "react";
import Button from "../../common/Button";
import { isValidEmail } from "@/app/utils/inputValidation";

interface UserSearchInputProps {
  onAddMember: (userId: string) => Promise<void> | void;
  existingMemberIds: string[];
  placeholder?: string;
  disabled?: boolean;
}

const UserSearchInput: React.FC<UserSearchInputProps> = ({
  onAddMember,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  existingMemberIds,
  placeholder,
  disabled = false,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  const handleAddUserClick = async () => {
    if (disabled) return;
    const email = searchQuery.trim();
    if (!email) return;

    if (!isValidEmail(email)) {
      setEmailError("Email không hợp lệ");
      return;
    }

    setEmailError("");
    setIsLoading(true);
    try {
      await onAddMember(email);
      setSearchQuery("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (emailError) {
      setEmailError("");
    }
  };

  const isAddButtonDisabled =
    disabled || searchQuery.trim().length === 0 || isLoading;

  return (
    <div className="w-full space-y-1">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
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
      {emailError && (
        <p className="text-xs text-red-500">{emailError}</p>
      )}
    </div>
  );
};

export default UserSearchInput;
