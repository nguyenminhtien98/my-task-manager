"use client";
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AuthContextType, User } from '../types/taskTypes';
import { account, database } from '../appwrite';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('userProfile');
    return stored ? JSON.parse(stored) : null;
  });


  const login = async (id: string, name: string) => {
    try {
      const profile = await database.getDocument(
        String(process.env.NEXT_PUBLIC_DATABASE_ID),
        String(process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE),
        id
      );
      const u: User = { id, name, role: profile.role as User['role'] };
      setUser(u);
      localStorage.setItem('userProfile', JSON.stringify(u));
    } catch (err) {
      console.error('Login error fetching profile:', err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await account.deleteSession('current');
    } catch {
      // ignore
    }
    setUser(null);
    localStorage.removeItem('userProfile');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
