import React, { useEffect, useState } from "react";
import { getSpeakers, getQuestions } from "../api.js";
import { socket } from "../lib/socket.js";
import { AnimatePresence, motion } from "framer-motion";

export default function ModSelected() {
  const [speakers, setSpeakers] = useState([]);
  const [active, setActive] = useState("");
  const [items, setItems] = useState([]);

  useEffect(() => {
    getSpeakers().then(sp => {
      setSpeakers(sp);
      setActive(sp[0]?.slug || "");
    });
  }, []);

  useEffect(() => {
    if (!active) return;
    getQuestions(active).then(qs => {
      const selected = qs.filter(q => q.approved);
      setItems(selected.sort((a, b) => b.createdAt - a.createdAt));
    });
  }, [active]);

  useEffect(() => {
    if (!active) return;
    socket.emit("join", { role: "selected", speaker: active });
  }, [active]);

  useEffect(() => {
    const onUpd = (q) => {
      if (q.speaker !== active) return;
      setItems(prev => {
        const exists = prev.some(x => x.id === q.id);
        if (q.approved && !exists) return [q, ...prev];
        if (!q.approved && exists) return prev.filter(x => x.id !== q.id);
        return prev.map(x => (x.id === q.id ? q : x));
      });
    };
    const onDel = ({ id }) => setItems(prev => prev.filter(x => x.id !== id));

    socket.on("question:update", onUpd);
    socket.on("question:deleted", onDel);
    return () => {
      socket.off("question:update", onUpd);
      socket.off("question:deleted", onDel);
    };
  }, [active]);

  if (!speakers.length)
    return <div style={{ padding: 30, color: "var(--muted)" }}>Lädt…</div>;

  return (
    <div className="container">
      <h1>Ausgewählte Fragen</h1>
      <div className="tabs">
        {speakers.map(s => (
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
          {items.map(q => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="row"
              style={{ borderLeft: "4px solid var(--mint)" }}
            >
              <div style={{ fontSize: 13, color: "var(--muted)" }}>
                {new Date(q.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
              <div style={{ marginTop: 6, lineHeight: 1.5 }}>{q.text}</div>
            </motion.div>
          ))}
        </AnimatePresence>

        {items.length === 0 && (
          <div className="row" style={{ opacity: 0.6, textAlign: "center", color: "var(--muted)" }}>
            Noch keine markierten Fragen
          </div>
        )}
      </div>
    </div>
  );
}
