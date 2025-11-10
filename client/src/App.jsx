import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import TopBar from "./components/TopBar.jsx";

export default function App(){
  useLocation();
  return (
    <>
      <TopBar />
      <div className="container">
        <Outlet />
        <div style={{height:24}} />
      </div>
    </>
  );
}
