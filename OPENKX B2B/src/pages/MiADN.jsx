import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import "../styles/miadn.css";
import BottomBar from "../components/BottomBar";
import { getGoalsList } from "../api/api";
import RadarReal from "../components/RadarReal";
import { useNavigate } from "react-router-dom";
import { addNotificacion } from "../utils/notificaciones";

/* ============================
   PETICIONES API
============================ */

async function getPieChart() {
  const token = localStorage.getItem("accessToken");

  const response = await fetch("http://52.71.121.184/diagnoses/pie-chart/", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    }
  });

  if (!response.ok) throw new Error("Error obteniendo el gráfico");
  return await response.json();
}

async function getRadarData() {
  const token = localStorage.getItem("accessToken");

  if (!token) {
    console.error("No hay token, no se puede cargar el radar");
    return null;
  }

  const response = await fetch(
    "https://d2dy88a4l687h9.cloudfront.net/diagnoses/capacities-comparison",
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      }
    }
  );

  if (!response.ok) {
    console.error("Error obteniendo radar:", response.status);
    return null;
  }

  return await response.json();
}

async function getBenchmarkData(level) {
  const token = localStorage.getItem("accessToken");
  // level: 1-5 o "all" para Cross-Level
  const param = level === "all" ? "?level=all" : `?level=${level}`;
  const response = await fetch(
    `https://d2dy88a4l687h9.cloudfront.net/diagnoses/capacities-comparison${param}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      }
    }
  );
  if (!response.ok) return null;
  return await response.json();
}

async function getUserAccount() {
  const token = localStorage.getItem("accessToken");

  let userId = 165;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    userId = payload.user_id || 165;
  } catch (_) {}

  const response = await fetch(
    `https://d2dy88a4l687h9.cloudfront.net/accounts/accountinfo/${userId}/`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      }
    }
  );

  if (!response.ok) {
    console.error("Error obteniendo account:", response.status);
    return null;
  }

  return await response.json();
}

/* ============================
   COMPONENTE PRINCIPAL
============================ */

export default function MiADN() {

  const navigate = useNavigate();

  /* ============================
     ESTADOS PRINCIPALES
  ============================ */

  const [blobTab, setBlobTab] = useState("clave");
  const [infoTooltip, setInfoTooltip] = useState(false);
  const [obert, setObert] = useState(false);
  const [metasAbierto, setMetasAbierto] = useState(false);
  const [madurezAbierto, setMadurezAbierto] = useState(false);
  const [madurezCategoria, setMadurezCategoria] = useState("clave");
  const [madurezActiva, setMadurezActiva] = useState(null);

  const [goals, setGoals] = useState([]);
  const [evaluacionHecha, setEvaluacionHecha] = useState(false);

  const [vistaCompetencias, setVistaCompetencias] = useState("blob");
  const [radarData, setRadarData] = useState(null);
  const [pieData, setPieData] = useState([]);

  /* ============================
     FILTROS RADAR
  ============================ */

  const [grupoSeleccionado, setGrupoSeleccionado] = useState("");
  const [alcance, setAlcance] = useState("");
  const [benchmark, setBenchmark] = useState("");
  const [benchmarkSeleccionados, setBenchmarkSeleccionados] = useState([]); // ["1","2","all",...]
  const [benchmarkData, setBenchmarkData] = useState({}); // {level: data[]}
  const [benchmarkModalAbierto, setBenchmarkModalAbierto] = useState(false);

  /* ============================
     COMPETENCIAS CLAVE DEL USUARIO
  ============================ */

  const [competenciasClave, setCompetenciasClave] = useState([]);

  /* ============================
     ESTADOS VARIOS
  ============================ */

  const [estadoMetas, setEstadoMetasState] = useState(() => {
    try {
      const saved = localStorage.getItem("estadoMetas");
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const setEstadoMetas = (updater) => {
    setEstadoMetasState(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      try { localStorage.setItem("estadoMetas", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const metasCompletadas = goals.filter(g => {
    const key = g.id ?? g.name;
    return g.status === "done" || estadoMetas[key]?.completada === true;
  });

  const [iniciada, setIniciada] = useState(false);
  const [completada, setCompletada] = useState(false);
  const [quizHecho, setQuizHecho] = useState(false);
  const [mostrarMadurez, setMostrarMadurez] = useState(false);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [popupMeta, setPopupMeta] = useState(false);
  const [metaSeleccionada, setMetaSeleccionada] = useState(null);

  /* ============================
     ESTADOS PARA EL BLOB (DESPLEGABLES)
  ============================ */

  /* ============================
     GRUPOS OFICIALES
  ============================ */

  const gruposOficiales = [
    "Gestión del talento",
    "Automatización y eficiencia",
    "Trabajo en equipo y colaboración",
    "Gestión de relaciones",
    "Inteligencia artificial",
    "Finanzas y ROI",
    "Gestión de proyectos ágiles",
    "Análisis de datos y toma de decisiones",
    "Data management",
    "Gestión de riesgos",
    "Pensamiento estratégico y visión global"
  ];

  /* ============================
     CARGA DE METAS
  ============================ */

  useEffect(() => {
    async function loadInitialGoals() {
      const data = await getGoalsList();
      setGoals(data);
    }
    loadInitialGoals();
  }, []);

  /* ============================
     CARGA PIE CHART + COMPETENCIAS CLAVE
  ============================ */

  useEffect(() => {
    if (!madurezAbierto) return;

    async function loadPieChart() {
      try {
        const data = await getPieChart();
        setPieData(data);

        const account = await getUserAccount();

        if (account?.capacity && data) {
          const claves = data
            .filter(d => account.capacity.includes(d.capacity))
            .map(d => d.capacity_group)
            .filter(Boolean);

          const unicas = [...new Set(claves)];

          setCompetenciasClave(unicas);
        }

      } catch (e) {
        console.error("Error cargando pie chart:", e);
      }
    }

    loadPieChart();
  }, [madurezAbierto]);

  useEffect(() => {
    if (obert) {
      addNotificacion({
        titulo: "Has abierto tu Mi ADN",
        texto: "Estás revisando tus competencias clave y complementarias.",
        tipo: "info"
      });
    }
  }, [obert]);

  useEffect(() => {
    async function loadDades() {
      try {
        const data = await getRadarData();
        setRadarData(data);

        const account = await getUserAccount();
        if (account?.capacity && data) {
          setCompetenciasClave(account.capacity);
        }
      } catch (e) {
        console.error("Error cargando datos:", e);
      }
    }
    loadDades();
  }, []);

  /* ============================
     BENCHMARK
  ============================ */

  const BENCHMARK_OPCIONS = [
    { key: "1", label: "Nivel 1" },
    { key: "2", label: "Nivel 2" },
    { key: "3", label: "Nivel 3" },
    { key: "4", label: "Nivel 4" },
    { key: "5", label: "Nivel 5" },
    { key: "all", label: "Cross-Level (All)" },
  ];

  const BENCHMARK_COLORS = {
    "1": { border: "#f87171", bg: "rgba(248,113,113,0.15)" },
    "2": { border: "#fb923c", bg: "rgba(251,146,60,0.15)" },
    "3": { border: "#facc15", bg: "rgba(250,204,21,0.15)" },
    "4": { border: "#4ade80", bg: "rgba(74,222,128,0.15)" },
    "5": { border: "#22d3ee", bg: "rgba(34,211,238,0.15)" },
    "all": { border: "#e879f9", bg: "rgba(232,121,249,0.15)" },
  };

  async function toggleBenchmark(key) {
    if (benchmarkSeleccionados.includes(key)) {
      // Quitar
      setBenchmarkSeleccionados(prev => prev.filter(k => k !== key));
      setBenchmarkData(prev => { const n = {...prev}; delete n[key]; return n; });
    } else {
      // Añadir - cargar datos
      setBenchmarkSeleccionados(prev => [...prev, key]);
      const data = await getBenchmarkData(key);
      if (data) {
        setBenchmarkData(prev => ({ ...prev, [key]: data }));
      }
    }
  }

  // Labels orbitals: competencias clave + grups amb valor del radar
  const etiquetesOrbitals = React.useMemo(() => {
    const etiquetes = [];

    // Competencias clave de l'usuari
    competenciasClave.forEach(c => {
      etiquetes.push({ text: c, tipus: "clave" });
    });

    // Grups del radar amb valor > 0 (que no siguin ja clave)
    if (radarData) {
      const grupsAmVal = [...new Set(
        radarData
          .filter(d => Number(d.value) > 0)
          .map(d => d.capacity_group)
          .filter(Boolean)
      )];
      grupsAmVal.forEach(g => {
        if (!etiquetes.some(e => e.text === g)) {
          etiquetes.push({ text: g, tipus: "grup" });
        }
      });
    }

    return etiquetes;
  }, [competenciasClave, radarData]);

  // Posicions orbitals ciclant entre les 6 disponibles
  const POSICIONS = ["pos-top", "pos-tr", "pos-right", "pos-bottom", "pos-tl", "pos-left"];

  // Grups del radar per mostrar al blob obert (agrupats per capacity_group)
  const grupsPerBlob = React.useMemo(() => {
    if (!radarData) return {};
    const grups = {};
    radarData
      .filter(d => Number(d.value) > 0)
      .forEach(d => {
        const g = d.capacity_group || "Otros";
        if (!grups[g]) grups[g] = [];
        grups[g].push({ capacity: d.capacity, value: Number(d.value) });
      });
    return grups;
  }, [radarData]);

  const grupsPerClave = React.useMemo(() => {
    if (!radarData || !competenciasClave.length) return {};
    const grups = {};
    competenciasClave.forEach(c => {
      const entry = radarData.find(d => d.capacity === c);
      const g = entry?.capacity_group || "Otros";
      const value = entry ? Number(entry.value) : 0;
      if (!grups[g]) grups[g] = [];
      grups[g].push({ capacity: c, value });
    });
    return grups;
  }, [radarData, competenciasClave]);

  const [ordreTitols, setOrdreTitols] = useState([]);
  const [indexTitol, setIndexTitol] = useState(0);
  const [visible, setVisible] = useState(false);

  function shuffle(array) {
    return [...array].sort(() => Math.random() - 0.5);
  }

  useEffect(() => {
    if (obert) return;
    if (etiquetesOrbitals.length === 0) return;

    if (ordreTitols.length === 0) {
      setOrdreTitols(shuffle(etiquetesOrbitals));
      setIndexTitol(0);
      return;
    }

    const fadeInTimeout = setTimeout(() => setVisible(true), 50);
    const fadeOutTimeout = setTimeout(() => setVisible(false), 1500);

    const nextTimeout = setTimeout(() => {
      const nextIndex = indexTitol + 1;
      if (nextIndex >= ordreTitols.length) {
        setOrdreTitols(shuffle(etiquetesOrbitals));
        setIndexTitol(0);
      } else {
        setIndexTitol(nextIndex);
      }
    }, 2500);

    return () => {
      clearTimeout(fadeInTimeout);
      clearTimeout(fadeOutTimeout);
      clearTimeout(nextTimeout);
    };
  }, [obert, ordreTitols, indexTitol, etiquetesOrbitals]);

  /* ============================
     FILTRO RADAR (MODIFICADO)
  ============================ */

  const competenciasFiltradas = (() => {
    if (!radarData) return [];

    const hayFiltrosActivos =
      Boolean(alcance) ||
      Boolean(grupoSeleccionado) ||
      benchmarkSeleccionados.length > 0;

    if (!hayFiltrosActivos) return [];

    let result = radarData.filter(d => Number(d.value) > 0);

    if (alcance === "clave") {
      const existentes = radarData.filter(d => competenciasClave.includes(d.capacity));
      const faltantes = competenciasClave
        .filter(c => !existentes.some(e => e.capacity === c))
        .map(c => ({ capacity: c, value: 0, capacity_group: null }));
      result = [...existentes, ...faltantes];
    } else if (alcance === "secundaria") {
      result = radarData.filter(d =>
        Number(d.value) > 0 && !competenciasClave.includes(d.capacity)
      );
    }

    if (grupoSeleccionado) {
      result = result.filter(
        d => d.capacity_group?.toLowerCase() === grupoSeleccionado.toLowerCase()
      );
    }

    return result;
  })();

  const grupos =
    radarData && radarData.length > 0
      ? gruposOficiales.filter(g =>
          radarData.some(
            d =>
              d.capacity_group?.toLowerCase() === g.toLowerCase() &&
              Number(d.value) > 0
          )
        )
      : [];

  /* ============================
     RENDER HASTA ANTES DE MIS METAS
  ============================ */

  return (
    <div className="miadn-page">

      {/* TOP BAR: título + swap */}
      <div className="miadn-top-bar">
        <h2 className="miadn-top-title">Mis competencias</h2>
        <div className="miadn-top-actions">
          <button
            className="swap-btn"
            onClick={() =>
              setVistaCompetencias(
                vistaCompetencias === "blob" ? "radar" : "blob"
              )
            }
          >
            {vistaCompetencias === "blob" ? "Ver radar" : "Ver blob"}
          </button>
        </div>
      </div>

      {/* ============================
          VISTA BLOB (HARDCODE)
      ============================ */}

      {vistaCompetencias === "blob" && (
        <div className="blob-wrapper blob-mode">

          <motion.div
            className={`blob-unic ${obert ? "obert" : ""}`}
            layout={false}
            onClick={() => {
  if (!obert) setObert(true);
}}

            animate={
              obert
                ? {
                    scale: 1,
                    x: 0,
                    y: 0,
                    borderRadius: "20px",
                    transition: { duration: 0.35, ease: "easeOut" }
                  }
                : {
                    scale: 1.1,
                    borderRadius: [
                      "70% 30% 60% 40% / 55% 75% 25% 45%",
                      "50% 65% 80% 20% / 70% 35% 65% 30%",
                      "82% 18% 55% 45% / 45% 80% 35% 60%",
                      "60% 40% 72% 28% / 75% 55% 35% 25%"
                    ],
                    x: [0, 20, -20, 10, 0],
                    y: [0, -15, 10, -10, 0]
                  }
            }
            transition={{
              duration: obert ? 0.35 : 6,
              repeat: obert ? 0 : Infinity,
              ease: "easeInOut"
            }}
          >

            {!obert && ordreTitols.length > 0 && visible && (
              <div
                className={`titol-orbital ${POSICIONS[indexTitol % POSICIONS.length]} visible ${ordreTitols[indexTitol]?.tipus === "clave" ? "orbital-clave" : ""}`}
              >
                <span className="titol-text">
                  {ordreTitols[indexTitol]?.text}
                </span>
              </div>
            )}

            {!obert && (
              <motion.div className="blob-title">
                <span className="blob-mi">Mi</span>
                <span className="blob-adn">ADN</span>
              </motion.div>
            )}

            {obert && (
              <div className="blob-grid">

                {/* X dins el rectangle, cantonada superior dreta */}
                <button
                  className="blob-close-btn"
                  onClick={e => { e.stopPropagation(); setObert(false); }}
                >✕</button>

                <div className="blob-tabs blob-tabs-single">
  <button
    className="blob-tab blob-tab-actiu blob-tab-toggle"
    onClick={e => {
      e.stopPropagation();
      setBlobTab(prev => (prev === "clave" ? "secundaria" : "clave"));
      setInfoTooltip(false);
    }}
  >
    {blobTab === "clave" ? "Competencias clave" : "Competencias secundarias"}
  </button>
</div>

                {!radarData ? (
                  <p className="blob-loading">Cargando competencias...</p>
                ) : blobTab === "clave" ? (
                  <>
                    {/* Primera secció amb ⓘ alineat a la dreta */}
                    {competenciasClave.length > 0 ? (
                      Object.entries(grupsPerClave).map(([grup, caps], idx) => (
                        <div key={grup} className="blob-section-full">
                          {idx === 0 ? (
                            <div className="blob-section-header-row">
                              <h3 className="blob-section-title">{grup}</h3>
                              <div style={{position:"relative"}}>
                                <button
                                  className="blob-info-btn"
                                  onClick={e => { e.stopPropagation(); setInfoTooltip(v => !v); }}
                                >
                                  <span className="blob-info-icon">i</span>
                                </button>
                                {infoTooltip && (
                                  <div className="blob-info-tooltip">
                                    Competencias requeridas por tu empresa para desempeñarte de forma óptima en tu rol.
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <h3 className="blob-section-title">{grup}</h3>
                          )}
                          <div className="blob-tags">
                            {caps.map((c, i) => (
                              <span key={i} className="blob-tag blob-tag-clave">
                                {c.capacity}
                                <span className="blob-tag-val blob-tag-val-clave">{parseFloat(Number(c.value).toFixed(2))}%</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="blob-loading">No tienes competencias clave asignadas.</p>
                    )}
                  </>
                ) : (
                  <>
                    {Object.entries(grupsPerBlob).map(([grup, caps], idx) => {
                      const secundarias = caps.filter(c => !competenciasClave.includes(c.capacity));
                      if (secundarias.length === 0) return null;
                      return (
                        <div key={grup} className="blob-section-full">
                          {idx === 0 ? (
                            <div className="blob-section-header-row">
                              <h3 className="blob-section-title">{grup}</h3>
                              <div style={{position:"relative"}}>
                                <button
                                  className="blob-info-btn"
                                  onClick={e => { e.stopPropagation(); setInfoTooltip(v => !v); }}
                                >
                                  <span className="blob-info-icon">i</span>
                                </button>
                                {infoTooltip && (
                                  <div className="blob-info-tooltip">
                                    Competencias desarrolladas de forma indirecta, no incluidas en las clave. Son fruto de los contenidos explorados, metas y desafíos completados.
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <h3 className="blob-section-title">{grup}</h3>
                          )}
                          <div className="blob-tags">
                            {secundarias
                              .sort((a, b) => b.value - a.value)
                              .map((c, i) => (
                                <span key={i} className="blob-tag blob-tag-complementaria">
                                  {c.capacity}
                                  <span className="blob-tag-val">{parseFloat(Number(c.value).toFixed(2))}%</span>
                                </span>
                              ))}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}

              </div>
            )}

          </motion.div>
        </div>
      )}


      {/* ============================
          VISTA RADAR
      ============================ */}

      {vistaCompetencias === "radar" && (
        <div className="radar-wrapper-clean">

          {/* LAYOUT: FILTROS IZQUIERDA + RADAR DERECHA */}
          <div className="radar-layout">

            {/* PANEL DE FILTROS — siempre visible a la izquierda */}
            <div className="radar-filtros-panel">

              {/* ALCANCE — primer */}
              <div className="filtro-block">
                <label>Alcance</label>
                <select
                  value={alcance}
                  onChange={e => { setAlcance(e.target.value); setGrupoSeleccionado(""); }}
                >
                  <option value="">Seleccionar</option>
                  <option value="clave">Competencias clave</option>
                  <option value="secundaria">Competencias complementarias</option>
                </select>
              </div>

              {/* GRUPO — sempre visible */}
              <div className="filtro-block">
                <label>Grupo de competencia</label>
                <select
                  value={grupoSeleccionado}
                  onChange={e => setGrupoSeleccionado(e.target.value)}
                >
                  <option value="">Seleccionar</option>
                  {grupos.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              {/* BENCHMARK */}
              <div className="filtro-block">
                <label>Benchmark</label>
                <select
                  value=""
                  onChange={e => { if (e.target.value) toggleBenchmark(e.target.value); }}
                >
                  <option value="">Seleccionar</option>
                  {BENCHMARK_OPCIONS.map(({ key, label }) => (
                    <option key={key} value={key}>
                      {benchmarkSeleccionados.includes(key) ? `✓ ${label}` : label}
                    </option>
                  ))}
                </select>
                {benchmarkSeleccionados.length > 0 && (
                  <div className="benchmark-chips">
                    {benchmarkSeleccionados.map(k => (
                      <span
                        key={k}
                        className="benchmark-chip"
                        style={{ borderColor: BENCHMARK_COLORS[k].border, color: BENCHMARK_COLORS[k].border }}
                        onClick={() => toggleBenchmark(k)}
                      >
                        {BENCHMARK_OPCIONS.find(o => o.key === k)?.label} ✕
                      </span>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* RADAR */}
            <div className="radar-area">
               {!competenciasFiltradas.length ? (
                <p className="radar-placeholder-text">
                  {(alcance || grupoSeleccionado || benchmarkSeleccionados.length > 0)
                    ? "No hay datos para mostrar con los filtros actuales."
                    : "Selecciona al menos un filtro para ver tus competencias."
                  }
                </p>
              ) : (
                <RadarReal
                  data={competenciasFiltradas}
                  benchmarkData={benchmarkData}
                  benchmarkColors={BENCHMARK_COLORS}
                  benchmarkOpcions={BENCHMARK_OPCIONS}
                />
              )}
            </div>

          </div>

        </div>
      )}
  

{/* MIS METAS */}
<div
  className="miadn-section metas-caja"
  onClick={() => setMetasAbierto(!metasAbierto)}
>
  <div className="metas-header">
    <div>
      <h2>Mis metas</h2>
      <p className="metas-sub">
        {goals.length > 0
          ? `${metasCompletadas.length} de ${goals.length} completadas`
          : "0 metas"}
      </p>
    </div>

    <span className={`flecha ${metasAbierto ? "abierta" : ""}`}>›</span>
  </div>

  {metasAbierto && goals.length > 0 && (
    <div className="meta-detalle-vertical">

      {goals.map((meta, index) => {
        const metaKey = meta.id ?? meta.name ?? index;
        const estado = estadoMetas[metaKey] || {
          iniciada: false,
          completada: false,
          quizHecho: false
        };

        return (
          <div key={index} className="meta-bloque">

            {/* LÍNEA SUPERIOR */}
            <div className="meta-linea1">
              <h3 className="meta-titulo">{meta.name}</h3>

              <p className="meta-fecha">
                {(() => {
                  const fecha = meta.expiration_date;
                  if (!fecha) return "Sin fecha";
                  const d = new Date(fecha);
                  if (isNaN(d)) return "Sin fecha";
                  return d.toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric"
                  });
                })()}
              </p>
            </div>

            {/* LÍNEA INFERIOR */}
            <div className="meta-linea2">

              {/* 1 — PLAY (ABRE POPUP) */}
              <button
                className={`btn-icono circulo ${
                  estado.completada
                    ? "verde"
                    : estado.iniciada
                    ? "amarillo"
                    : ""
                }`}
                onClick={e => {
                  e.stopPropagation();
                  setMetaSeleccionada(meta);
                  setPopupMeta(true);
                }}
              >
                <span className="icono-iniciar"></span>
              </button>

              {/* 2 — TIC */}
              <button
                className={`btn-icono circulo ${
                  estado.completada ? "verde" : ""
                }`}
                onClick={e => {
                  e.stopPropagation();
                  if (!estado.iniciada) return;
                  setEstadoMetas(prev => ({
                    ...prev,
                    [metaKey]: {
                      ...prev[metaKey],
                      completada: true
                    }
                  }));
                }}
              >
                <span className="icono-finalizar"></span>
              </button>

              {/* 3 — QUIZ */}
              <button
                className={`btn-icono circulo ${
                  !estado.completada ? "desactivado" : ""
                }`}
                disabled={!estado.completada}
                onClick={e => {
                  e.stopPropagation();
                  if (!estado.completada) return;
                  setEstadoMetas(prev => ({
                    ...prev,
                    [metaKey]: {
                      ...prev[metaKey],
                      quizHecho: true
                    }
                  }));
                }}
              >
                <span className="icono-pregunta"></span>
              </button>

              {/* 4 — CERTIFICADO */}
              <button
                className={`btn-icono circulo ${
                  !estado.quizHecho ? "desactivado" : ""
                }`}
                disabled={!estado.quizHecho}
                onClick={e => {
                  e.stopPropagation();
                  if (estado.quizHecho) console.log("Descargar certificado");
                }}
              >
                <span className="icono-certificado"></span>
              </button>

              

            </div>
          </div>
        );
      })}

    </div>
  )}
</div>

{/* POPUP REALIZAR META */}
{popupMeta && (
  <div className="popup-overlay" onClick={() => setPopupMeta(false)}>
    <div className="popup-contenido" onClick={e => e.stopPropagation()}>
      <h3 className="popup-titulo">Realizar esta meta</h3>
      <p className="popup-texto">
        ¿Quieres empezar la meta "{metaSeleccionada?.name}" ahora?
      </p>

      <div className="popup-botones">
        <button
          className="popup-realizar"
          onClick={() => {
            const metaKey = metaSeleccionada?.id ?? metaSeleccionada?.name;
            if (metaKey) {
              setEstadoMetas(prev => ({
                ...prev,
                [metaKey]: { ...prev[metaKey], iniciada: true }
              }));
            }
            navigate("/explorar", {
              state: { metaParaIniciar: metaSeleccionada }
            });
            setPopupMeta(false);
          }}
        >
          Realizar ahora
        </button>

        <button
          className="popup-cancelar"
          onClick={() => setPopupMeta(false)}
        >
          Mejor más tarde
        </button>
      </div>
    </div>
  </div>
)}


{/* MADUREZ DIGITAL */}
<div className="miadn-section madurez-caja">

  <div className="metas-header">
    <div>
      <h2>Madurez digital</h2>
      <p className="metas-sub">Estado general de tus competencias digitales</p>
    </div>

    <span
      className={`flecha ${madurezAbierto ? "abierta" : ""}`}
      onClick={() => setMadurezAbierto(!madurezAbierto)}
    >
      ›
    </span>
  </div>

  {madurezAbierto && (
    <div className="madurez-filtros">

      {/* FILTRO 1 — CATEGORIA */}
      <label className="madurez-label">Selecciona una categoría</label>
      <select
        className="madurez-select"
        value={madurezCategoria || ""}
        onChange={(e) => {
          setMadurezCategoria(e.target.value);
          setMadurezActiva(null);
          setMostrarMadurez(false);
        }}
      >
        <option value="">Selecciona</option>
        <option value="clave">Competencias clave</option>
        <option value="secundaria">Competencias complementarias</option>
      </select>

      {/* FILTRO 2 — COMPETENCIA */}
      {madurezCategoria && (
        <>
          <label className="madurez-label">Selecciona una competencia</label>
          <select
            className="madurez-select"
            value={madurezActiva || ""}
            onChange={(e) => {
              setMadurezActiva(e.target.value);
              setMostrarMadurez(true);
            }}
          >
            <option value="">Selecciona</option>
            <option value="todas">Todas</option>

            {madurezCategoria === "clave" && competenciasClave.map((c, i) => (
              <option key={i} value={c}>{c}</option>
            ))}

            {madurezCategoria === "secundaria" && radarData
              ?.filter(d => Number(d.value) > 0 && !competenciasClave.includes(d.capacity))
              .sort((a, b) => b.value - a.value)
              .map((d, i) => (
                <option key={i} value={d.capacity}>{d.capacity}</option>
              ))
            }
          </select>
        </>
      )}

      {/* RESULTADO */}
      {mostrarMadurez && madurezActiva && (() => {
        // Llista de competències a mostrar
        let caps = [];
        if (madurezActiva === "todas") {
          if (madurezCategoria === "clave") {
            caps = competenciasClave.map(c => {
              const e = radarData?.find(d => d.capacity === c);
              return { name: c, val: e ? Number(e.value) : 0 };
            });
          } else {
            caps = (radarData || [])
              .filter(d => Number(d.value) > 0 && !competenciasClave.includes(d.capacity))
              .sort((a, b) => b.value - a.value)
              .map(d => ({ name: d.capacity, val: Number(d.value) }));
          }
        } else {
          const e = radarData?.find(d => d.capacity === madurezActiva);
          caps = [{ name: madurezActiva, val: e ? Number(e.value) : 0 }];
        }

        return (
          <div className="madurez-resultado">
            {caps.map((c, i) => (
              <div key={i} className="madurez-hija3">
                <span className="madurez-hija3-nom">{c.name}</span>
                <span className="madurez-porcentaje">{parseFloat(Number(c.val).toFixed(2))}%</span>
                <div className="madurez-bar">
                  <div className="madurez-bar-fill" style={{ width: c.val + "%" }}></div>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

    </div>
  )}
</div>

<BottomBar active="miadn" />

{/* MODAL BENCHMARK */}
{benchmarkModalAbierto && (
  <div className="benchmark-modal-overlay" onClick={() => setBenchmarkModalAbierto(false)}>
    <div className="benchmark-modal" onClick={e => e.stopPropagation()}>
      <div className="benchmark-modal-header">
        <h3>Selecciona niveles de Benchmark</h3>
        <button onClick={() => setBenchmarkModalAbierto(false)}>✕</button>
      </div>
      <p className="benchmark-modal-sub">Puedes seleccionar varios niveles a la vez</p>
      <div className="benchmark-modal-opcions">
        {BENCHMARK_OPCIONS.map(({ key, label }) => {
          const actiu = benchmarkSeleccionados.includes(key);
          const color = BENCHMARK_COLORS[key];
          return (
            <div
              key={key}
              className={`benchmark-opcio ${actiu ? "actiu" : ""}`}
              style={actiu ? { borderColor: color.border, background: color.bg } : {}}
              onClick={() => toggleBenchmark(key)}
            >
              <span className="benchmark-opcio-dot" style={{ background: color.border }} />
              <span>{label}</span>
              {actiu && <span className="benchmark-opcio-check">✓</span>}
            </div>
          );
        })}
      </div>
      <button className="benchmark-modal-ok" onClick={() => setBenchmarkModalAbierto(false)}>
        Aplicar
      </button>
    </div>
  </div>
)}

</div>
);
}
