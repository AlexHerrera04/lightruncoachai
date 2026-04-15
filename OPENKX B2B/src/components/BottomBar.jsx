import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/bottombar.css";

export default function BottomBar({ active }) {
  const navigate = useNavigate();

  return (
    <div className="bottom-bar">

      <button
        onClick={() => navigate("/inicio")}
        className={`bottom-btn ${active === "inicio" ? "active" : ""}`}
      >
        <span className="icono-inicio"></span>
        <span>Inicio</span>
      </button>

      <button
        onClick={() => navigate("/explorar")}
        className={`bottom-btn ${active === "explorar" ? "active" : ""}`}
      >
        <span className="icono-explorar"></span>
        <span>Explorar</span>
      </button>

      {/* BOTÓN CENTRAL ELEVADO (SIN TEXTO) */}
      <button
        onClick={() => navigate("/crear")}
        className={`bottom-btn boton-central ${active === "crear" ? "active" : ""}`}
      >
        <span className="icono-crear"></span>
      </button>

      <button
        onClick={() => navigate("/desafio")}
        className={`bottom-btn ${active === "desafio" ? "active" : ""}`}
      >
        <span className="icono-desafio"></span>
        <span>Desafío</span>
      </button>

      <button
        onClick={() => navigate("/miadn")}
        className={`bottom-btn ${active === "miadn" ? "active" : ""}`}
      >
        <span className="icono-miadn"></span>
        <span>Mi ADN</span>
      </button>

    </div>
  );
}
