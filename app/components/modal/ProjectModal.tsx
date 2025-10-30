"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import ModalComponent from "../common/ModalComponent";
import { database } from "../../appwrite";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { useProject } from "../../context/ProjectContext";
import { Project, ProjectFormValues } from "../../types/Types";

const ProjectModal: React.FC<{
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  onProjectCreate?: () => void;
}> = ({ isOpen, setIsOpen, onProjectCreate }) => {
  const { user } = useAuth();
  const { setCurrentProject, setCurrentProjectRole, setProjects } =
    useProject();
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
    if (!user) return;

    try {
      const projectDocument = await database.createDocument(
        String(process.env.NEXT_PUBLIC_DATABASE_ID),
        String(process.env.NEXT_PUBLIC_COLLECTION_ID_PROJECTS),
        "unique()",
        {
          name: data.name,
          leader: user.id,
        }
      );

      await database.createDocument(
        String(process.env.NEXT_PUBLIC_DATABASE_ID),
        String(process.env.NEXT_PUBLIC_COLLECTION_ID_PROJECT_MEMBERSHIPS),
        "unique()",
        {
          project: projectDocument.$id,
          user: user.id,
          joinedAt: new Date().toISOString(),
        }
      );

      const createdProject: Project = {
        $id: projectDocument.$id,
        name: projectDocument.name,
        leader: projectDocument.leader,
        $createdAt: projectDocument.$createdAt,
      };

      setCurrentProject(createdProject);
      setCurrentProjectRole("leader");
      setProjects((prevProjects) => [...prevProjects, createdProject]);
      toast.success("Tạo dự án thành công!");
      onProjectCreate?.();
      reset();
      setIsOpen(false);
    } catch (e: unknown) {
      if (e instanceof Error) {
        toast.error(e.message || "Tạo dự án thất bại");
      } else {
        toast.error("Tạo dự án thất bại");
      }
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
                : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
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
