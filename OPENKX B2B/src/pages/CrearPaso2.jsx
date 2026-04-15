import React, { useState } from "react";
import "../styles/crear.css";
import BottomBar from "../components/BottomBar";
import { useNavigate } from "react-router-dom";

export default function CrearPaso2() {
  const navigate = useNavigate();
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [imagen, setImagen] = useState(null);
  const [link, setLink] = useState("");

  return (
    <div className="crear-page">

      {/* TÍTULO */}
      <h1 className="crear-title">Crear Contenido</h1>
      <p className="crear-subtitle">Comparte tu conocimiento</p>

      {/* PROGRESO DE PASOS */}
      <div className="crear-steps">
        <span className="step">1</span>
        <span className="step active">2</span>
        <span className="step">3</span>
      </div>

      {/* FORMULARIO */}
      <div className="form-box">

        {/* TÍTULO */}
        <label>
          <span>Título *</span>
          <input
            type="text"
            className="input-titulo"
            placeholder="Ej: Cómo implementar IA en tu empresa"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
        </label>

        {/* DESCRIPCIÓN */}
        <label>
          <span>Descripción *</span>
          <textarea
            className="textarea-descripcion"
            placeholder="Describe qué aprenderán los usuarios con este contenido..."
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </label>

        {/* IMAGEN DE PORTADA */}
        <label>
          <span>Imagen de Portada *</span>

          <div className="file-wrapper">
            <input
              type="file"
              id="fileInput"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setImagen(e.target.files[0])}
            />

            <label htmlFor="fileInput" className="file-button">
              📁 Seleccionar imagen
            </label>

            {imagen && (
              <p className="file-name">{imagen.name}</p>
            )}
          </div>

          <p className="upload-note">JPG, PNG o WebP • Recomendado 16:9</p>
        </label>

        {/* LINK OPCIONAL */}
        <label>
          <span>Link al contenido principal (opcional)</span>
          <input
            type="url"
            className="input-link"
            placeholder="https://ejemplo.com/contenido"
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
          <p className="upload-note">Aquí puedes añadir un enlace al contenido principal</p>
        </label>

        {/* BOTONES */}
        <div className="form-buttons">
          <button className="atras-btn" onClick={() => navigate("/crear")}>Atrás</button>
          <button
            className="siguiente-btn"
            disabled={!titulo.trim() || !descripcion.trim() || !imagen}
            style={(!titulo.trim() || !descripcion.trim() || !imagen) ? {opacity: 0.45, cursor: "not-allowed"} : {}}
            onClick={() => navigate("/crear/paso3")}
          >
            Siguiente
          </button>
        </div>
      </div>

      {/* BARRA INFERIOR */}
      <BottomBar active="crear" />
    </div>
  );
}
