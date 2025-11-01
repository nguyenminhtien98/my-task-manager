"use client";

import React, { useState, useRef, ChangeEvent } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/app/context/AuthContext";
import ModalComponent from "../../common/ModalComponent";
import EditProfileView from "./EditProfileView";
import AvatarEditView from "./AvatarEditView";
import { useProfile } from "@/app/hooks/useProfile";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [view, setView] = useState<"profile" | "avatar">("profile");
  const [imgSrc, setImgSrc] = useState("");
  const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isUpdating, updateProfile } = useProfile();

  const handleClose = () => {
    setTimeout(() => {
      setView("profile");
      setImgSrc("");
      setNewAvatarFile(null);
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
    const avatarFile = new File([croppedImageBlob], "avatar.png", { type: "image/png" });
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
      handleClose();
    } else {
      toast.error(result.message);
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
