"use client";

import React, { useState, useEffect } from "react";
import { User } from "@/app/context/AuthContext";
import AvatarUser from "../../common/AvatarUser";
import Button from "../../common/Button";
import { formatVietnameseDateTime } from "@/app/utils/date";

interface EditProfileViewProps {
  user: User;
  pendingAvatarFile: File | null;
  onAvatarChangeClick: () => void;
  onSaveChanges: (newName: string) => void;
  onClose: () => void;
  isSaving: boolean;
}

const EditProfileView: React.FC<EditProfileViewProps> = ({
  user,
  pendingAvatarFile,
  onAvatarChangeClick,
  onSaveChanges,
  onClose,
  isSaving,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(user.name);
  const [tempAvatarUrl, setTempAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    setEditedName(user.name);
  }, [user.name]);

  useEffect(() => {
    if (pendingAvatarFile) {
      const url = URL.createObjectURL(pendingAvatarFile);
      setTempAvatarUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setTempAvatarUrl(null);
  }, [pendingAvatarFile]);

  const handleSaveClick = () => {
    if (isSaving) return;
    onSaveChanges(editedName);
  };

  const handleNameEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setIsEditingName(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-2">
      {/* Avatar Section */}
      <div className="flex justify-center">
        <div className="group cursor-pointer" onClick={onAvatarChangeClick}>
          <AvatarUser
            name={user.name}
            avatarUrl={tempAvatarUrl || user.avatarUrl}
            size={90}
          >
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-sm opacity-0 transition-opacity group-hover:opacity-100">
              <span className="text-sm font-semibold text-white">Thay đổi</span>
            </div>
          </AvatarUser>
        </div>
      </div>

      {/* User Info Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
          {isEditingName ? (
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="text-base font-medium text-black bg-transparent border-none focus:ring-0 p-0 w-full"
              autoFocus
              onKeyDown={handleNameEditKeyDown}
            />
          ) : (
            <span className="text-base font-medium text-black">
              {editedName}
            </span>
          )}
          
          {isEditingName ? (
            <button
              type="button"
              className="cursor-pointer text-sm text-gray-500 underline hover:text-gray-700 flex-shrink-0 ml-4 p-1"
              onClick={() => setIsEditingName(false)}
            >
              Xong
            </button>
          ) : (
            <button
              type="button"
              className="cursor-pointer text-sm text-gray-500 underline hover:text-gray-700 flex-shrink-0 ml-4 p-1"
              onClick={() => setIsEditingName(true)}
            >
              Thay đổi
            </button>
          )}
        </div>
        <div className="text-base text-gray-800">{user.email || "(Chưa có email)"}</div>
        <div className="text-sm text-gray-500">
          Ngày tạo: {formatVietnameseDateTime(user.createdAt)}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex justify-end gap-3">
        <Button
          variant="ghost"
          onClick={onClose}
          className="border border-transparent text-black hover:bg-gray-200"
          disabled={isSaving}
        >
          Hủy
        </Button>
        <Button
          variant="solid"
          className="bg-black text-white"
          onClick={handleSaveClick}
          disabled={isSaving || (user.name === editedName && !pendingAvatarFile)}
        >
          {isSaving ? "Đang lưu..." : "Lưu"}
        </Button>
      </div>
    </div>
  );
};

export default EditProfileView;