import React, { useState } from "react";
import "../styles/comentarios.css";

export default function Comentarios({ onClose }) {
  const [texto, setTexto] = useState("");

  return (
    <div className="comentarios-overlay" onClick={onClose}>
      <div
        className="comentarios-card"
        onClick={(e) => e.stopPropagation()} // evita cerrar al clicar dentro
      >

        <div className="comentarios-handle"></div>

        <div className="comentarios-header">
          <h3>Comentarios</h3>
          <button className="cerrar-x" onClick={onClose}>×</button>
        </div>

        <textarea
          placeholder="Escribe tu comentario..."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />

        <button className="enviar">Enviar comentario</button>
      </div>
    </div>
  );
}
