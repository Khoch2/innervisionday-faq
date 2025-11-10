import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import Home from "./pages/Home.jsx";
import Ask from "./pages/Ask.jsx";
import Mod from "./pages/Mod.jsx";
import ModSelected from "./pages/ModSelected.jsx";
import "./styles.css";

const MOD_PATH = import.meta.env.VITE_MOD_PATH || "m0d-ivd-2025";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Routes>
      <Route element={<App />}>
        <Route path="/" element={<Home />} />
        <Route path="/ask/:slug" element={<Ask />} />
        <Route path={`/${MOD_PATH}`} element={<Mod />} />
        <Route path={`/${MOD_PATH}/selected`} element={<ModSelected />} />
      </Route>
    </Routes>
  </BrowserRouter>
);
