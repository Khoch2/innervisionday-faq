import React, { useEffect, useState, useCallback } from "react";
import { getSpeakers, getQuestions, approveQuestion, deleteQuestion } from "../api.js";
import { socket } from "../lib/socket.js";
import { AnimatePresence, motion } from "framer-motion";
import { FaCheck, FaTrash, FaFire } from "react-icons/fa";

export default function Mod() {
  const [speakers, setSpeakers] = useState([]);
  const [active, setActive] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const sp = await getSpeakers();
      setSpeakers(sp);
      setActive(sp[0]?.slug || "");
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!active) return;
    (async () => {
      const data = await getQuestions(active);
      if (Array.isArray(data)) {
        setItems(data.sort((a, b) => (b.votes || 0) - (a.votes || 0) || b.createdAt - a.createdAt));
      }
    })();
  }, [active]);

  useEffect(() => {
    socket.emit("join", { role: "mod" });

    const onNew = (q) => {
      if (q.speaker !== active) return;
      setItems(p => {
        if (p.some(x => x.id === q.id)) return p;
        return [q, ...p].sort((a, b) => (b.votes || 0) - (a.votes || 0) || b.createdAt - a.createdAt);
      });
    };

    const onUpd = (q) => {
      if (q.speaker !== active) return;
      setItems(p =>
        p.map(x => (x.id === q.id ? q : x))
         .sort((a, b) => (b.votes || 0) - (a.votes || 0) || b.createdAt - a.createdAt)
      );
    };

    const onDel = ({ id }) => setItems(p => p.filter(x => x.id !== id));

    socket.on("question:new", onNew);
    socket.on("question:update", onUpd);
    socket.on("question:deleted", onDel);

    return () => {
      socket.off("question:new", onNew);
      socket.off("question:update", onUpd);
      socket.off("question:deleted", onDel);
    };
  }, [active]);

  const toggleApprove = useCallback(async (q) => {
    setItems(p => p.map(x => (x.id === q.id ? { ...x, approved: !x.approved } : x)));
    try {
      await approveQuestion({ id: q.id, approved: !q.approved });
    } catch {
      setItems(p => p.map(x => (x.id === q.id ? q : x)));
    }
  }, []);

  const deleteItem = useCallback(async (id) => {
    const prev = items;
    setItems(p => p.filter(x => x.id !== id));
    try {
      const res = await deleteQuestion(id);
      if (!res?.ok) setItems(prev);
    } catch {
      setItems(prev);
    }
  }, [items]);

  if (loading)
    return <div style={{ color: "var(--muted)", textAlign: "center", padding: 40 }}>Lädt…</div>;

  return (
    <div className="container">
      <h1>Moderator</h1>

      <div className="tabs">
        {speakers.map((s) => (
          <button
            key={s.slug}
            className={`tab ${active === s.slug ? "active" : ""}`}
            onClick={() => setActive(s.slug)}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="scroll list">
        <AnimatePresence>
          {items.map((q) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="row"
              style={{ borderLeft: q.approved ? "4px solid var(--mint)" : "4px solid transparent" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>
                  {new Date(q.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "var(--mint)" }}>
                  <FaFire /> {q.votes || 0}
                </div>
              </div>

              <div style={{ lineHeight: 1.5, marginBottom: 12, fontSize: 15, whiteSpace: "pre-wrap" }}>
                {q.text}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => toggleApprove(q)}
                  className={`check ${q.approved ? "active" : ""}`}
                  style={{ width: 36, height: 36, fontSize: 15, borderRadius: "50%", cursor: "pointer" }}
                  title={q.approved ? "Auswahl entfernen" : "Freigeben"}
                >
                  <FaCheck />
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => deleteItem(q.id)}
                  style={{ width: 36, height: 36, fontSize: 15, borderRadius: "50%", background: "transparent", border: "2px solid #ff6b6b", color: "#ff6b6b", cursor: "pointer" }}
                  title="Frage löschen"
                >
                  <FaTrash />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {items.length === 0 && (
          <div className="row" style={{ opacity: 0.6, textAlign: "center", fontSize: 14, color: "var(--muted)" }}>
            Noch keine Fragen
          </div>
        )}
      </div>
    </div>
  );
}
