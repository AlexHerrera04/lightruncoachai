import React from "react";
import "../styles/perfil.css";
import { useNavigate } from "react-router-dom";

export default function VideosGuardados() {
  const navigate = useNavigate();
  const videos = JSON.parse(localStorage.getItem("videosGuardados")) || [];

  return (
    <div className="perfil-fullscreen">

      <div className="volver-wrapper">
        <button className="volver-button" onClick={() => navigate(-1)}>
          ← Volver
        </button>
      </div>

      <h3>Videos guardados</h3>

      <div className="guardados-lista">
        {videos.length === 0 && (
          <p className="sin-videos">No has guardado ningún video aún.</p>
        )}

        {videos.map((v, i) => (
          <div key={i} className="video-guardado">
            <img src={v.imagen} alt={v.titulo} />
            <div>
              <h4>{v.titulo}</h4>
              <p>{v.autor}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
