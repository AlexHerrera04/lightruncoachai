import React from "react";
import "../styles/compartir.css";

export default function Compartir({ onClose }) {
  const url = "https://openkx.wiki/video/123";

  const copiarLink = () => {
    navigator.clipboard.writeText(url);
  };

  return (
    <div className="compartir-overlay" onClick={onClose}>
      <div className="compartir-card" onClick={(e) => e.stopPropagation()}>

        <div className="compartir-header">
          <h3>Compartir</h3>
          <button className="cerrar-x" onClick={onClose}>×</button>
        </div>

        <div className="compartir-icons">

          {/* WHATSAPP */}
          <a
            href={`https://wa.me/?text=${encodeURIComponent(url)}`}
            target="_blank"
            className="icon-btn"
          >
            <div className="icon-circle">
              <svg viewBox="0 0 32 32" fill="white">
                <path d="M16 3C9.4 3 4 8.4 4 15c0 2.6.8 5.1 2.3 7L4 29l7.2-2.2c1.5.8 3.2 1.2 4.8 1.2 6.6 0 12-5.4 12-12S22.6 3 16 3z"/>
                <path d="M22.2 19.5c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.1-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.5-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.4.5-.6.2-.2.2-.3.3-.5.1-.2 0-.4 0-.6-.1-.2-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.8.4-.3.3-1.1 1.1-1.1 2.6s1.1 3 1.3 3.2c.2.2 2.2 3.4 5.4 4.8.8.3 1.4.5 1.8.7.8.2 1.5.2 2 .1.6-.1 1.8-.8 2.1-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.2-.6-.4z" fill="black"/>
              </svg>
            </div>
            <span>WhatsApp</span>
          </a>

          {/* GMAIL */}
          <a
            href={`mailto:?subject=Te comparto este video&body=${url}`}
            className="icon-btn"
          >
            <div className="icon-circle">
              <svg viewBox="0 0 48 48" fill="white">
                <path d="M4 10l20 14L44 10v28c0 2.2-1.8 4-4 4H8c-2.2 0-4-1.8-4-4V10z"/>
              </svg>
            </div>
            <span>Gmail</span>
          </a>

          {/* META */}
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${url}`}
            target="_blank"
            className="icon-btn"
          >
            <div className="icon-circle">
              <svg viewBox="0 0 48 48" fill="white">
                <path d="M24 4C13 4 4 13 4 24s9 20 20 20 20-9 20-20S35 4 24 4zm3 14h3v4h-3v14h-5V22h-3v-4h3v-2c0-3 2-6 6-6 1 0 2 0 2 0v4h-2c-1 0-1 1-1 2v2z"/>
              </svg>
            </div>
            <span>Meta</span>
          </a>

        </div>

        <button className="copiar-btn" onClick={copiarLink}>
          Copiar enlace
        </button>

      </div>
    </div>
  );
}
