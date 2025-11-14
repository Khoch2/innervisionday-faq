import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { customAlphabet } from "nanoid";
import mongoose from "mongoose";
import fsSync from "fs";

import Question from "./models/Question.js";  // MongoDB Modell

// ----------------------------------------------------------------------
// Backend Grundsetup
// ----------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 5500;

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "DELETE"]
  }
});

console.log("Starting server on port:", PORT);

app.use(cors());
app.use(express.json({ limit: "200kb" }));

// ----------------------------------------------------------------------
// MongoDB Verbindung
// ----------------------------------------------------------------------
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DBNAME = process.env.MONGODB_DBNAME || "innervisionday";

if (!MONGODB_URI) {
  console.error("❌ FEHLER: MONGODB_URI ist nicht gesetzt!");
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI, {
    dbName: MONGODB_DBNAME
  })
  .then(() => console.log("✔️ MongoDB verbunden"))
  .catch(err => {
    console.error("❌ MongoDB Verbindungsfehler:", err);
    process.exit(1);
  });

// ----------------------------------------------------------------------
// Dateien (Speaker-Liste bleibt in JSON)
// ----------------------------------------------------------------------
const SPEAKERS_PATH = path.join(__dirname, "speakers.json");

// NanoID für Frage-IDs
const nanoid = customAlphabet("abcdefghijkmnopqrstuvwxyz0123456789", 8);

// ----------------------------------------------------------------------
// API ROUTES
// ----------------------------------------------------------------------

// SPEAKER LIST
app.get("/api/speakers", async (_req, res) => {
  try {
    const buf = fsSync.readFileSync(SPEAKERS_PATH, "utf-8");
    return res.json(JSON.parse(buf || "[]"));
  } catch {
    return res.json([]);
  }
});

// GET QUESTIONS (nach Speaker gefiltert)
app.get("/api/questions", async (req, res) => {
  const speaker = req.query.speaker;
  if (!speaker) return res.status(400).json({ error: "speaker benötigt" });

  const questions = await Question.find({ speaker })
    .sort({ votes: -1, createdAt: -1 })
    .lean();

  res.json(questions);
});

// FRAGE ERSTELLEN
app.post("/api/questions", async (req, res) => {
  const { speaker, text } = req.body || {};
  if (!speaker || !text) return res.status(400).json({ error: "speaker und text benötigt" });

  const trimmed = String(text).slice(0, 500).trim();
  if (!trimmed) return res.status(400).json({ error: "Leerer Text" });

  const q = await Question.create({
    id: `q_${nanoid()}`,
    speaker,
    text: trimmed,
    approved: false,
    votes: 0,
    createdAt: Date.now()
  });

  // Socket Broadcast
  io.to("mod").emit("question:new", q);
  io.to(`speaker:${speaker}`).emit("question:new", q);
  io.to(`selected:${speaker}`).emit("question:new", q);

  res.json({ ok: true, question: q });
});

// APPROVE
app.post("/api/mod/approve", async (req, res) => {
  const { id, approved } = req.body;
  if (!id || typeof approved !== "boolean")
    return res.status(400).json({ error: "id und approved benötigt" });

  const updated = await Question.findOneAndUpdate(
    { id },
    { approved },
    { new: true }
  ).lean();

  if (!updated) return res.status(404).json({ error: "Nicht gefunden" });

  io.to("mod").emit("question:update", updated);
  io.to(`speaker:${updated.speaker}`).emit("question:update", updated);
  io.to(`selected:${updated.speaker}`).emit("question:update", updated);

  res.json({ ok: true, question: updated });
});

// VOTE
app.post("/api/questions/:id/vote", async (req, res) => {
  const { id } = req.params;

  const updated = await Question.findOneAndUpdate(
    { id },
    { $inc: { votes: 1 } },
    { new: true }
  ).lean();

  if (!updated) return res.status(404).json({ error: "Nicht gefunden" });

  io.to("mod").emit("question:update", updated);
  io.to(`speaker:${updated.speaker}`).emit("question:update", updated);
  io.to(`selected:${updated.speaker}`).emit("question:update", updated);

  res.json({ ok: true, question: updated });
});

// UNVOTE
app.post("/api/questions/:id/unvote", async (req, res) => {
  const { id } = req.params;

  const updated = await Question.findOneAndUpdate(
    { id },
    { $inc: { votes: -1 } },
    { new: true }
  ).lean();

  if (!updated) return res.status(404).json({ error: "Nicht gefunden" });

  // Votes nicht negativ werden lassen
  if (updated.votes < 0) {
    updated.votes = 0;
    await Question.updateOne({ id }, { votes: 0 });
  }

  io.to("mod").emit("question:update", updated);
  io.to(`speaker:${updated.speaker}`).emit("question:update", updated);
  io.to(`selected:${updated.speaker}`).emit("question:update", updated);

  res.json({ ok: true, question: updated });
});

// DELETE
app.delete("/api/questions/:id", async (req, res) => {
  const { id } = req.params;

  const deleted = await Question.findOneAndDelete({ id }).lean();
  if (!deleted) return res.status(404).json({ error: "Nicht gefunden" });

  io.to("mod").emit("question:deleted", { id: deleted.id });
  io.to(`speaker:${deleted.speaker}`).emit("question:deleted", { id: deleted.id });
  io.to(`selected:${deleted.speaker}`).emit("question:deleted", { id: deleted.id });

  res.json({ ok: true });
});

// ----------------------------------------------------------------------
// SOCKET.IO
// ----------------------------------------------------------------------
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

// ----------------------------------------------------------------------
// STATIC CLIENT SERVING
// ----------------------------------------------------------------------
const clientDist = path.join(process.cwd(), "client", "dist");

console.log("Looking for client build in:", clientDist);

if (fsSync.existsSync(clientDist)) {
  console.log("Serving client from:", clientDist);
  app.use(express.static(clientDist));
  app.get("*", (_req, res) =>
    res.sendFile(path.join(clientDist, "index.html"))
  );
} else {
  console.log("⚠️ client/dist NICHT gefunden!");
}

// ----------------------------------------------------------
// KEEP ALIVE: Ping alle 14 Minuten, damit Render nicht schläft
// ----------------------------------------------------------
const SELF_URL = process.env.SELF_URL;

if (SELF_URL) {
  setInterval(() => {
    fetch(SELF_URL)
      .then(() => console.log("Keep-Alive-Ping erfolgreich"))
      .catch(err => console.log("Keep-Alive-Ping Fehler:", err.message));
  }, 14 * 60 * 1000); // alle 14 Minuten
}


// ----------------------------------------------------------------------
// START SERVER
// ----------------------------------------------------------------------
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Server läuft öffentlich auf Port ${PORT}`);
});
