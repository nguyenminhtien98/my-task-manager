"use client";

import React, { useState, useRef, ChangeEvent } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/app/context/AuthContext";
import { database } from "@/app/appwrite";
import { uploadFilesToCloudinary } from "@/app/utils/upload";
import ModalComponent from "../../common/ModalComponent";
import EditProfileView from "./EditProfileView";
import AvatarEditView from "./AvatarEditView";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, setUser } = useAuth();
  const [view, setView] = useState<"profile" | "avatar">("profile");
  const [imgSrc, setImgSrc] = useState("");
  const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setTimeout(() => {
      setView("profile");
      setImgSrc("");
      setNewAvatarFile(null);
      setIsUploading(false);
    }, 300);
    onClose();
  };

  const handleAvatarChangeClick = () => {
    if (isUploading) return;
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

    setIsUploading(true);
    let newAvatarUrl: string | undefined = undefined;

    try {
      if (avatarHasChanged && newAvatarFile) {
        const uploaded = await uploadFilesToCloudinary([newAvatarFile]);
        if (uploaded.length > 0 && uploaded[0].url) {
          newAvatarUrl = uploaded[0].url;
        } else {
          throw new Error("Upload ảnh thất bại.");
        }
      }

      const updateData: { name?: string; avatarUrl?: string } = {};
      if (nameHasChanged) updateData.name = newName.trim();
      if (newAvatarUrl) updateData.avatarUrl = newAvatarUrl;

      if (Object.keys(updateData).length > 0) {
        await database.updateDocument(
          String(process.env.NEXT_PUBLIC_DATABASE_ID),
          String(process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE),
          user.id,
          updateData
        );

        const updatedUser = { ...user, ...updateData };
        setUser(updatedUser);
        toast.success("Cập nhật hồ sơ thành công!");
      } else {
        toast.success("Không có gì thay đổi.");
      }

      handleClose();

    } catch (error) {
      console.error("Lỗi cập nhật hồ sơ:", error);
      toast.error(error instanceof Error ? error.message : "Đã có lỗi xảy ra.");
      setIsUploading(false);
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
        disabled={isUploading}
      />

      {view === "profile" ? (
        <EditProfileView
          user={user}
          pendingAvatarFile={newAvatarFile}
          onAvatarChangeClick={handleAvatarChangeClick}
          onSaveChanges={handleUpdateProfile}
          onClose={handleClose}
          isSaving={isUploading}
        />
      ) : (
        <AvatarEditView
          imgSrc={imgSrc}
          userName={user.name}
          onCancel={() => setView("profile")}
          onSave={handleAvatarCropped}
          isSaving={isUploading}
        />
      )}
    </ModalComponent>
  );
};

export default EditProfileModal;
