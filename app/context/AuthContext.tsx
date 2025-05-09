"use client";
import React, { createContext, useContext, useState, ReactNode } from "react";
import { account, database } from "../appwrite";

export interface User {
    id: string;
    name: string;
    role?: string; // "leader" | "user"
}

export interface AuthContextType {
    user: User | null;
    login: (id: string, name: string) => Promise<void>;
    logout: () => Promise<void>;
    setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(() => {
        if (typeof window === "undefined") return null;
        const stored = localStorage.getItem("userProfile");
        return stored ? JSON.parse(stored) : null;
    });

    const login = async (id: string, name: string) => {
        try {
            // Lấy profile từ collection profile
            const profile = await database.getDocument(
                String(process.env.NEXT_PUBLIC_DATABASE_ID),
                String(process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE),
                id
            );
            const u: User = { id, name, role: profile.role };
            setUser(u);
            localStorage.setItem("userProfile", JSON.stringify(u));
        } catch (err) {
            console.error("Login error fetching profile:", err);
            throw err;
        }
    };

    const logout = async () => {
        try {
            await account.deleteSession("current");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
        } catch (error: any) {
        } finally {
            setUser(null);
            localStorage.removeItem("userProfile");
            localStorage.removeItem("activeProjectId");
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, setUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within an AuthProvider");
    return context;
};
