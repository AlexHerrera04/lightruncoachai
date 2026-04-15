import React, { useState, useEffect } from 'react';
import '../styles/notificaciones.css';
import { useNavigate } from 'react-router-dom';
import { getNotificaciones, marcarLeida, marcarTodasLeidas, tiempoRelativo } from '../utils/notificaciones';

function IconoTipo({ tipo }) {
  const style = { width: 20, height: 20, flexShrink: 0 };
  if (tipo === "meta" || tipo === "logro") return (
    <svg style={style} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="3,17 8,12 13,15 21,6" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="3" cy="17" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="8" cy="12" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="13" cy="15" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="21" cy="6" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  );
  if (tipo === "social") return (
    <svg style={style} fill="currentColor" viewBox="0 0 24 24">
      <path d="M21 6h-2v9H7v2c0 .55.45 1 1 1h9l4 4V7c0-.55-.45-1-1-1zM17 2H3c-.55 0-1 .45-1 1v14l4-4h11c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1z"/>
    </svg>
  );
  // info — icono Mi ADN (radar)
  return (
    <svg style={style} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="3,17 8,12 13,15 21,6" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="3" cy="17" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="8" cy="12" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="13" cy="15" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="21" cy="6" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  );
}

export default function Notificaciones() {
  const navigate = useNavigate();
  const [notis, setNotis] = useState([]);

  useEffect(() => {
    setNotis(getNotificaciones());
  }, []);

  function handleMarcarLeida(id) {
    marcarLeida(id);
    setNotis(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
  }

  function handleMarcarTodas() {
    marcarTodasLeidas();
    setNotis(prev => prev.map(n => ({ ...n, leida: true })));
  }

  const noLeidas = notis.filter(n => !n.leida).length;

  return (
    <div className="notificaciones-container">
      <div className="notis-header">
        <button className="volver-button" onClick={() => navigate(-1)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15,18 9,12 15,6"/>
          </svg>
        </button>
        <h1 className="notis-title">Notificaciones</h1>
        {noLeidas > 0 && (
          <button className="notis-marcar-todas" onClick={handleMarcarTodas}>
            Marcar todas como leídas
          </button>
        )}
      </div>

      {notis.length === 0 ? (
        <div className="notis-empty">
          <span className="notis-empty-icon">🔔</span>
          <p>No tienes notificaciones todavía</p>
          <span>Las notificaciones aparecerán aquí cuando completes metas, logros y más</span>
        </div>
      ) : (
        <div className="notis-list">
          {notis.map(n => (
            <div
              key={n.id}
              className={"noti-card" + (!n.leida ? " noti-no-leida" : "")}
              onClick={() => handleMarcarLeida(n.id)}
            >
              <div className="noti-icono">
                <IconoTipo tipo={n.tipo} />
              </div>
              <div className="noti-contenido">
                <h3>{n.titulo}</h3>
                <p>{n.texto}</p>
                <span>{tiempoRelativo(n.tiempo)}</span>
              </div>
              {!n.leida && <div className="noti-punt" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
