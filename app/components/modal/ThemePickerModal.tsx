"use client";

import React from "react";
import ModalComponent from "../common/ModalComponent";
import { themeColors, ThemeColorOption } from "../../utils/themeColors";
import { FaCheck } from "react-icons/fa6";
import Button from "../common/Button";

interface ThemePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedColor: string;
  onSelect: (gradient: string) => void;
  onSave: () => void;
  isSaving: boolean;
}

const ThemePickerModal: React.FC<ThemePickerModalProps> = ({
  isOpen,
  onClose,
  selectedColor,
  onSelect,
  onSave,
  isSaving,
}) => {
  const renderColorCard = (option: ThemeColorOption) => {
    const isActive = selectedColor === option.gradient;

    return (
      <button
        key={option.id}
        type="button"
        onClick={() => onSelect(option.gradient)}
        className={`group cursor-pointer relative h-20 w-full overflow-hidden rounded-xl transition-transform focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isActive ? "scale-[1.01] ring-2 ring-white ring-offset-2" : "hover:scale-[1.015]"
          }`}
        style={{ background: option.gradient }}
        title={option.label}
      >
        <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/25" />
        {isActive && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <FaCheck className="text-2xl drop-shadow-lg" />
          </div>
        )}
        <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-white/80 px-2 text-xs font-semibold text-gray-800 backdrop-blur-sm">
          {option.label}
        </span>
      </button>
    );
  };

  return (
    <ModalComponent
      isOpen={isOpen}
      setIsOpen={(value) => {
        if (!value) onClose();
      }}
      title="Màu nền"
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {themeColors.map(renderColorCard)}
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button
          onClick={onSave}
          disabled={isSaving}
          backgroundColor="#111827"
          textColor="#ffffff"
          hoverClassName="hover:bg-black"
          className="px-5 py-2"
        >
          {isSaving ? "Đang lưu..." : "Lưu"}
        </Button>
      </div>
    </ModalComponent>
  );
};

export default ThemePickerModal;
