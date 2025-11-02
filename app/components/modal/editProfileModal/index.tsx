"use client";

import React, { useState, useRef, ChangeEvent } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/app/context/AuthContext";
import ModalComponent from "../../common/ModalComponent";
import EditProfileView from "./EditProfileView";
import AvatarEditView from "./AvatarEditView";
import { useProfile } from "@/app/hooks/useProfile";
import {
  MAX_UPLOAD_SIZE_BYTES,
  MAX_UPLOAD_SIZE_LABEL,
  getUploadFileLabel,
} from "../../../utils/upload";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [view, setView] = useState<"profile" | "avatar">("profile");
  const [imgSrc, setImgSrc] = useState("");
  const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [isNameLocked, setIsNameLocked] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isUpdating, updateProfile } = useProfile();

  const DUPLICATE_NAME_MESSAGE = "Tên này đã tồn tại trong hệ thống.";

  const handleClose = () => {
    setTimeout(() => {
      setView("profile");
      setImgSrc("");
      setNewAvatarFile(null);
      setNameError(null);
      setIsNameLocked(false);
    }, 300);
    onClose();
  };

  const handleAvatarChangeClick = () => {
    if (isUpdating) return;
    fileInputRef.current?.click();
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        const label = getUploadFileLabel(file);
        toast.error(
          `${label} bạn chọn có kích thước > ${MAX_UPLOAD_SIZE_LABEL}. Vui lòng chọn ${label.toLowerCase()} < ${MAX_UPLOAD_SIZE_LABEL}.`
        );
        e.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImgSrc(reader.result?.toString() || "");
        setView("avatar");
      });
      reader.readAsDataURL(file);
      e.target.value = "";
    }
  };

  const handleAvatarCropped = (croppedImageBlob: Blob) => {
    const avatarFile = new File([croppedImageBlob], "avatar.jpg", { type: "image/jpeg" });
    if (avatarFile.size > MAX_UPLOAD_SIZE_BYTES) {
      toast.error(
        `Ảnh bạn chọn có kích thước > ${MAX_UPLOAD_SIZE_LABEL}. Vui lòng chọn ảnh < ${MAX_UPLOAD_SIZE_LABEL}.`
      );
      return;
    }
    setNewAvatarFile(avatarFile);
    setView("profile");
  };

  const handleUpdateProfile = async (newName: string) => {
    if (!user) return;

    const nameHasChanged = newName.trim() !== user.name;
    const avatarHasChanged = newAvatarFile !== null;

    if (!nameHasChanged && !avatarHasChanged) {
      return handleClose();
    }

    const result = await updateProfile({
      name: newName,
      avatarFile: newAvatarFile,
    });

    if (result.success) {
      toast.success(result.message);
      setNameError(null);
      setIsNameLocked(false);
      handleClose();
    } else {
      if (result.message === DUPLICATE_NAME_MESSAGE) {
        setNameError(result.message);
        setIsNameLocked(true);
      } else {
        toast.error(result.message);
      }
    }
  };

  const handleNameInputChange = (_value: string) => {
    void _value;
    if (nameError) {
      setNameError(null);
    }
    if (isNameLocked) {
      setIsNameLocked(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <ModalComponent
      isOpen={isOpen}
      setIsOpen={() => {}}
      onClose={handleClose}
      title={view === "profile" ? "Hồ sơ" : "Thay đổi avatar"}
      panelClassName="sm:max-w-md"
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileChange}
        className="hidden"
        accept="image/png, image/jpeg, image/webp"
        disabled={isUpdating}
      />

      {view === "profile" ? (
        <EditProfileView
          user={user}
          pendingAvatarFile={newAvatarFile}
          onAvatarChangeClick={handleAvatarChangeClick}
          onSaveChanges={handleUpdateProfile}
          onClose={handleClose}
          isSaving={isUpdating}
          nameError={nameError}
          disableSave={isNameLocked}
          onNameChange={handleNameInputChange}
        />
      ) : (
        <AvatarEditView
          imgSrc={imgSrc}
          userName={user.name}
          onCancel={() => setView("profile")}
          onSave={handleAvatarCropped}
          isSaving={isUpdating}
        />
      )}
    </ModalComponent>
  );
};

export default EditProfileModal;
