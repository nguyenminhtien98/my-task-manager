"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import { initializeSocket, disconnectSocket } from "@/lib/socket";
import { useAuth } from "./AuthContext";
import { tokenManager } from "@/lib/axios";

interface SocketContextValue {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextValue>({
    socket: null,
    isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const { user, isAuthHydrated } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!isAuthHydrated) return;

        if (!user) {
            disconnectSocket();
            setSocket(null);
            setIsConnected(false);
            return;
        }

        const token = tokenManager.getAccessToken();
        if (!token) {
            return;
        }

        const socketInstance = initializeSocket(token);
        setSocket(socketInstance);

        const handleConnect = () => {
            setIsConnected(true);
        };

        const handleDisconnect = () => {
            setIsConnected(false);
        };

        socketInstance.on("connect", handleConnect);
        socketInstance.on("disconnect", handleDisconnect);

        if (socketInstance.connected) {
            setIsConnected(true);
        }

        return () => {
            socketInstance.off("connect", handleConnect);
            socketInstance.off("disconnect", handleDisconnect);
        };
    }, [user, isAuthHydrated]);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};
