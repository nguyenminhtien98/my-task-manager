"use client";
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { HeaderProps } from '../types/taskTypes';

const Header: React.FC<HeaderProps> = ({ onCreateTask, onLoginClick }) => {
    const { user, logout } = useAuth();
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className="flex flex-col sm:flex-row items-center justify-between text-white p-4 pb-0">
            <h1 className="text-xl font-bold mb-2 sm:mb-0 text-black">Task Manager</h1>
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
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
                            User: {user.name}
                        </button>
                        {showMenu && (
                            <div className="absolute right-0 mt-1 w-32 bg-white text-black rounded shadow-lg">
                                <button
                                    onClick={() => { logout(); setShowMenu(false); }}
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
