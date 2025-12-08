import { io, Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

let socket: Socket | null = null;

export const initializeSocket = (token: string): Socket => {
  if (socket?.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10, // Increased from 5 to 10
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  socket.on("connect", () => {
    console.log("[Socket] Connected:", socket?.id);
    console.log("[Socket] Auth token sent:", token ? "Yes" : "No");
  });

  socket.on("disconnect", (reason) => {
    if (reason === "io server disconnect") {
      socket?.connect();
    }
  });

  socket.on("reconnect", (attemptNumber) => {
    console.log(`[Socket] Reconnected after ${attemptNumber} attempts`);
  });

  socket.on("reconnect_attempt", (attemptNumber) => {
    console.log(`[Socket] Reconnection attempt #${attemptNumber}`);
  });

  socket.on("reconnect_failed", () => {
    console.error("[Socket] Reconnection failed after all attempts");
  });

  socket.on("connect_error", (error) => {
    console.error("[Socket] Connection error:", error.message);
  });

  socket.onAny((eventName, ...args) => {
    console.log(`[Socket] ⚡️ Event received: ${eventName}`, args);
  });

  return socket;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket?.connected) {
    socket.disconnect();
    socket = null;
  }
};

export const joinRoom = (room: string) => {
  if (socket?.connected) {
    socket.emit("join", room);
  }
};

export const leaveRoom = (room: string) => {
  if (socket?.connected) {
    socket.emit("leave", room);
  }
};
