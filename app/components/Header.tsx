"use client";

import React, { useEffect, useRef, useState } from 'react';
import LoginRegisterModal from './LoginRegisterModal';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
    onCreateTask: () => void;
}

const Header: React.FC<HeaderProps> = ({ onCreateTask }) => {
    const { user, logout } = useAuth();
    const [showAuth, setShowAuth] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const handleUserClick = () => {
        setShowMenu(!showMenu);
    };

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <>
            <header className="flex flex-col sm:flex-row items-center justify-between bg-blue-600 text-white p-4">
                <h1 className="text-xl font-bold mb-2 sm:mb-0">Task Manager</h1>
                <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
                    <button
                        onClick={onCreateTask}
                        className="bg-blue-800 hover:bg-blue-700 px-3 py-1 rounded"
                    >
                        Tạo Task
                    </button>
                    {user ? (
                        <div ref={menuRef} className="relative">
                            <button
                                onClick={handleUserClick}
                                className="bg-white text-blue-600 px-3 py-1 rounded hover:bg-gray-100"
                            >
                                User: {user.name}
                            </button>
                            {showMenu && (
                                <div className="absolute right-0 mt-1 w-32 bg-white text-black rounded shadow-lg">
                                    <button
                                        onClick={() => { logout(); setShowMenu(false); }}
                                        className="block w-full text-left px-4 py-2 hover:bg-gray-200"
                                    >
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowAuth(true)}
                            className="bg-white text-blue-600 px-3 py-1 rounded hover:bg-gray-100"
                        >
                            Login
                        </button>
                    )}
                </div>
            </header>
            <LoginRegisterModal isOpen={showAuth} setIsOpen={setShowAuth} />
        </>

    );
};

export default Header;
