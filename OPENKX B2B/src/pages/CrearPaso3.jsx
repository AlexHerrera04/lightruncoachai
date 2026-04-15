import React, { useState, useEffect, useRef } from "react";
import "../styles/crear.css";
import BottomBar from "../components/BottomBar";
import { useNavigate } from "react-router-dom";
import ConfirmacionPublicacion from "../components/ConfirmacionPublicacion";

async function getAllCapacities() {
  const token = localStorage.getItem("accessToken");
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
  if (!response.ok) return [];
  return await response.json();
}

export default function CrearPaso3() {
  const navigate = useNavigate();

  const [busqueda, setBusqueda] = useState("");
  const [competencias, setCompetencias] = useState([]);
  const [nivel, setNivel] = useState("");
  const [funcion, setFuncion] = useState("");
  const [visibilidad, setVisibilidad] = useState("empresa");
  const [publicado, setPublicado] = useState(false);

  const [todasCapacidades, setTodasCapacidades] = useState([]);
  const [sugerencias, setSugerencias] = useState([]);
  const [dropdownAbierto, setDropdownAbierto] = useState(false);
  const [loadingCaps, setLoadingCaps] = useState(false);

  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setLoadingCaps(true);
    getAllCapacities()
      .then(data => {
        const lista = Array.isArray(data) ? data : [];
        setTodasCapacidades(lista);
      })
      .finally(() => setLoadingCaps(false));
  }, []);

  useEffect(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) {
      setSugerencias([]);
      setDropdownAbierto(false);
      return;
    }
    const filtradas = todasCapacidades
      .filter(c => c.capacity?.toLowerCase().includes(q))
      .filter(c => !competencias.includes(c.capacity))
      .slice(0, 8);
    setSugerencias(filtradas);
    setDropdownAbierto(filtradas.length > 0);
  }, [busqueda, todasCapacidades, competencias]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        inputRef.current && !inputRef.current.contains(e.target)
      ) {
        setDropdownAbierto(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const seleccionarCompetencia = (cap) => {
    if (!competencias.includes(cap.capacity)) {
      setCompetencias(prev => [...prev, cap.capacity]);
    }
    setBusqueda("");
    setSugerencias([]);
    setDropdownAbierto(false);
    inputRef.current?.focus();
  };

  const eliminarCompetencia = (c) => {
    setCompetencias(prev => prev.filter(x => x !== c));
  };

  if (publicado) {
    return <ConfirmacionPublicacion />;
  }

  return (
    <div className="crear-page">

      <h1 className="crear-title">Crear Contenido</h1>
      <p className="crear-subtitle">Comparte tu conocimiento</p>

      <div className="crear-steps">
        <span className="step">1</span>
        <span className="step">2</span>
        <span className="step active">3</span>
      </div>

      <div className="form-box">

        {/* COMPETENCIAS */}
        <label>
          <span>Competencias</span>

          <div className="competencia-search-wrapper">
            <input
              ref={inputRef}
              type="text"
              className="input-competencia"
              placeholder={loadingCaps ? "Cargando competencias..." : "Busca una competencia..."}
              value={busqueda}
              disabled={loadingCaps}
              onChange={(e) => setBusqueda(e.target.value)}
              onFocus={() => sugerencias.length > 0 && setDropdownAbierto(true)}
              autoComplete="off"
            />

            {dropdownAbierto && (
              <ul className="competencia-dropdown" ref={dropdownRef}>
                {sugerencias.map((c, i) => (
                  <li
                    key={i}
                    className="competencia-dropdown-item"
                    onMouseDown={() => seleccionarCompetencia(c)}
                  >
                    <span className="dropdown-cap-name">{c.capacity}</span>
                    {c.capacity_group && (
                      <span className="dropdown-cap-group">{c.capacity_group}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={`competencia-list ${competencias.length === 0 ? "vacia" : ""}`}>
            {competencias.map((c, i) => (
              <span key={i} className="competencia-tag">
                {c}
                <button
                  className="competencia-tag-remove"
                  onClick={() => eliminarCompetencia(c)}
                  type="button"
                >×</button>
              </span>
            ))}
          </div>
        </label>

        {/* NIVEL */}
        <label>
          <span>Nivel de Audiencia</span>
          <input
            type="number"
            min="0"
            max="5"
            className="input-nivel"
            placeholder="0-5 (1: Level-C, 5: Junior, 0: Todos)"
            value={nivel}
            onChange={(e) => setNivel(e.target.value)}
          />
        </label>

        {/* FUNCIÓN */}
        <label>
          <span>Función / Área</span>
          <select
            className="select-funcion"
            value={funcion}
            onChange={(e) => setFuncion(e.target.value)}
          >
            <option value="">Selecciona una opción</option>
            <option value="marketing">Marketing</option>
            <option value="tecnologia">Tecnología</option>
            <option value="ventas">Ventas</option>
            <option value="rrhh">Recursos Humanos</option>
            <option value="finanzas">Finanzas</option>
          </select>
        </label>

        {/* VISIBILIDAD */}
        <label>
          <span>Visibilidad</span>
          <div className="visibility-segmented">
            <button
              className={visibilidad === "empresa" ? "seg-item active" : "seg-item"}
              onClick={() => setVisibilidad("empresa")}
            >
              Empresa
            </button>
            <button className="seg-item disabled" disabled>Limitado</button>
            <button className="seg-item disabled" disabled>Público</button>
          </div>
        </label>

        {/* BOTONES */}
        <div className="form-buttons">
          <button className="atras-btn" onClick={() => navigate("/crear/paso2")}>
            Atrás
          </button>
          <button
            className="siguiente-btn"
            disabled={competencias.length === 0 || !funcion}
            style={(competencias.length === 0 || !funcion) ? { opacity: 0.45, cursor: "not-allowed" } : {}}
            onClick={() => setPublicado(true)}
          >
            Publicar
          </button>
        </div>
      </div>

      <BottomBar active="crear" />
    </div>
  );
}
