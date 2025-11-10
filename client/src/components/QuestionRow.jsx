import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaCheck, FaTrash } from "react-icons/fa";

export default function QuestionRow({ q, onApprove, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const longPressTimer = useRef(null);
  const menuRef = useRef(null);

  // Außenklick schließt Menü
  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
    };
  }, []);

  // Long-Press nur für Touch
  const startLongPressTouch = () => {
    clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => setMenuOpen(true), 500);
  };
  const cancelLongPressTouch = () => {
    clearTimeout(longPressTimer.current);
  };

  // Rechtsklick (Desktop)
  const onContextMenu = (e) => {
    e.preventDefault();
    setMenuOpen(true);
  };

  return (
    <motion.div
      key={q.id}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2 }}
      style={{ position: "relative" }}
      onContextMenu={onContextMenu}
      onTouchStart={startLongPressTouch}
      onTouchEnd={cancelLongPressTouch}
      onTouchCancel={cancelLongPressTouch}
    >
      <div
        className="row"
        style={{
          padding: 16,
          borderLeft: q.approved ? "4px solid var(--mint)" : "4px solid transparent",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>
            {new Date(q.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>

          {/* Check-Button immer sichtbar, großer Touch-Zielbereich */}
          <button
            className={`check ${q.approved ? "active" : ""}`}
            onClick={() => onApprove(q)}
            aria-label={q.approved ? "Auswahl entfernen" : "Auswählen"}
            style={{ width: 36, height: 36, fontSize: 14 }}
          >
            <FaCheck />
          </button>
        </div>

        <div style={{ marginTop: 8, lineHeight: 1.5, whiteSpace: "pre-wrap", fontSize: 15 }}>
          {q.text}
        </div>
      </div>

      {/* Kontrastierender Fokusring, wenn Menü offen */}
      {menuOpen && (
        <div
          style={{
            position: "absolute", inset: 0, borderRadius: 14, pointerEvents: "none",
            boxShadow: "0 0 0 2px rgba(122,212,176,.35) inset"
          }}
        />
      )}

      {/* Kontextmenü + durchgängiger Backdrop */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop blockt Interaktionen dahinter, click schließt */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              onClick={() => setMenuOpen(false)}
              style={{
                position: "fixed", inset: 0, zIndex: 90, background: "transparent"
              }}
            />
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12 }}
              style={{
                position: "absolute",
                right: 12,
                bottom: -64,
                zIndex: 100,
                background: "var(--panel)",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,.1)",
                boxShadow: "0 10px 28px rgba(0,0,0,.45)",
                padding: 8,
                minWidth: 180,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => { setMenuOpen(false); onDelete(q.id); }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "transparent",
                  border: "none",
                  color: "#ff6b6b",
                  fontSize: 16,
                  fontWeight: 700,
                  padding: "10px 12px",
                  borderRadius: 10,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <FaTrash size={14} />
                Frage löschen
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
