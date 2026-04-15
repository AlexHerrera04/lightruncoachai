import React, { useState } from "react";
import "../styles/crear.css";
import BottomBar from "../components/BottomBar";
import { useNavigate } from "react-router-dom";

export default function Crear() {
  const navigate = useNavigate();

  // Guarda el nombre del archivo seleccionado
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);

  return (
    <div className="crear-page">

      {/* TÍTULO */}
      <h1 className="crear-title">Crear Contenido</h1>
      <p className="crear-subtitle">Comparte tu conocimiento</p>

      {/* PROGRESO DE PASOS */}
      <div className="crear-steps">
        <span className="step active">1</span>
        <span className="step">2</span>
        <span className="step">3</span>
      </div>

      {/* ZONA DE UPLOAD */}
      <div className="upload-box">
        <p className="upload-title">Sube tu contenido</p>
        <p className="upload-note">MP4, MOV, WebM • Máximo 45 segundos</p>

        <div className="upload-area">

          {/* ICONO ELIMINADO (emoji lleig) */}

          <p>Arrastra tu video aquí o selecciona un archivo</p>

          {/* INPUT OCULTO */}
          <input
            id="videoInput"
            type="file"
            accept="video/mp4,video/mov,video/webm"
            onChange={(e) => {
              if (e.target.files.length > 0) {
                setArchivoSeleccionado(e.target.files[0].name);
              }
            }}
          />

          {/* BOTÓN CAMBIANTE */}
          {!archivoSeleccionado ? (
            <label htmlFor="videoInput" className="upload-btn">
              Seleccionar archivo
            </label>
          ) : (
            <label htmlFor="videoInput" className="upload-btn cambiar-btn">
              Cambiar archivo
            </label>
          )}

          {/* MOSTRAR NOMBRE DEL ARCHIVO */}
          {archivoSeleccionado && (
            <p className="archivo-seleccionado">
              Has seleccionado: <strong>{archivoSeleccionado}</strong>
            </p>
          )}
        </div>

        {/* BOTÓN SIGUIENTE */}
        <button
          className="siguiente-btn"
          disabled={!archivoSeleccionado}
          style={!archivoSeleccionado ? {opacity: 0.45, cursor: "not-allowed"} : {}}
          onClick={() => navigate("/crear/paso2")}
        >
          Siguiente
        </button>
      </div>

      <BottomBar active="crear" />
    </div>
  );
}

