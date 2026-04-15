import React, { useEffect, useState } from 'react';
import '../styles/inicio.css';
import { useNavigate } from 'react-router-dom';
import BottomBar from '../components/BottomBar';
import { getGoalsList } from "../api/api";
import { getNoLeidas } from "../utils/notificaciones";

async function getUserAccount() {
  const token = localStorage.getItem("accessToken");
  const payload = JSON.parse(atob(token.split(".")[1]));
  const userId = payload.user_id;
  const res = await fetch(
    `https://d2dy88a4l687h9.cloudfront.net/accounts/accountinfo/${userId}/`,
    { headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" } }
  );
  if (!res.ok) throw new Error("Error account");
  return await res.json();
}

export default function Inicio() {
  const navigate = useNavigate();

  const [goals, setGoals] = useState([]);
  const [competenciasClave, setCompetenciasClave] = useState([]);
  const [resumenADN, setResumenADN] = useState(
    localStorage.getItem("miADNDigitalSubtitle") ||
    localStorage.getItem("resumenADN") ||
    ""
  );
  const [actividadTotal, setActividadTotal] = useState(245);
  const [actividadSemana, setActividadSemana] = useState(30);

  useEffect(() => {
    async function loadGoals() {
      try {
        const data = await getGoalsList();
        setGoals(data);
      } catch (error) {
        console.error("Error cargando metas:", error);
      }
    }

    loadGoals();
  }, []);

  useEffect(() => {
    async function loadCompetencias() {
      try {
        const account = await getUserAccount();
        if (account?.capacity) {
          setCompetenciasClave(account.capacity);

          const manualADNSubtitle = localStorage.getItem("miADNDigitalSubtitle");
          if (manualADNSubtitle) {
            setResumenADN(manualADNSubtitle);
            return;
          }

          const cacheKey = "resumenADN_" + account.capacity.join(",");
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            setResumenADN(cached);
            return;
          }

          try {
            const res = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 20,
                messages: [{
                  role: "user",
                  content: `Tienes estas competencias clave: ${account.capacity.join(", ")}. Resúmelas en exactamente 2 palabras creativas y potentes que definan el perfil (ej: "Innovador Digital", "Líder Ágil"). Solo las 2 palabras, sin explicación ni puntuación.`
                }]
              })
            });
            const data = await res.json();
            const resum = data.content?.[0]?.text?.trim() || "";
            if (resum) {
              setResumenADN(resum);
              localStorage.setItem(cacheKey, resum);
            }
          } catch {}
        }
      } catch {}
    }

    loadCompetencias();
  }, []);

  useEffect(() => {
    function syncADNSubtitle() {
      const saved =
        localStorage.getItem("miADNDigitalSubtitle") ||
        localStorage.getItem("resumenADN") ||
        "";

      if (saved) setResumenADN(saved);
    }

    window.addEventListener("focus", syncADNSubtitle);
    window.addEventListener("adn-subtitle-updated", syncADNSubtitle);

    return () => {
      window.removeEventListener("focus", syncADNSubtitle);
      window.removeEventListener("adn-subtitle-updated", syncADNSubtitle);
    };
  }, []);

  const [noLeidas, setNoLeidas] = useState(() => getNoLeidas());

  useEffect(() => {
    function onVisibility() {
      if (!document.hidden) setNoLeidas(getNoLeidas());
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const [estadoMetasLocal, setEstadoMetasLocal] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("estadoMetas") || "{}");
    } catch {
      return {};
    }
  });

  useEffect(() => {
    function onFocus() {
      try {
        setEstadoMetasLocal(JSON.parse(localStorage.getItem("estadoMetas") || "{}"));
      } catch {}
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const metasCompletadas = goals.filter(g => {
    const key = g.id ?? g.name;
    return g.status === "done" || estadoMetasLocal[key]?.completada === true;
  }).length;

  const metasTotales = goals.length;

  return (
    <div className="inicio-container">
      <div className="header">
        <div className="header-left">
          <span className="inicio-brand-icon" aria-hidden="true">✳</span>

          <div className="inicio-heading">
            <h1 className="inicio-title">Inicio</h1>
            <p className="inicio-subtitle">Tu progreso personal</p>
          </div>
        </div>

        <div className="header-right">
          <button className="icon-button coach-button" onClick={() => navigate('/coach')}>
            <span className="icono-coach"></span>
            <span className="coach-badge">IA</span>
          </button>

          <button className="icon-button" onClick={() => navigate('/notificaciones')}>
            <span className="icono-notis">
              {noLeidas > 0 && <span className="notis-badge" />}
            </span>
          </button>

          <button className="icon-button" onClick={() => navigate('/perfil')}>
            <span className="icono-perfil"></span>
          </button>
        </div>
      </div>

      <div className="info-horizontal">
        <div className="info-block">
          <h4>Score</h4>
          <p>{actividadTotal}</p>
          <span className="motivacion">Puntos acumulados</span>
        </div>

        <div className="info-block">
          <h4>Racha</h4>
          <p>7 días</p>
          <span className="motivacion">¡Mantén tu racha!</span>
        </div>

        <div className="info-block">
          <h4>Esta semana</h4>
          <p>{actividadSemana}</p>
          <span className="motivacion">Puntos ganados</span>
        </div>
      </div>

      <div className="section-row" onClick={() => navigate('/desafio')}>
        <div className="section-text">
          <h3>Desafío Diario</h3>
          <p>10 preguntas • 5 min</p>
        </div>
        <div className="section-tag-group">
          <span className="section-tag tag-quiz">Disponible</span>
          <span className="section-arrow">›</span>
        </div>
      </div>

      <div className="section-row" onClick={() => navigate('/explorar')}>
        <div className="section-text">
          <h3>Explorar</h3>
          <p>Contenido personalizado</p>
        </div>
        <div className="section-tag-group">
          <span className="section-tag tag-explorar">4 nuevos</span>
          <span className="section-arrow">›</span>
        </div>
      </div>

      <div className="section-row" onClick={() => navigate('/miadn')}>
        <div className="section-text">
          <h3>Mis Metas</h3>
          <p>{metasCompletadas} de {metasTotales} completadas</p>
        </div>
        <div className="section-tag-group">
          <span className="section-tag tag-metas">
            {metasTotales === 0 ? "0%" : Math.round((metasCompletadas / metasTotales) * 100) + "%"}
          </span>
          <span className="section-arrow">›</span>
        </div>
      </div>

      <div className="section-row" onClick={() => navigate('/miadn')}>
        <div className="section-text">
          <h3>ADN Digital</h3>
          <p className="adn-line">
            {resumenADN || (competenciasClave.length > 0 ? "Analizando tu ADN..." : "Cargando...")}
          </p>
        </div>
        <div className="section-tag-group">
          <span className="section-tag tag-adn">Ir a Mi ADN</span>
          <span className="section-arrow">›</span>
        </div>
      </div>

      <BottomBar active="inicio" />
    </div>
  );
}