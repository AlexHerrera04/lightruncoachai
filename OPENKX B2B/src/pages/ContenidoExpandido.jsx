import React, { useState } from 'react';
import '../styles/contenido.css';

function getEmbedInfo(contenido) {
  const src = contenido.external_source?.toLowerCase() || "";
  const id = contenido.external_source_id || "";

  // YouTube
  if (src.includes("youtube") || id.includes("youtube.com") || id.includes("youtu.be")) {
    let videoId = id;
    const matchLong = id.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (matchLong) videoId = matchLong[1];
    if (videoId.length === 11) {
      return { tipus: "embed", url: `https://www.youtube.com/embed/${videoId}?autoplay=1` };
    }
  }

  // Spotify
  if (src.includes("spotify") || id.includes("spotify.com")) {
    const match = id.match(/spotify\.com\/(episode|track|playlist|album)\/([a-zA-Z0-9]+)/);
    if (match) {
      return { tipus: "embed", url: `https://open.spotify.com/embed/${match[1]}/${match[2]}` };
    }
  }

  // Vimeo
  if (src.includes("vimeo") || id.includes("vimeo.com")) {
    const match = id.match(/(\d{6,})/);
    if (match) {
      return { tipus: "embed", url: `https://player.vimeo.com/video/${match[1]}?autoplay=1` };
    }
  }

  // No embeddable
  return { tipus: "extern", url: id.startsWith("http") ? id : null };
}

export default function ContenidoExpandido({ contenido, onClose }) {
  if (!contenido) return null;

  const [mostrarPlayer, setMostrarPlayer] = useState(false);

  function guardarHistorial() {
    try {
      const historial = JSON.parse(localStorage.getItem("historialContenidos") || "[]");
      const jaExisteix = historial.some(h => h.id === contenido.id);
      if (!jaExisteix) {
        const item = {
          id: contenido.id,
          name: contenido.name,
          image: contenido.public_image,
          source: contenido.external_source || contenido.origin,
          visitatAt: new Date().toISOString(),
        };
        localStorage.setItem("historialContenidos", JSON.stringify([item, ...historial].slice(0, 100)));
      }
    } catch {}
  }
  const embedInfo = getEmbedInfo(contenido);
  const nomFont = contenido.external_source || contenido.origin || "Fuente desconocida";

  return (
    <>
      {/* ===== PLAYER FULLSCREEN ===== */}
      {mostrarPlayer && embedInfo.tipus === "embed" && (
        <div className="contenido-player-fullscreen">
          <iframe
            src={embedInfo.url}
            title={contenido.name}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          <button className="btn-tancar-player" onClick={() => setMostrarPlayer(false)}>
            ✕ Cerrar
          </button>
        </div>
      )}

      {/* ===== DETALL CONTINGUT ===== */}
      {!mostrarPlayer && (
        <div className="contenido-expandido">
          <div className="contenido-wrapper">

            <button className="cerrar-x" onClick={onClose}>✕</button>

            <h2>{contenido.name}</h2>

            {contenido.public_image && (
              <img src={contenido.public_image} alt={contenido.name} className="contenido-imagen" />
            )}

            {contenido.rating && parseFloat(contenido.rating) > 0 && (
              <p className="rating">
                ⭐ {contenido.rating}
                {contenido.number_of_reviews > 0 && <span> ({contenido.number_of_reviews} reviews)</span>}
              </p>
            )}

            <p className="autor">
              {contenido.origin === "external" && contenido.external_source
                ? `Fuente: ${contenido.external_source}`
                : `Origen: ${contenido.origin}`}
            </p>

            {contenido.capacity_filter?.length > 0 && (
              <div className="competencias">
                {contenido.capacity_filter.map((c, idx) => (
                  <span key={idx}>{c.capacity}</span>
                ))}
              </div>
            )}

            <div className="descripcion">
              <h3>Descripción</h3>
              <p>{contenido.description || "Este contenido no tiene descripción disponible."}</p>
            </div>

            <div className="disponible">
              <p>Disponible en <strong>{nomFont}</strong></p>

              {embedInfo.tipus === "embed" ? (
                <button className="ver-video" onClick={() => { setMostrarPlayer(true); guardarHistorial(); }}>
                  Ver contenido completo
                </button>
              ) : (
                <a
                  href={embedInfo.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ver-video"
                  onClick={guardarHistorial}
                >
                  Ver contenido completo ↗
                </a>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}
