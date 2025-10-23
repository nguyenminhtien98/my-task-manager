"use client";
import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react";
import { account, database } from "../appwrite";
import { DEFAULT_THEME_GRADIENT } from "../utils/themeColors";

export interface User {
    id: string;
    name: string;
    role?: string; // "leader" | "user"
    themeColor?: string;
}

export interface AuthContextType {
    user: User | null;
    login: (id: string, name: string) => Promise<void>;
    logout: () => Promise<void>;
    setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUserState] = useState<User | null>(() => {
        if (typeof window === "undefined") return null;
        const stored = localStorage.getItem("userProfile");
        if (!stored) return null;
        try {
            const parsed = JSON.parse(stored) as User;
            return {
                ...parsed,
                themeColor: parsed.themeColor || DEFAULT_THEME_GRADIENT,
            };
        } catch {
            return null;
        }
    });

    const persistUser = useCallback((value: User | null) => {
        setUserState(value);
        if (typeof window === "undefined") return;
        if (value) {
            localStorage.setItem("userProfile", JSON.stringify(value));
        } else {
            localStorage.removeItem("userProfile");
        }
    }, []);

    const login = useCallback(async (id: string, name: string) => {
        try {
            // Lấy profile từ collection profile
            const profile = await database.getDocument(
                String(process.env.NEXT_PUBLIC_DATABASE_ID),
                String(process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE),
                id
            );
            const u: User = {
                id,
                name,
                role: profile.role,
                themeColor: profile.themeColor || DEFAULT_THEME_GRADIENT,
            };
            persistUser(u);
        } catch (err) {
            console.error("Login error fetching profile:", err);
            throw err;
        }
    }, [persistUser]);

    const logout = useCallback(async () => {
        try {
            await account.deleteSession("current");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
        } catch (error: any) {
        } finally {
            persistUser(null);
            localStorage.removeItem("activeProjectId");
        }
    }, [persistUser]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        let cancelled = false;
        const hydrateSession = async () => {
            try {
                const accountInfo = await account.get();
                if (cancelled) return;
                if (!user || user.id !== accountInfo.$id) {
                    await login(accountInfo.$id, accountInfo.name);
                }
            } catch (error) {
                console.warn("Session hydrate failed:", error);
                localStorage.removeItem("activeProjectId");
                if (!cancelled) {
                    persistUser(null);
                }
            }
        };

        hydrateSession();
        return () => {
            cancelled = true;
        };
    }, [login, persistUser, user]);

    return (
        <AuthContext.Provider value={{ user, login, logout, setUser: persistUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within an AuthProvider");
    return context;
};
