"use client";
import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useEffect,
} from "react";
import { useRouter } from "next/navigation";
import * as authService from "../services/authService";
import * as profileService from "../services/profileService";
import { Profile } from "../types/Types";

export interface User {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  createdAt?: string;
  role?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  isAuthHydrated: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const router = useRouter();
  const [user, setUserState] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("userProfile");
    if (!stored) return null;
    try {
      const parsed = JSON.parse(stored) as User;
      return parsed;
    } catch {
      return null;
    }
  });
  const [isAuthHydrated, setIsAuthHydrated] = useState(false);

  const profileToUser = (profile: Profile): User => ({
    id: profile._id,
    name: profile.name,
    email: profile.email,
    avatarUrl: profile.avatarUrl,
    createdAt: profile.createdAt,
    role: profile.role || "user",
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

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const { profile } = await authService.login({ email, password });
        const user = profileToUser(profile);
        persistUser(user);
      } catch (error) {
        console.error("Login error:", error);
        throw error;
      }
    },
    [persistUser]
  );

  const loginWithGoogle = useCallback(
    async (credential: string) => {
      try {
        const response = await authService.googleLogin(credential);

        if (!response || !response.profile) {
          throw new Error("Invalid response from server");
        }

        const user = profileToUser(response.profile);
        persistUser(user);
      } catch (error) {
        console.error("Google login error:", error);
        throw error;
      }
    },
    [persistUser]
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      persistUser(null);
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem("activeProjectId");
      }
    }
  }, [persistUser]);

  useEffect(() => {
    if (typeof window === "undefined") {
      setIsAuthHydrated(true);
      return;
    }

    if (window.location.pathname === '/server-error') {
      console.log('[AuthContext] Skipping hydration on /server-error page');
      setIsAuthHydrated(true);
      return;
    }

    let cancelled = false;
    const hydrateSession = async () => {
      try {
        console.log('[AuthContext] Starting session hydration...');
        const { token: _token } = await authService.refreshToken();

        if (cancelled) return;

        const profile = await profileService.getMe();
        if (cancelled) return;

        const user = profileToUser(profile);
        persistUser(user);
        if (!cancelled) setIsAuthHydrated(true);
      } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const axiosError = error as any;
        if (axiosError.response && axiosError.response.status >= 500) {
          router.push("/server-error");
        } else {
          console.error("Session hydration failed:", error);
        }
      } finally {
        setIsAuthHydrated(true);
      }
    };

    hydrateSession();
    return () => {
      cancelled = true;
    };
  }, [persistUser, router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        loginWithGoogle,
        logout,
        setUser: persistUser,
        isAuthHydrated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
