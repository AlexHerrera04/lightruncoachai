import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/perfil.css';

function tiempoRelativo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return "Ahora mismo";
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `Hace ${Math.floor(diff / 86400)} días`;
  return new Date(iso).toLocaleDateString("es-ES");
}

export default function Historial() {
  const navigate = useNavigate();
  const [historial, setHistorial] = useState(() => {
    try { return JSON.parse(localStorage.getItem("historialContenidos") || "[]"); } catch { return []; }
  });

  function esborrar() {
    localStorage.removeItem("historialContenidos");
    setHistorial([]);
  }

  return (
    <div className="perfil-fullscreen">
      <div className="volver-wrapper">
        <button className="volver-button" onClick={() => navigate(-1)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15,18 9,12 15,6"/>
          </svg>
        </button>
        <h1 className="perfil-page-title">Mi historial</h1>
        {historial.length > 0 && (
          <button onClick={esborrar} style={{ background:"none", border:"1px solid rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.4)", borderRadius:"20px", padding:"4px 12px", fontSize:"0.75rem", cursor:"pointer", marginLeft:"auto" }}>
            Borrar
          </button>
        )}
      </div>

      {historial.length === 0 ? (
        <div style={{ textAlign:"center", color:"rgba(255,255,255,0.3)", marginTop:"4rem", fontSize:"0.9rem" }}>
          <p>No has visto ningún contenido todavía</p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"0.6rem" }}>
          {historial.map((item, i) => (
            <div key={i} style={{ display:"flex", gap:"0.85rem", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"12px", padding:"0.85rem", alignItems:"center" }}>
              {item.image && (
                <img src={item.image} alt={item.name} style={{ width:"60px", height:"45px", objectFit:"cover", borderRadius:"8px", flexShrink:0 }} />
              )}
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ margin:0, fontSize:"0.88rem", fontWeight:"500", color:"white", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{item.name}</p>
                {item.source && <p style={{ margin:"2px 0 0", fontSize:"0.75rem", color:"rgba(255,255,255,0.35)" }}>{item.source}</p>}
              </div>
              <span style={{ fontSize:"0.72rem", color:"rgba(255,255,255,0.3)", flexShrink:0 }}>{tiempoRelativo(item.visitatAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
