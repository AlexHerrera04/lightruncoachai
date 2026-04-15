import React, { useState, useEffect } from 'react';
import '../styles/perfil.css';
import { useNavigate } from 'react-router-dom';

function GrupoAccordion({ titulo, children, defaultOpen = false }) {
  const [abierto, setAbierto] = useState(defaultOpen);
  return (
    <div className="perfil-grupo">
      <div className="perfil-grupo-header clickable" onClick={() => setAbierto(!abierto)}>
        <span className="perfil-grupo-titulo">{titulo}</span>
        <svg className={`perfil-grupo-arrow ${abierto ? 'abierto' : ''}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6,9 12,15 18,9" />
        </svg>
      </div>
      <div className={`perfil-grupo-contenido ${abierto ? 'abierto' : ''}`}>
        {children}
      </div>
    </div>
  );
}

export default function Perfil() {
  const navigate = useNavigate();

  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("darkMode") === "false" ? false : true
  );

  const [numPreguntas, setNumPreguntas] = useState(() => {
    const saved = parseInt(localStorage.getItem("numPreguntas"), 10);
    return [5, 10].includes(saved) ? saved : 5;
  });

  const [frecDesafio, setFrecDesafio] = useState(5);

  const [personalidadCoach, setPersonalidadCoach] = useState(
    localStorage.getItem("personalidadCoach") || "pragmatico"
  );

  const opcionesPreguntas = [5, 10, 15];
  const opcionesFrecuencia = [3, 5, 7];
  const opcionesPersonalidad = ["Motivador", "Pragmático", "Brutal"];

  const targetSemanal = frecDesafio * numPreguntas;

  const historial = (() => {
    try { return JSON.parse(localStorage.getItem("historialContenidos") || "[]"); } catch { return []; }
  })();

  useEffect(() => {
    if (darkMode) {
      document.body.classList.remove("light");
    } else {
      document.body.classList.add("light");
    }
  }, [darkMode]);

  useEffect(() => {
    setFrecDesafio(5);
    localStorage.setItem("frecDesafio", "5");

    const savedPreguntas = parseInt(localStorage.getItem("numPreguntas"), 10);
    if (![5, 10].includes(savedPreguntas)) {
      setNumPreguntas(5);
      localStorage.setItem("numPreguntas", "5");
    }
  }, []);

  const toggleDarkMode = () => {
    const nuevoEstado = !darkMode;
    setDarkMode(nuevoEstado);
    localStorage.setItem("darkMode", nuevoEstado);
  };

  return (
    <div className="perfil-fullscreen">

      <div className="volver-wrapper">
        <button className="volver-button" onClick={() => navigate(-1)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15,18 9,12 15,6"/>
          </svg>
        </button>
        <h1 className="perfil-page-title">Perfil</h1>
      </div>

      <div className="perfil-grupos-lista">

        <GrupoAccordion titulo="Datos personales">
          <div className="perfil-lista">
            <div className="perfil-item fijo">
              <span className="label">Nombre</span>
              <span className="valor">Àlex Herrera</span>
            </div>
            <div className="perfil-item fijo">
              <span className="label">Email</span>
              <span className="valor">alex.herrera@empresa.com</span>
            </div>
            <div className="perfil-item clickable" onClick={() => navigate("/historial-puntos")}>
              <span className="label">Mi score</span>
              <span className="valor link">Ver historial de puntos</span>
            </div>
            <div className="perfil-item fijo">
              <span className="label">Rol</span>
              <span className="valor">Digital Learning Lead</span>
            </div>
            <div className="perfil-item fijo">
              <span className="label">Nivel</span>
              <span className="valor">Senior</span>
            </div>
          </div>
        </GrupoAccordion>

        <GrupoAccordion titulo="Perfil de empresa">
          <div className="perfil-lista">
            <div className="perfil-item clickable">
              <span className="label">Empresa</span>
              <span className="valor">Mi Empresa</span>
            </div>
            <div className="perfil-item clickable">
              <span className="label">Industria</span>
              <span className="valor">Educación y Tecnología</span>
            </div>
            <div className="perfil-item clickable">
              <span className="label">Equipo</span>
              <span className="valor">Digital Learning</span>
            </div>
            <div className="perfil-item clickable">
              <span className="label">Función</span>
              <span className="valor">Formación y Desarrollo</span>
            </div>
          </div>
        </GrupoAccordion>

        <GrupoAccordion titulo="Contenido">
          <div className="perfil-lista">
            <div className="perfil-item clickable" onClick={() => navigate("/contenido-subido")}>
              <span className="label">Contenido compartido</span>
              <span className="valor link">Ver contenido</span>
            </div>
            <div className="perfil-item clickable" onClick={() => navigate("/videos-guardados")}>
              <span className="label">Mis favoritos</span>
              <span className="valor link">Ver lista</span>
            </div>
            <div className="perfil-item clickable" onClick={() => navigate("/historial")}>
              <span className="label">Mi historial</span>
              <span className="valor link">{historial.length > 0 ? `${historial.length} vistos` : "Ver historial"}</span>
            </div>
          </div>
        </GrupoAccordion>

        <GrupoAccordion titulo="Preferencias">
          <div className="perfil-lista">
            <div className="perfil-item clickable">
              <span className="label">Notificaciones</span>
              <span className="valor toggle">ON</span>
            </div>

            <div className="perfil-item fijo">
              <span className="label">Frecuencia de desafío semanal</span>
              <div className="selector-preguntas">
                {opcionesFrecuencia.map((n) => {
                  const bloqueado = n !== 5;

                  return (
                    <button
                      key={n}
                      type="button"
                      className={`btn-preguntas ${frecDesafio === n ? 'activo' : ''} ${bloqueado ? 'btn-preguntas-bloqueado' : ''}`}
                      disabled={bloqueado}
                      aria-disabled={bloqueado}
                      title={bloqueado ? "Temporalmente no disponible" : ""}
                      onClick={() => {
                        if (bloqueado) return;
                        setFrecDesafio(5);
                        localStorage.setItem("frecDesafio", "5");
                      }}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="perfil-item fijo">
              <span className="label">Preguntas por desafío</span>
              <div className="selector-preguntas">
                {opcionesPreguntas.map((n) => {
                  const bloqueado = ![5, 10].includes(n);

                  return (
                    <button
                      key={n}
                      type="button"
                      className={`btn-preguntas ${numPreguntas === n ? 'activo' : ''} ${bloqueado ? 'btn-preguntas-bloqueado' : ''}`}
                      disabled={bloqueado}
                      aria-disabled={bloqueado}
                      title={bloqueado ? "Temporalmente no disponible" : ""}
                      onClick={() => {
                        if (bloqueado) return;
                        setNumPreguntas(n);
                        localStorage.setItem("numPreguntas", String(n));
                      }}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="perfil-item fijo perfil-target">
              <span className="label">Target semanal</span>
              <div className="target-valor">
                <span className="target-num">{targetSemanal}</span>
                <span className="target-sub">puntos</span>
              </div>
            </div>

            <div className="perfil-item fijo">
              <span className="label">Personalidad de mi Coach AI</span>
              <div className="selector-preguntas">
                {opcionesPersonalidad.map((p) => (
                  <button
                    key={p}
                    className={`btn-preguntas ${personalidadCoach === p ? 'activo' : ''}`}
                    onClick={() => {
                      setPersonalidadCoach(p);
                      localStorage.setItem("personalidadCoach", p);
                    }}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="perfil-item clickable" onClick={() => navigate("/coach-recomendaciones")}>
              <span className="label">Recomendaciones de mi Coach AI</span>
              <span className="valor link">Ver →</span>
            </div>

            <div className="perfil-item clickable" onClick={toggleDarkMode}>
              <span className="label">Modo claro</span>
              <span className="valor toggle">{darkMode ? "OFF" : "ON"}</span>
            </div>

            <div className="perfil-item clickable">
              <span className="label">Privacidad y seguridad</span>
            </div>
          </div>
        </GrupoAccordion>

        <GrupoAccordion titulo="Centro de ayuda">
          <div className="perfil-lista">
            <div className="perfil-item clickable" onClick={() => window.open("https://openkx.ai/support", "_blank")}>
              <span className="label">Soporte</span>
              <span className="valor link">Abrir centro de ayuda</span>
            </div>
          </div>
        </GrupoAccordion>

        <div className="perfil-item cerrar clickable perfil-cerrar-sesion">
          <span className="label">Cerrar sesión</span>
        </div>

      </div>
    </div>
  );
}