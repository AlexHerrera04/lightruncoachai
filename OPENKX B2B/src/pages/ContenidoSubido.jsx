import React from "react";
import "../styles/contenidoSubido.css";
import { useNavigate } from "react-router-dom";

export default function ContenidoSubido() {
  const navigate = useNavigate();

  return (
    <div className="contenido-page">
      <div className="contenido-header">
        <button className="contenido-volver" onClick={() => navigate(-1)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15,18 9,12 15,6"/>
          </svg>
        </button>
        <h1 className="contenido-title">Contenido compartido</h1>
      </div>

      <div className="contenido-empty">
        <span className="contenido-empty-rocket">🚀</span>
        <p className="contenido-empty-title">¡Comparte tu primer contenido!</p>
        <p className="contenido-empty-sub">Gana puntos extra y aumenta tu relevancia en la empresa. Cada contenido que compartas te acerca a ser referente en tu área.</p>
        <button className="contenido-cta" onClick={() => navigate('/crear')}>
          Sube tu primer contenido ahora
        </button>
      </div>
    </div>
  );
}
