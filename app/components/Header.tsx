"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useProject } from "../context/ProjectContext";
import { HeaderProps } from "../types/Types";
import AvatarUser from "./common/AvatarUser";
import AnimatedGradientLogo from "./common/AnimatedGradientLogo";
import ThemePickerModal from "./ThemePickerModal";
import { useTheme } from "../context/ThemeContext";
import { DEFAULT_THEME_GRADIENT } from "../utils/themeColors";
import { database } from "../appwrite";
import toast from "react-hot-toast";
import Button from "./common/Button";

const Header: React.FC<HeaderProps> = ({ onCreateTask, onLoginClick, onCreateProject }) => {
    const { user, logout, setUser } = useAuth();
    const { projects, currentProject, setCurrentProject, setCurrentProjectRole } = useProject();
    const [showMenu, setShowMenu] = useState(false);
    const [showProjectFilter, setShowProjectFilter] = useState(false);
    const [themeModalOpen, setThemeModalOpen] = useState(false);
    const [pendingTheme, setPendingTheme] = useState<string>(DEFAULT_THEME_GRADIENT);
    const [isSavingTheme, setIsSavingTheme] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const filterRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const { setTheme, resetTheme } = useTheme();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const handleClickOutsideFilter = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setShowProjectFilter(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutsideFilter);
        return () => document.removeEventListener("mousedown", handleClickOutsideFilter);
    }, []);

    useEffect(() => {
        setPendingTheme(user?.themeColor || DEFAULT_THEME_GRADIENT);
    }, [user?.themeColor]);

    const handleOpenThemeModal = () => {
        const current = user?.themeColor || DEFAULT_THEME_GRADIENT;
        setPendingTheme(current);
        setTheme(current);
        setThemeModalOpen(true);
        setShowMenu(false);
    };

    const handleCloseThemeModal = () => {
        setThemeModalOpen(false);
        resetTheme();
        setPendingTheme(user?.themeColor || DEFAULT_THEME_GRADIENT);
    };

    const handleSelectTheme = (gradient: string) => {
        setPendingTheme(gradient);
        setTheme(gradient);
    };

    const handleSaveTheme = async () => {
        if (!user) return;
        setIsSavingTheme(true);
        try {
            await database.updateDocument(
                String(process.env.NEXT_PUBLIC_DATABASE_ID),
                String(process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE),
                user.id,
                { themeColor: pendingTheme }
            );
            const updatedUser = { ...user, themeColor: pendingTheme };
            setUser(updatedUser);
            toast.success("Đã cập nhật màu nền.");
            setThemeModalOpen(false);
        } catch (error) {
            console.error("Failed to update theme color:", error);
            toast.error("Cập nhật màu nền thất bại.");
            resetTheme();
        } finally {
            setIsSavingTheme(false);
        }
    };

    return (
        <>
            <header className="sticky top-0 z-50 flex w-full flex-col items-center justify-between gap-4 border-b border-white/30 bg-white/40 p-2 backdrop-blur-lg sm:flex-row">
                <AnimatedGradientLogo className="text-xl font-bold sm:text-2xl" />

                <div className="flex flex-col items-center space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4">
                    {user && projects.length > 1 && (
                        <div ref={filterRef} className="relative">
                            <Button
                                onClick={() => setShowProjectFilter((prev) => !prev)}
                                className="px-3 py-1 bg-[#40a8f6] text-white hover:bg-[#3494dc]"
                            >
                                Lọc dự án: {currentProject ? currentProject.name : "Chọn dự án"}
                            </Button>
                            {showProjectFilter && (
                                <div className="absolute right-0 mt-1 w-48 rounded bg-white text-black shadow-lg z-40">
                                    {projects.map((proj) => (
                                        <Button
                                            key={proj.id}
                                            variant="ghost"
                                            onClick={() => {
                                                setCurrentProject(proj);
                                                setCurrentProjectRole(proj.leaderId === user?.id ? "leader" : "user");
                                                setShowProjectFilter(false);
                                            }}
                                            className="w-full justify-start px-4 py-2 text-left text-[#111827] hover:bg-gray-200"
                                        >
                                            {proj.name}
                                        </Button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {user && projects.length > 0 && onCreateProject && (
                        <Button
                            onClick={onCreateProject}
                            className="px-3 py-1 bg-green-600 text-white hover:bg-green-700"
                        >
                            Add Project
                        </Button>
                    )}

                    <Button
                        onClick={onCreateTask}
                        className="px-3 py-1 bg-[#d15f63] text-white hover:bg-[#df8c8c]"
                    >
                        Add Task
                    </Button>

                    {user ? (
                        <div ref={menuRef} className="relative">
                            <AvatarUser
                                name={user.name}
                                size={36}
                                onClick={() => setShowMenu((prev) => !prev)}
                                title={`${currentProject?.leaderId === user.id ? "Leader" : "User"}: ${user.name}`}
                            />
                            {showMenu && (
                                <div className="absolute right-0 mt-1 w-48 rounded bg-white text-black shadow-lg z-[60]">
                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            router.push("/project");
                                            setShowMenu(false);
                                        }}
                                        className="w-full justify-start px-4 py-2 text-left text-[#111827]"
                                    >
                                        Quản lý dự án
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={handleOpenThemeModal}
                                        className="w-full justify-start px-4 py-2 text-left text-[#111827]"
                                    >
                                        Thay đổi màu nền
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            logout();
                                            setShowMenu(false);
                                        }}
                                        className="w-full justify-start px-4 py-2 text-left text-[#111827]"
                                    >
                                        Logout
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Button
                            onClick={onLoginClick}
                            variant="ghost"
                            className="px-3 py-1 bg-gray-100 text-black hover:bg-gray-200"
                        >
                            Login
                        </Button>
                    )}
                </div>
            </header>

            <ThemePickerModal
                isOpen={themeModalOpen}
                onClose={handleCloseThemeModal}
                selectedColor={pendingTheme}
                onSelect={handleSelectTheme}
                onSave={handleSaveTheme}
                isSaving={isSavingTheme}
            />
        </>
    );
};

export default Header;
