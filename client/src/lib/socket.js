import { io } from "socket.io-client";

// Wenn in .env eine URL gesetzt ist (z. B. für localhost), wird diese benutzt.
// In Produktion (Render) lassen wir die URL leer, dann nimmt socket.io automatisch die aktuelle Origin.
const envUrl = import.meta.env.VITE_SOCKET_URL;
const URL = envUrl && envUrl.trim() !== "" ? envUrl : undefined;

export const socket = io(URL, {
  // keine erzwungenen Transports, socket.io wählt selbst (Polling + WebSocket)
  autoConnect: true
});
