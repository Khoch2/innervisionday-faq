import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function SpeakerCard({ s }) {
  const imgSrc = `/speakers/${s.slug}.png`;
  const firstName = s.name.split(" ")[0];

  return (
    <motion.div whileTap={{ scale: 0.96 }} whileHover={{ y: -2 }}>
      <Link to={`/ask/${s.slug}`} className="card">
        <img
          className="speaker-img"
          src={imgSrc}
          alt={s.name}
          onError={(e)=> e.currentTarget.style.visibility="hidden"}
          loading="lazy"
        />
        <div className="speaker-meta">
          <div className="name" style={{ fontSize:16, fontWeight:700 }}>
            {s.name}
          </div>
          <div style={{ fontSize:13, opacity:.7 }}>
            Welche Frage möchtest du {firstName} stellen?
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
