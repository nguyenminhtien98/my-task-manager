"use client";

import React, { useEffect, useRef } from "react";
import { FiImage, FiX } from "react-icons/fi";
import toast from "react-hot-toast";
import Button from "../common/Button";
import {
  MAX_UPLOAD_SIZE_BYTES,
  MAX_UPLOAD_SIZE_LABEL,
  getUploadFileLabel,
} from "../../utils/upload";

interface FeedbackChatPanelProps {
  onClose: () => void;
}

const FeedbackChatPanel: React.FC<FeedbackChatPanelProps> = ({ onClose }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleMediaClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      event.target.value = "";
      return;
    }

    const oversizeTypes = new Set<string>();
    Array.from(files).forEach((file) => {
      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        oversizeTypes.add(getUploadFileLabel(file));
      }
    });

    oversizeTypes.forEach((label) => {
      toast.error(
        `${label} bạn chọn có kích thước > ${MAX_UPLOAD_SIZE_LABEL}. Vui lòng chọn ${label.toLowerCase()} < ${MAX_UPLOAD_SIZE_LABEL}.`
      );
    });

    event.target.value = "";
  };

  return (
    <div className="flex w-[320px] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
        <span className="text-sm font-semibold text-[#111827]">FeedBack</span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/5 text-gray-600 transition hover:bg-black/10 hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
          aria-label="Đóng phản hồi"
        >
          <FiX />
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-10 text-sm font-medium text-gray-400">
        Coming soon
      </div>

      <div className="border-t border-black/10 bg-gray-50 px-1 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleMediaClick}
            className="cursor-pointer rounded-full bg-black/70 p-2 text-white transition hover:bg-black focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
            title="Đính kèm hình ảnh/video"
          >
            <FiImage />
          </button>
          <input
            ref={inputRef}
            type="text"
            placeholder="Góp ý cho chúng tôi..."
            className="flex-1 rounded-full bg-black/70 px-4 py-2 text-sm text-white placeholder:text-white/60 focus:outline-none"
          />
          <Button
            type="button"
            className="bg-black text-white !px-3 !py-2 !rounded-lg"
          >
            Gửi
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default FeedbackChatPanel;
