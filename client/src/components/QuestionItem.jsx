import React, { useState } from "react";
import { motion } from "framer-motion";

export default function QuestionItem({ q, onToggle }){
  const [busy, setBusy] = useState(false);

  const handle = async () => {
    if (busy) return;
    setBusy(true);
    try { await onToggle(); }
    finally { setBusy(false); }
  };

  return (
    <motion.div
      className="row"
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: .15 }}
    >
      <div className="row-top">
        <div style={{fontSize:12, color:"var(--muted)"}}>
          {new Date(q.createdAt).toLocaleTimeString([], {hour: "2-digit", minute:"2-digit"})}
        </div>
        <button
          className={`check ${q.approved ? "active" : ""}`}
          onClick={handle}
          disabled={busy}
          aria-label={q.approved ? "Auswahl entfernen" : "Auswählen"}
          title={q.approved ? "Auswahl entfernen" : "Auswählen"}
        >
          ✓
        </button>
      </div>
      <div style={{marginTop:8, lineHeight:1.5, whiteSpace:"pre-wrap"}}>{q.text}</div>
    </motion.div>
  );
}
