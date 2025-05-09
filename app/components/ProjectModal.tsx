"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import ModalComponent from "./ModalComponent";
import { database } from "../appwrite";
import toast from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "../context/AuthContext";
import { useProject } from "../context/ProjectContext";
import { Project, ProjectFormValues } from "../types/taskTypes";

const ProjectModal: React.FC<{ isOpen: boolean; setIsOpen: (v: boolean) => void }> = ({
    isOpen,
    setIsOpen,
}) => {
    const { user } = useAuth();
    const { setCurrentProject, setCurrentProjectRole } = useProject();
    const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<ProjectFormValues>({
        mode: "onChange",
        defaultValues: {
            name: "",
        },
    });

    const onSubmit = async (data: ProjectFormValues) => {
        if (!user) return;
        const projectId = uuidv4();
        const newProject: Project = {
            id: projectId,
            name: data.name,
            leaderId: user.id,
            members: [],
        };
        try {
            await database.createDocument(
                String(process.env.NEXT_PUBLIC_DATABASE_ID),
                String(process.env.NEXT_PUBLIC_COLLECTION_ID_PROJECTS),
                projectId,
                newProject
            );
            setCurrentProject(newProject);
            setCurrentProjectRole("leader");
            toast.success("Tạo dự án thành công!");
            reset();
            setIsOpen(false);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            toast.error(e.message || "Tạo dự án thất bại");
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
                    <label className="block text-sm font-medium">Tên dự án</label>
                    <input
                        {...register("name", { required: "Tên dự án là bắt buộc" })}
                        className="mt-1 w-full p-2 border border-gray-300 rounded"
                    />
                    {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
                </div>
                <div className="flex justify-end space-x-4">
                    <button type="button" onClick={handleCancel} className="cursor-pointer px-4 py-2 bg-gray-300 rounded">
                        Hủy
                    </button>

                    <button
                        type="submit"
                        disabled={!projectName.trim()}
                        className={`px-4 py-2 rounded text-white ${!projectName.trim()
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
