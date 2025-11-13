import { io } from "socket.io-client";

// sichere URL automatisch ableiten
const URL =
  import.meta.env.VITE_SOCKET_URL ||
  window.location.origin.replace(/^http/, "wss");

export const socket = io(URL, {
  transports: ["websocket"]
});
