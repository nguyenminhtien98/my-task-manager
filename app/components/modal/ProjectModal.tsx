"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import ModalComponent from "../common/ModalComponent";
import { useProjectOperations } from "../../hooks/useProjectOperations";
import { ProjectFormValues } from "../../types/Types";

const ProjectModal: React.FC<{
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  onProjectCreate?: () => void;
}> = ({ isOpen, setIsOpen, onProjectCreate }) => {
  const { createProject } = useProjectOperations();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    mode: "onChange",
    defaultValues: {
      name: "",
    },
  });

  const onSubmit = async (data: ProjectFormValues) => {
    const result = await createProject(data.name);
    if (result.success) {
      onProjectCreate?.();
      reset();
      setIsOpen(false);
    }
  };

  const projectName = watch("name");

  const handleCancel = () => {
    reset();
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  return (
    <ModalComponent isOpen={isOpen} setIsOpen={setIsOpen} title="Tạo Dự Án">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-sub">
            Tên dự án
          </label>
          <input
            {...register("name", { required: "Tên dự án là bắt buộc" })}
            className="mt-1 w-full p-2 border border-black rounded text-black"
            placeholder="Nhập tên dự án"
          />
          {errors.name && (
            <p className="text-red-500 text-sm">{errors.name.message}</p>
          )}
        </div>
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={handleCancel}
            className="cursor-pointer px-4 py-2 bg-gray-300 rounded"
          >
            Hủy
          </button>

          <button
            type="submit"
            disabled={!projectName.trim()}
            className={`px-4 py-2 rounded text-white ${
              !projectName.trim()
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-black hover:bg-black/90 cursor-pointer"
            }`}
          >
            Tạo
          </button>
        </div>
      </form>
    </ModalComponent>
  );
};

export default ProjectModal;
