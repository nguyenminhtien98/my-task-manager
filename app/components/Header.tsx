"use client";
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { HeaderProps } from '../types/taskTypes';
import { useProject } from '../context/ProjectContext';

const Header: React.FC<HeaderProps> = ({ onCreateTask, onLoginClick, onCreateProject }) => {
    const { user, logout } = useAuth();
    const { projects, currentProject, setCurrentProject, setCurrentProjectRole } = useProject();
    const [showMenu, setShowMenu] = useState(false);
    const [showProjectFilter, setShowProjectFilter] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const filterRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const handleClickOutsideFilter = (e: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
                setShowProjectFilter(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutsideFilter);
        return () => {
            document.removeEventListener('mousedown', handleClickOutsideFilter);
        };
    }, []);

    return (
        <header className="flex flex-col sm:flex-row items-center justify-between text-white p-4 pb-0">
            <h1 className="text-xl font-bold mb-2 sm:mb-0 text-black">Task Manager</h1>
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
                {user && projects.length > 1 && (
                    <div ref={filterRef} className="relative">
                        <button
                            onClick={() => setShowProjectFilter((prev) => !prev)}
                            className="bg-[#40a8f6] text-white px-3 py-1 rounded cursor-pointer"
                        >
                            Lọc dự án:{" "}
                            {currentProject ? currentProject.name : "Chọn dự án"}
                        </button>
                        {showProjectFilter && (
                            <div className="z-[1] absolute right-0 mt-1 w-48 bg-white text-black rounded shadow-lg">
                                {projects.map((proj) => (
                                    <button
                                        key={proj.id}
                                        onClick={() => {
                                            setCurrentProject(proj);
                                            setCurrentProjectRole(
                                                proj.leaderId === user?.id ? "leader" : "user"
                                            );
                                            setShowProjectFilter(false);
                                        }}
                                        className="cursor-pointer block w-full text-left px-4 py-2 hover:bg-gray-200"
                                    >
                                        {proj.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                {user && projects.length > 0 && onCreateProject && (
                    <button
                        onClick={onCreateProject}
                        className="flex items-center bg-green-600 cursor-pointer hover:bg-green-700 px-3 py-1 rounded"
                    >
                        Add Project
                    </button>
                )}
                <button
                    onClick={onCreateTask}
                    className="flex items-center bg-[#d15f63] cursor-pointer hover:bg-[#df8c8c] px-3 py-1 rounded"
                >
                    Add Task
                </button>
                {user ? (
                    <div ref={menuRef} className="relative">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="bg-gray-100 text-black cursor-pointer px-3 py-1 rounded"
                        >
                            {currentProject?.leaderId === user.id ? "Leader:" : "User:"} {user.name}
                        </button>
                        {showMenu && (
                            <div className="z-[1] absolute right-0 mt-1 w-32 bg-white text-black rounded shadow-lg">
                                <button
                                    onClick={() => { logout(); setShowMenu(false); console.log("log") }}
                                    className="cursor-pointer block w-full text-left px-4 py-2 hover:bg-gray-200"
                                >
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <button
                        onClick={onLoginClick}
                        className="bg-gray-100 text-black cursor-pointer px-3 py-1 rounded"
                    >
                        Login
                    </button>
                )}
            </div>
        </header>
    );
};

export default Header;
