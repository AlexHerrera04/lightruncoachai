import React from "react";
import "../styles/solicitaracceso.css";
import { useNavigate } from "react-router-dom";

export default function SolicitarAcceso() {
  const navigate = useNavigate();

  return (
    <div className="acceso-container">

      <div className="acceso-card">

        <h1 className="acceso-title">Has llegado al límite</h1>

        <p className="acceso-subtitle">
          En la versión gratuita puedes ver hasta <strong>4 contenidos diarios</strong>.
        </p>

        <p className="acceso-text">
          Solicita acceso a la versión full para
          ver todos los contenidos y disfrutar de funciones exclusivas.
        </p>

        <button
          className="acceso-btn"
          onClick={() => navigate("/perfil")}
        >
          Solicitar acceso ahora
        </button>

        <button
          className="acceso-volver"
          onClick={() => navigate("/explorar")}
        >
          Volver
        </button>

      </div>
    </div>
  );
}

