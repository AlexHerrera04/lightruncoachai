import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/perfil.css";
import "../styles/historialPuntos.css";

const HISTORIAL_SETMANAL = [
  { id: 1, tipo: "desafio",   descripcion: "Desafío diario completado",         puntos: +3,  fecha: "2025-04-20" },
  { id: 2, tipo: "bonus",     descripcion: "Bonus meta semanal alcanzada 🎯",    puntos: +10, fecha: "2025-04-20" },
  { id: 3, tipo: "contenido", descripcion: "Contenido visto: Liderazgo Ágil",   puntos: +2,  fecha: "2025-04-19" },
  { id: 4, tipo: "desafio",   descripcion: "Desafío diario completado",         puntos: +5,  fecha: "2025-04-19" },
  { id: 5, tipo: "meta",      descripcion: "Meta completada: 5 videos vistos",  puntos: +5,  fecha: "2025-04-18" },
  { id: 6, tipo: "desafio",   descripcion: "Desafío diario completado",         puntos: +4,  fecha: "2025-04-18" },
  { id: 7, tipo: "bonus",     descripcion: "Bonus meta semanal alcanzada 🎯",   puntos: +10, fecha: "2025-04-14" },
  { id: 8, tipo: "contenido", descripcion: "Contenido visto: IA Aplicada",      puntos: +2,  fecha: "2025-04-13" },
  { id: 9, tipo: "desafio",   descripcion: "Desafío diario completado",         puntos: +7,  fecha: "2025-04-13" },
  { id: 10, tipo: "meta",     descripcion: "Meta completada: Desafío 7 días",   puntos: +5,  fecha: "2025-04-12" },
];

const HISTORIAL_TOTAL = [
  { id: 1,  tipo: "desafio",   descripcion: "Desafío diario completado",         puntos: +3,  fecha: "2025-04-20" },
  { id: 2,  tipo: "bonus",     descripcion: "Bonus meta semanal alcanzada 🎯",    puntos: +10, fecha: "2025-04-20" },
  { id: 3,  tipo: "contenido", descripcion: "Contenido visto: Liderazgo Ágil",   puntos: +2,  fecha: "2025-04-19" },
  { id: 4,  tipo: "desafio",   descripcion: "Desafío diario completado",         puntos: +5,  fecha: "2025-04-19" },
  { id: 5,  tipo: "meta",      descripcion: "Meta completada: 5 videos vistos",  puntos: +5,  fecha: "2025-04-18" },
  { id: 6,  tipo: "desafio",   descripcion: "Desafío diario completado",         puntos: +4,  fecha: "2025-04-18" },
  { id: 7,  tipo: "bonus",     descripcion: "Bonus meta semanal alcanzada 🎯",   puntos: +10, fecha: "2025-04-14" },
  { id: 8,  tipo: "contenido", descripcion: "Contenido visto: IA Aplicada",      puntos: +2,  fecha: "2025-04-13" },
  { id: 9,  tipo: "desafio",   descripcion: "Desafío diario completado",         puntos: +7,  fecha: "2025-04-13" },
  { id: 10, tipo: "meta",      descripcion: "Meta completada: Desafío 7 días",   puntos: +5,  fecha: "2025-04-12" },
  { id: 11, tipo: "desafio",   descripcion: "Desafío diario completado",         puntos: +6,  fecha: "2025-04-07" },
  { id: 12, tipo: "contenido", descripcion: "Contenido visto: Design Thinking",  puntos: +2,  fecha: "2025-04-07" },
  { id: 13, tipo: "bonus",     descripcion: "Bonus meta semanal alcanzada 🎯",   puntos: +10, fecha: "2025-04-07" },
  { id: 14, tipo: "desafio",   descripcion: "Desafío diario completado",         puntos: +4,  fecha: "2025-04-05" },
  { id: 15, tipo: "meta",      descripcion: "Meta completada: Curso IA básico",  puntos: +8,  fecha: "2025-04-05" },
  { id: 16, tipo: "desafio",   descripcion: "Desafío diario completado",         puntos: +3,  fecha: "2025-03-30" },
  { id: 17, tipo: "contenido", descripcion: "Contenido visto: Big Data 101",     puntos: +2,  fecha: "2025-03-30" },
  { id: 18, tipo: "desafio",   descripcion: "Desafío diario completado",         puntos: +5,  fecha: "2025-03-28" },
  { id: 19, tipo: "bonus",     descripcion: "Bonus meta semanal alcanzada 🎯",   puntos: +10, fecha: "2025-03-28" },
  { id: 20, tipo: "meta",      descripcion: "Meta completada: 10 desafíos",      puntos: +10, fecha: "2025-03-22" },
];

const TIPO_CONFIG = {
  desafio:   { label: "Desafío",   color: "#a78bfa", bg: "rgba(167,139,250,0.1)",  border: "rgba(167,139,250,0.25)", icon: "🏆" },
  contenido: { label: "Contenido", color: "#60a5fa", bg: "rgba(96,165,250,0.1)",   border: "rgba(96,165,250,0.25)",  icon: "📚" },
  meta:      { label: "Meta",      color: "#34d399", bg: "rgba(52,211,153,0.1)",   border: "rgba(52,211,153,0.25)",  icon: "🎯" },
  bonus:     { label: "Bonus",     color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.35)",  icon: "⭐" },
};

function formatFecha(iso) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

function HistorialView({ historial }) {
  const total = historial.reduce((s, h) => s + h.puntos, 0);

  const grups = historial.reduce((acc, h) => {
    if (!acc[h.fecha]) acc[h.fecha] = [];
    acc[h.fecha].push(h);
    return acc;
  }, {});

  return (
    <>
      <div className="hp-resum">
        <div className="hp-resum-total">
          <span className="hp-resum-num">{total}</span>
          <span className="hp-resum-label">puntos totales</span>
        </div>
        <div className="hp-resum-tipus">
          {Object.entries(TIPO_CONFIG).map(([k, v]) => {
            const sum = historial.filter(h => h.tipo === k).reduce((s, h) => s + h.puntos, 0);
            if (!sum) return null;
            return (
              <div key={k} className="hp-resum-tag" style={{ background: v.bg, border: `1px solid ${v.border}`, color: v.color }}>
                {v.icon} {v.label}: +{sum}
              </div>
            );
          })}
        </div>
      </div>

      <div className="hp-llista">
        {(() => {
          const sorted = Object.entries(grups).sort((a, b) => b[0].localeCompare(a[0]));
          let acumulado = total;
          return sorted.map(([data, items]) => {
            const sumaDia = items.reduce((s, h) => s + h.puntos, 0);
            const scoreActual = acumulado;
            acumulado -= sumaDia;
            return (
              <div key={data} className="hp-grup">
                <div className="hp-data-row">
                  <p className="hp-data">{formatFecha(data)}</p>
                  <div className="hp-data-score">
                    <span className="hp-data-total">{scoreActual} pts</span>
                    <span className="hp-data-plus">+{sumaDia}</span>
                  </div>
                </div>
                {items.map(h => {
                  const cfg = TIPO_CONFIG[h.tipo];
                  return (
                    <div key={h.id} className="hp-item" style={{ borderLeft: `3px solid ${cfg.color}` }}>
                      <div className="hp-item-left">
                        <span className="hp-item-icon">{cfg.icon}</span>
                        <div>
                          <p className="hp-item-desc">{h.descripcion}</p>
                          <span className="hp-item-tipus" style={{ color: cfg.color }}>{cfg.label}</span>
                        </div>
                      </div>
                      <span className="hp-item-punts" style={{ color: h.tipo === "bonus" ? "#fbbf24" : "white" }}>
                        +{h.puntos}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          });
        })()}
      </div>
    </>
  );
}

export default function HistorialPuntos() {
  const navigate = useNavigate();
  const [vista, setVista] = useState("setmanal");

  return (
    <div className="perfil-fullscreen">
      <div className="volver-wrapper">
        <button className="volver-button" onClick={() => navigate(-1)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15,18 9,12 15,6"/>
          </svg>
        </button>
        <h1 className="perfil-page-title">Historial de puntos</h1>
        <button
          className="hp-swap-btn"
          onClick={() => setVista(v => v === "setmanal" ? "total" : "setmanal")}
        >
          {vista === "setmanal" ? "Ver total" : "Ver semanal"}
        </button>
      </div>

      <HistorialView historial={vista === "setmanal" ? HISTORIAL_SETMANAL : HISTORIAL_TOTAL} />
    </div>
  );
}
