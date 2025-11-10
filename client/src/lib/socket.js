import { io } from "socket.io-client";

// ⚠️ Passe hier deine IP an – die gleiche, die du im Browser aufrufst
const URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5500";

export const socket = io(URL, {
  transports: ["websocket"],
});
