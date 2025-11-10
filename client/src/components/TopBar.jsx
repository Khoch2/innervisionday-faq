import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function TopBar() {
  const loc = useLocation();
  const navigate = useNavigate();
  const isHome = loc.pathname === "/";

  return (
    <header
      style={{
        width: "100%",
        background: "transparent",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 20,
        paddingBottom: isHome ? 30 : 10,
      }}
    >
      <img
        src="/logo.svg"
        alt="Logo"
        style={{
          width: 120,
          height: 120,
          objectFit: "contain",
          marginBottom: isHome ? 0 : 8,
        }}
      />
      {!isHome && (
        <button
          onClick={() => navigate("/")}
          style={{
            background: "var(--mint)",
            color: "#0A0F0E",
            border: "none",
            borderRadius: "999px",
            padding: "8px 24px",
            fontWeight: 600,
            fontSize: 15,
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(122,212,176,.35)",
          }}
        >
          Zurück zur Übersicht
        </button>
      )}
    </header>
  );
}
