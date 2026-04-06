import { io, type Socket } from "socket.io-client";

const FALLBACK_API_BASE_URL = "https://hotel-backend-nxcm.onrender.com/api";

const resolveSocketBaseUrl = () => {
  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL || FALLBACK_API_BASE_URL;

  return apiBaseUrl.replace(/\/api\/?$/, "");
};

let socket: Socket | null = null;

export const connectSocket = (token: string) => {
  if (!token) return null;

  const baseUrl = resolveSocketBaseUrl();

  if (!socket) {
    socket = io(baseUrl, {
      autoConnect: false,
      withCredentials: true,
      auth: { token },
    });
  } else {
    socket.auth = { token };
  }

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (!socket) return;

  socket.disconnect();
  socket = null;
};
