import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  getSpeakers,
  postQuestion,
  getQuestions,
  voteQuestion,
  unvoteQuestion,
} from "../api.js";
import { socket } from "../lib/socket.js";
import { motion, AnimatePresence } from "framer-motion";
import { FaFire } from "react-icons/fa";

export default function Ask() {
  const { slug } = useParams();
  const [speaker, setSpeaker] = useState(null);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [questions, setQuestions] = useState([]);

  // Session-Votes
  const votedIds = useRef(new Set(JSON.parse(sessionStorage.getItem("votedQuestions") || "[]")));
  const saveVoted = () =>
    sessionStorage.setItem("votedQuestions", JSON.stringify([...votedIds.current]));

  // Speaker und Fragen laden
  useEffect(() => {
    (async () => {
      const sp = await getSpeakers();
      setSpeaker(sp.find((x) => x.slug === slug));
    })();
    socket.emit("join", { role: "guest", speaker: slug });
    loadQuestions();
  }, [slug]);

  const loadQuestions = async () => {
    const list = await getQuestions(slug);
    if (Array.isArray(list)) {
      setQuestions(list.sort((a, b) => (b.votes || 0) - (a.votes || 0)));
    }
  };

  // Socket Live-Updates
  useEffect(() => {
    const onNew = (q) => {
      if (q.speaker !== slug) return;
      setQuestions((prev) =>
        [q, ...prev].sort((a, b) => (b.votes || 0) - (a.votes || 0))
      );
    };
    const onUpd = (q) => {
      if (q.speaker !== slug) return;
      setQuestions((prev) =>
        prev
          .map((x) => (x.id === q.id ? { ...x, ...q } : x))
          .sort((a, b) => (b.votes || 0) - (a.votes || 0))
      );
    };
    const onDel = ({ id }) =>
      setQuestions((prev) => prev.filter((x) => x.id !== id));

    socket.on("question:new", onNew);
    socket.on("question:update", onUpd);
    socket.on("question:voted", onUpd);
    socket.on("question:deleted", onDel);

    return () => {
      socket.off("question:new", onNew);
      socket.off("question:update", onUpd);
      socket.off("question:voted", onUpd);
      socket.off("question:deleted", onDel);
    };
  }, [slug]);

  // Frage absenden
  const submit = async () => {
    const t = text.trim().slice(0, 500);
    if (!t) return;
    const res = await postQuestion({ speaker: slug, text: t });
    if (res?.ok) {
      setText("");
      setSent(true);
      setTimeout(() => setSent(false), 1800);
    }
  };

  // Voting korrekt mit Serverabgleich
  const toggleVote = async (q) => {
    const hasVoted = votedIds.current.has(q.id);
    try {
      if (hasVoted) {
        votedIds.current.delete(q.id);
        saveVoted();
        await unvoteQuestion(q.id);
      } else {
        votedIds.current.add(q.id);
        saveVoted();
        await voteQuestion(q.id);
      }
    } catch (e) {
      console.error("Vote-Fehler:", e);
    }
  };

  if (!speaker) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      style={{ marginTop: 28 }}
    >
      <h1>Frage an {speaker.name}</h1>

      {/* Eingabefeld */}
      <motion.div
        className="input-wrap"
        animate={{
          boxShadow: [
            "0 0 8px rgba(122,212,176,0.25)",
            "0 0 20px rgba(122,212,176,0.45)",
            "0 0 8px rgba(122,212,176,0.25)",
          ],
        }}
        transition={{ duration: 3, repeat: Infinity }}
        style={{ borderRadius: 18, padding: 12, marginBottom: 20 }}
      >
        <textarea
          placeholder="Schreib deine Frage hier rein…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text)",
            fontSize: 16,
            lineHeight: 1.5,
            width: "100%",
            outline: "none",
            resize: "vertical",
            boxShadow: "none",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 8,
            fontSize: 13,
            color: "var(--muted)",
          }}
        >
          {text.length}/500 Zeichen
        </div>
      </motion.div>

      {/* Senden-Button */}
      <motion.button
        className="button"
        disabled={!text.trim()}
        whileTap={{ scale: 0.96 }}
        onClick={submit}
        style={{
          width: "100%",
          height: 60,
          fontWeight: 700,
          fontSize: 17,
          borderRadius: 14,
          background: "var(--mint)",
          color: "#0A0F0E",
          boxShadow: "0 8px 26px rgba(122,212,176,.35)",
          marginBottom: 20,
        }}
      >
        Diese Frage absenden
      </motion.button>

      {/* Erfolgsnachricht */}
      <AnimatePresence>
        {sent && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "fixed",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2000,
            }}
          >
            <div
              style={{
                background: "var(--mint)",
                color: "#0A0F0E",
                padding: "26px 36px",
                borderRadius: 20,
                fontSize: 18,
                fontWeight: 700,
                textAlign: "center",
                boxShadow: "0 6px 26px rgba(122,212,176,.4)",
                maxWidth: "85%",
              }}
            >
              Danke, deine Frage wurde eingereicht
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fragenliste */}
      <h2 style={{ marginTop: 16 }}>Bereits gestellte Fragen</h2>

      <div className="scroll list">
        <AnimatePresence>
          {questions.map((q) => {
            const isVoted = votedIds.current.has(q.id);
            return (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="row"
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 15,
                      lineHeight: 1.5,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {q.text}
                  </div>

                  <button
                    onClick={() => toggleVote(q)}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                    }}
                  >
                    <FaFire
                      size={22}
                      color={isVoted ? "#ff4d4d" : "var(--muted)"}
                    />
                  </button>
                </div>

                <div style={{ fontSize: 13, marginTop: 6, color: "var(--muted)" }}>
                  {(q.votes || 0)} Personen wollen, dass diese Frage von{" "}
                  {speaker.name} beantwortet wird
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
