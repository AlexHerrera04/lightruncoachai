import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/onboarding.css';

const PANTALLES = [
  {
    key: "explorar",
    titol: "Descubre Contenido",
    subtitol: "Explora contenidos B2B adaptados a tus competencias profesionales.",
    descripcio: "Desliza, guarda y aprende con contenido adaptado a ti.",
    color: "#6366f1",
    icon: (
      <svg width="64" height="64" fill="none" stroke="white" strokeWidth="1.8" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="7"/>
        <line x1="16.65" y1="16.65" x2="21" y2="21" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    key: "desafio",
    titol: "Completa Desafíos",
    subtitol: "Responde preguntas diarias y gana puntos en tu score.",
    descripcio: "10 preguntas. 5 minutos. Cada día cuenta.",
    color: "#8b5cf6",
    icon: (
      <svg width="64" height="64" fill="white" viewBox="0 0 24 24">
        <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/>
      </svg>
    ),
  },
  {
    key: "crear",
    titol: "Comparte tu Conocimiento",
    subtitol: "Crea y publica contenido para tu comunidad.",
    descripcio: "Sube videos, presentaciones y recursos en segundos.",
    color: "#7c3aed",
    icon: (
      <svg width="64" height="64" fill="none" viewBox="0 0 24 24">
        <line x1="12" y1="5" x2="12" y2="19" stroke="white" strokeWidth="3" strokeLinecap="round"/>
        <line x1="5" y1="12" x2="19" y2="12" stroke="white" strokeWidth="3" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    key: "miadn",
    titol: "Descubre tu ADN Digital",
    subtitol: "Mapea tus competencias clave, metas y madurez digital de forma gráfica",
    descripcio: "Compara tu perfil con benchmarks de tu sector.",
    color: "#4f46e5",
    icon: (
      <svg width="64" height="64" fill="none" stroke="white" strokeWidth="1.8" viewBox="0 0 24 24">
        <polyline points="3,17 8,12 13,15 21,6" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="3" cy="17" r="1.8" fill="white" stroke="none"/>
        <circle cx="8" cy="12" r="1.8" fill="white" stroke="none"/>
        <circle cx="13" cy="15" r="1.8" fill="white" stroke="none"/>
        <circle cx="21" cy="6" r="1.8" fill="white" stroke="none"/>
      </svg>
    ),
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [actual, setActual] = useState(0);
  const [sortint, setSortint] = useState(false);
  const [noMostrarSeleccionat, setNoMostrarSeleccionat] = useState(false);

  const vegadesVist = useMemo(() => {
    return parseInt(localStorage.getItem("onboardingVist") || "0", 10);
  }, []);

  const esPrimerCop = vegadesVist === 0;
  const pantalla = PANTALLES[actual];
  const esUltima = actual === PANTALLES.length - 1;

  function anarA(index) {
    if (index === actual) return;
    setSortint(true);
    setTimeout(() => {
      setActual(index);
      setSortint(false);
    }, 220);
  }

   function marcarOnboardingComVist() {
    localStorage.setItem("onboardingFet", "true");
    localStorage.setItem("onboardingVist", String(vegadesVist + 1));
  }

  function continuar() {
    if (esUltima) {
      marcarOnboardingComVist();
      navigate("/splash");
    } else {
      anarA(actual + 1);
    }
  }

  function saltar() {
    marcarOnboardingComVist();
    navigate("/splash");
  }

  function noVolverAMostrar() {
  setNoMostrarSeleccionat(true);
  localStorage.setItem("onboardingNoMostrar", "true");
  marcarOnboardingComVist();
  setTimeout(() => {
    navigate("/splash");
  }, 180);
}
  return (
    <div className="onb-container" style={{ "--accent": pantalla.color }}>

       {esPrimerCop ? (
        <button className="onb-saltar" onClick={saltar}>Omitir</button>
      ) : (
       <button
  className="onb-saltar onb-no-mostrar"
  onClick={noVolverAMostrar}
  aria-pressed={noMostrarSeleccionat}
>
  <span
    className={"onb-checkbox" + (noMostrarSeleccionat ? " onb-checkbox-actiu" : "")}
    aria-hidden="true"
  >
    {noMostrarSeleccionat ? "✕" : ""}
  </span>
  <span>No volver a mostrar</span>
</button>
      )}

      {/* CONTINGUT CENTRAL */}
      <div className={"onb-body" + (sortint ? " onb-sortint" : "")}>

        {/* ICONA */}
        <div className="onb-icon-wrap">
          <div className="onb-icon-ring onb-ring-3" />
          <div className="onb-icon-ring onb-ring-2" />
          <div className="onb-icon-ring onb-ring-1" />
          <div className="onb-icon-circle">
            {pantalla.icon}
          </div>
        </div>

        {/* TEXTS */}
        <h1 className="onb-titol">{pantalla.titol}</h1>
        <p className="onb-subtitol">{pantalla.subtitol}</p>
        <p className="onb-descripcio">{pantalla.descripcio}</p>
      </div>

      {/* DOTS */}
      <div className="onb-dots">
        {PANTALLES.map((_, i) => (
          <button
            key={i}
            className={"onb-dot" + (i === actual ? " onb-dot-actiu" : "")}
            onClick={() => anarA(i)}
          />
        ))}
      </div>

      {/* BOTÓ CONTINUAR */}
      <button className="onb-continuar" onClick={continuar}>
        {esUltima ? "Empezar" : "Continuar"}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9,18 15,12 9,6"/>
        </svg>
      </button>

    </div>
  );
}
