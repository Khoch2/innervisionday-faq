import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { customAlphabet } from "nanoid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Render PORT wird zuverlässig erzwungen
const PORT = Number(process.env.PORT) || 5500;

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "DELETE"]
  }
});

// Unverzüglich PORT melden
console.log("Starting server on port:", PORT);

app.use(cors());
app.use(express.json({ limit: "200kb" }));

const SPEAKERS_PATH = path.join(__dirname, "speakers.json");
const QUESTIONS_PATH = path.join(__dirname, "data", "questions.json");

const nanoid = customAlphabet("abcdefghijkmnopqrstuvwxyz0123456789", 8);

// Helpers
async function readJSON(p) {
  try {
    const buf = await fs.readFile(p, "utf-8");
    return JSON.parse(buf || "[]");
  } catch {
    return [];
  }
}
async function writeJSON(p, data) {
  await fs.writeFile(p, JSON.stringify(data, null, 2), "utf-8");
}
function normalizeQuestion(q) {
  return {
    id: q.id,
    speaker: q.speaker,
    text: q.text,
    approved: !!q.approved,
    votes: Number.isFinite(q.votes) ? q.votes : 0,
    createdAt: q.createdAt || Date.now()
  };
}

// API
app.get("/api/speakers", async (_req, res) => {
  const speakers = await readJSON(SPEAKERS_PATH);
  res.json(speakers);
});

app.get("/api/questions", async (req, res) => {
  const speaker = req.query.speaker;
  if (!speaker) return res.status(400).json({ error: "speaker benötigt" });

  const all = (await readJSON(QUESTIONS_PATH)).map(normalizeQuestion);
  const list = all
    .filter(q => q.speaker === speaker)
    .sort((a, b) => (b.votes || 0) - (a.votes || 0) || b.createdAt - a.createdAt);

  res.json(list);
});

app.post("/api/questions", async (req, res) => {
  const { speaker, text } = req.body || {};
  if (!speaker || !text) return res.status(400).json({ error: "speaker und text benötigt" });

  const trimmed = String(text).slice(0, 500).trim();
  if (!trimmed) return res.status(400).json({ error: "Leerer Text" });

  const all = (await readJSON(QUESTIONS_PATH)).map(normalizeQuestion);
  const q = {
    id: `q_${nanoid()}`,
    speaker,
    text: trimmed,
    approved: false,
    votes: 0,
    createdAt: Date.now()
  };

  all.push(q);
  await writeJSON(QUESTIONS_PATH, all);

  io.to("mod").emit("question:new", q);
  io.to(`speaker:${speaker}`).emit("question:new", q);
  io.to(`selected:${speaker}`).emit("question:new", q);

  res.json({ ok: true, question: q });
});

// Approve
app.post("/api/mod/approve", async (req, res) => {
  const { id, approved } = req.body || {};
  if (!id || typeof approved !== "boolean")
    return res.status(400).json({ error: "id und approved benötigt" });

  const all = (await readJSON(QUESTIONS_PATH)).map(normalizeQuestion);
  const idx = all.findIndex(q => q.id === id);
  if (idx === -1) return res.status(404).json({ error: "Nicht gefunden" });

  all[idx].approved = approved;
  await writeJSON(QUESTIONS_PATH, all);

  const updated = all[idx];
  io.to("mod").emit("question:update", updated);
  io.to(`speaker:${updated.speaker}`).emit("question:update", updated);
  io.to(`selected:${updated.speaker}`).emit("question:update", updated);

  res.json({ ok: true, question: updated });
});

// Vote
app.post("/api/questions/:id/vote", async (req, res) => {
  const { id } = req.params;

  const all = (await readJSON(QUESTIONS_PATH)).map(normalizeQuestion);
  const idx = all.findIndex(q => q.id === id);
  if (idx === -1) return res.status(404).json({ error: "Nicht gefunden" });

  all[idx].votes = (all[idx].votes || 0) + 1;
  await writeJSON(QUESTIONS_PATH, all);

  const updated = all[idx];
  io.to("mod").emit("question:update", updated);
  io.to(`speaker:${updated.speaker}`).emit("question:update", updated);
  io.to(`selected:${updated.speaker}`).emit("question:update", updated);

  res.json({ ok: true, question: updated });
});

// Unvote
app.post("/api/questions/:id/unvote", async (req, res) => {
  const { id } = req.params;

  const all = (await readJSON(QUESTIONS_PATH)).map(normalizeQuestion);
  const idx = all.findIndex(q => q.id === id);
  if (idx === -1) return res.status(404).json({ error: "Nicht gefunden" });

  all[idx].votes = Math.max((all[idx].votes || 0) - 1, 0);
  await writeJSON(QUESTIONS_PATH, all);

  const updated = all[idx];
  io.to("mod").emit("question:update", updated);
  io.to(`speaker:${updated.speaker}`).emit("question:update", updated);
  io.to(`selected:${updated.speaker}`).emit("question:update", updated);

  res.json({ ok: true, question: updated });
});

// Delete
app.delete("/api/questions/:id", async (req, res) => {
  const { id } = req.params;

  const all = (await readJSON(QUESTIONS_PATH)).map(normalizeQuestion);
  const idx = all.findIndex(q => q.id === id);
  if (idx === -1) return res.status(404).json({ error: "Nicht gefunden" });

  const [deleted] = all.splice(idx, 1);
  await writeJSON(QUESTIONS_PATH, all);

  io.to("mod").emit("question:deleted", { id: deleted.id });
  io.to(`speaker:${deleted.speaker}`).emit("question:deleted", { id: deleted.id });
  io.to(`selected:${deleted.speaker}`).emit("question:deleted", { id: deleted.id });

  res.json({ ok: true });
});

// Socket.io
io.on("connection", socket => {
  socket.on("join", ({ role, speaker }) => {
    socket.data.role = role;
    socket.data.speaker = speaker;
    if (role === "mod") socket.join("mod");
    else if (role === "guest" && speaker) socket.join(`speaker:${speaker}`);
    else if (role === "selected" && speaker) socket.join(`selected:${speaker}`);
  });

  socket.on("disconnect", () => socket.leaveAll());
});

// STATIC FILE SERVING

// sichere Pfade
const clientDist = path.join(process.cwd(), "client", "dist");

console.log("Looking for client build in:", clientDist);

import fsSync from "fs";

if (fsSync.existsSync(clientDist)) {
  console.log("Serving client from:", clientDist);
  app.use(express.static(clientDist));
  app.get("*", (_req, res) =>
    res.sendFile(path.join(clientDist, "index.html"))
  );
} else {
  console.log("⚠️ client/dist NICHT gefunden!");
}

// START SERVER
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Server läuft öffentlich auf Port ${PORT}`);
});
