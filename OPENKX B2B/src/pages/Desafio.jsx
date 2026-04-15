import React, { useState, useEffect, useRef } from 'react';
import '../styles/desafio.css';
import { useNavigate } from 'react-router-dom';
import BottomBar from '../components/BottomBar';

export default function Desafio() {
  const navigate = useNavigate();
  const [mostrarPregunta, setMostrarPregunta] = useState(false);
  const [preguntaActual, setPreguntaActual] = useState(0);
  const [finalizado, setFinalizado] = useState(false);
  const [mute, setMute] = useState(false);

  const [seleccion, setSeleccion] = useState(null);
  const [tiempoRestante, setTiempoRestante] = useState(30);

  // Meta semanal del perfil
  const frecDesafio = parseInt(localStorage.getItem("frecDesafio")) || 5;
  const numPreguntas = parseInt(localStorage.getItem("numPreguntas")) || 5;
  const metaSemanal = frecDesafio * numPreguntas;
  const scoreActual = 30; // setmanal, hardcoded per ara
  const scoreTotal = 245; // total acumulat, hardcoded per ara
  const percentatge = Math.min(Math.round((scoreActual / metaSemanal) * 100), 100);
  const radi = 78;
  const circumferencia = 2 * Math.PI * radi;
  const dashOffset = circumferencia - (percentatge / 100) * circumferencia;

  const audioRef = useRef(null);

  const preguntas = [
    {
      texto: "¿Cuál es la principal ventaja de usar metodologías ágiles en proyectos digitales?",
      opciones: [
        "Mayor documentación del proyecto",
        "Adaptabilidad y respuesta rápida a cambios",
        "Menor costo inicial",
        "Equipos más grandes",
        "Menos reuniones de equipo"
      ]
    },
    {
      texto: "¿Qué tecnología es clave en la Transformación Digital?",
      opciones: [
        "Fax corporativo",
        "Inteligencia Artificial",
        "Archivadores físicos",
        "Teléfonos fijos",
        "Proyectores analógicos"
      ]
    },
    {
      texto: "¿Qué significa UX?",
      opciones: [
        "User Xperience",
        "Ultra Experience",
        "User Experience",
        "Unified Experience",
        "Unique Xperience"
      ]
    },
    {
      texto: "¿Qué ventaja aporta el trabajo en la nube?",
      opciones: [
        "Acceso desde cualquier lugar",
        "Mayor peso de archivos",
        "Menos seguridad",
        "Solo funciona offline",
        "Requiere hardware especial"
      ]
    },
    {
      texto: "¿Qué es un KPI?",
      opciones: [
        "Un tipo de servidor",
        "Un indicador clave de rendimiento",
        "Un lenguaje de programación",
        "Un formato de archivo",
        "Un protocolo de red"
      ]
    },
    {
      texto: "¿Cuál es el objetivo principal del Design Thinking?",
      opciones: [
        "Reducir costes de producción",
        "Resolver problemas centrados en el usuario",
        "Automatizar procesos repetitivos",
        "Crear documentación técnica",
        "Gestionar bases de datos"
      ]
    },
    {
      texto: "¿Qué es el Big Data?",
      opciones: [
        "Un sistema operativo",
        "El análisis de grandes volúmenes de datos",
        "Un tipo de hardware",
        "Una red social corporativa",
        "Un lenguaje de programación"
      ]
    },
    {
      texto: "¿Qué caracteriza a un equipo multidisciplinar?",
      opciones: [
        "Todos tienen el mismo rol",
        "Miembros con diferentes habilidades y perfiles",
        "Solo trabajan de forma remota",
        "No necesitan comunicación",
        "Tienen un único líder sin colaboración"
      ]
    },
    {
      texto: "¿Qué es el feedback continuo en un entorno de trabajo?",
      opciones: [
        "Evaluar solo al final del año",
        "Comunicación constante sobre el rendimiento y mejoras",
        "Enviar correos masivos",
        "Ignorar los errores del equipo",
        "Reunirse solo cuando hay problemas"
      ]
    },
    {
      texto: "¿Qué significa ROI?",
      opciones: [
        "Red de Operaciones Internas",
        "Retorno de la Inversión",
        "Registro de Objetivos Individuales",
        "Revisión Operativa Integrada",
        "Ratio de Organización Industrial"
      ]
    }
  ];

  const totalPreguntas = preguntas.length;

  const avanzar = () => {
    if (preguntaActual < totalPreguntas - 1) {
      setPreguntaActual(preguntaActual + 1);
    } else {
      setFinalizado(true);
    }
  };

    useEffect(() => {
    if (!mostrarPregunta || finalizado) return;
    setTiempoRestante(30);
  }, [preguntaActual, mostrarPregunta, finalizado]);

  useEffect(() => {
    if (!mostrarPregunta || finalizado) return;

    if (tiempoRestante <= 0) {
      setSeleccion(null);
      avanzar();
      return;
    }

    const timer = setTimeout(() => {
      setTiempoRestante(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [tiempoRestante, mostrarPregunta, finalizado, preguntaActual]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.25;
      mute ? audioRef.current.pause() : audioRef.current.play();
    }
  }, [mute]);

  return (
    <div className="desafio-container">

      <audio ref={audioRef} src="/audio/robotscometh.mp3" loop />

      <button className="mute-btn" onClick={() => setMute(!mute)}>
        {mute ? "🔇" : "🔊"}
      </button>

      {mostrarPregunta && !finalizado && (
        <div className="encabezado">
          <span className="pregunta-num">
            Pregunta {preguntaActual + 1} de {totalPreguntas}
          </span>

          <span className={`tiempo ${tiempoRestante <= 10 ? "tiempo-alerta" : ""}`}>
  ⏱ {tiempoRestante}s
</span>

          <span className="progreso">
            {Math.round((preguntaActual / totalPreguntas) * 100)}%
          </span>
        </div>
      )}

      {!mostrarPregunta && !finalizado && (
        <div className="desafio-card">
          <div className="desafio-header">
            <h1 className="desafio-title">¡Bienvenido al Desafío Diario!</h1>
            <p className="desafio-subtitle">Pon a prueba tus conocimientos y gana puntos</p>
          </div>

          <div className="desafio-meta-wrap">
            <div className="desafio-meta-top">
              <div className="desafio-circle-wrap">
                <svg width="196" height="196" viewBox="0 0 196 196">
                  <circle cx="98" cy="98" r={radi} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="12" />
                  <circle
                    cx="98"
                    cy="98"
                    r={radi}
                    fill="none"
                    stroke="#a78bfa"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={circumferencia}
                    strokeDashoffset={dashOffset}
                    transform="rotate(-90 98 98)"
                    style={{ transition: "stroke-dashoffset 0.8s ease" }}
                  />
                </svg>
                <div className="desafio-circle-inner">
                  <span className="desafio-circle-num">{scoreActual}</span>
                  <span className="desafio-circle-label">puntos</span>
                  <div className="desafio-circle-meta">Meta: {metaSemanal}</div>
                  <div className="desafio-circle-pct">{percentatge}% completado</div>
                </div>
              </div>
            </div>

            {scoreActual < metaSemanal && (
              <button
  className="desafio-meta-cta"
  onClick={() => {
    setPreguntaActual(0);
    setSeleccion(null);
    setTiempoRestante(30);
    setMostrarPregunta(true);
  }}
>
                🎯 Aún te faltan <strong>{metaSemanal - scoreActual} puntos</strong> para tu meta — ¡completa el desafío y mantén tu racha!
              </button>
            )}
          </div>

          <div className="desafio-info">
            <h3>¿Cómo funciona?</h3>
            <ul className="funciona-lista">
              <li className="funciona funciona-0">{totalPreguntas} preguntas diarias</li>
              <li className="funciona funciona-1">30 segundos por pregunta</li>
              <li className="funciona funciona-2">1 punto por respuesta correcta</li>
              <li className="funciona funciona-3">Mantén tu racha activa</li>
            </ul>
          </div>

          <div className="desafio-footer">
           
<button
  className="comenzar-btn"
  onClick={() => {
    setPreguntaActual(0);
    setSeleccion(null);
    setTiempoRestante(30);
    setMostrarPregunta(true);
  }}
>
              Comenzar Desafío
            </button>
            <p className="comenzar-score">Score total acumulado: <strong>{scoreTotal} puntos</strong></p>
          </div>
        </div>
      )}

      {mostrarPregunta && !finalizado && (
        <div className="pregunta-activa">

          <h2 className="pregunta">{preguntas[preguntaActual].texto}</h2>

          <div className="opciones">
            {preguntas[preguntaActual].opciones.map((op, i) => (
              <button
                key={i}
                className={`opcion opcion-${i} ${seleccion === i ? "opcion-activa" : ""}`}
                onClick={() => setSeleccion(i)}
              >
                {op}
              </button>
            ))}
          </div>

          <div className="acciones">

            <button
              className="omitir"
              onClick={() => {
                setSeleccion(null);
                avanzar();
              }}
            >
              {preguntaActual === totalPreguntas - 1 ? "Finalizar" : "Omitir pregunta"}
            </button>

            <button
              className="continuar"
              disabled={seleccion === null}
              onClick={() => {
                setSeleccion(null);
                avanzar();
              }}
            >
              {preguntaActual === totalPreguntas - 1 ? "Finalizar desafío" : "Continuar"}
            </button>

          </div>
        </div>
      )}

      {finalizado && (
        <div className="pantalla-final">
          <h1 className="final-titulo">¡Buen trabajo!</h1>
          <p className="final-subtitulo">Has completado el desafío diario</p>

          <div className="final-estadisticas">

            <div>
              <span className="label">Correctas</span>
              <span className="value"><span className="value-num">3</span>&nbsp;/ {totalPreguntas}</span>
            </div>

            <div>
              <span className="label">Puntos ganados</span>
              <span className="value puntos"><span className="value-num">+3</span></span>
            </div>

            <div>
              <span className="label">Score total</span>
              <span className="value"><span className="value-num">248</span><span style={{ fontSize: "0.85rem", color: "#64748b", marginLeft: "4px" }}>puntos</span></span>
            </div>

            <div>
              <span className="label">Categoría</span>
              <span className="value categoria">🥇 Oro</span>
            </div>

            <div className="full">
              <span className="label">Racha</span>
              <span className="value"><span className="value-num">7</span><span style={{ fontSize: "0.85rem", color: "#64748b", marginLeft: "4px" }}>días 🔥</span></span>
            </div>

          </div>

          <div className="final-botones">
            <button className="revisar">Revisar errores</button>
            <button className="volver" onClick={() => navigate('/inicio')}>Volver al inicio</button>
          </div>

          <p className="final-mensaje">¡Vuelve mañana para un nuevo desafío adaptado a tu nivel!</p>
        </div>
      )}

      <BottomBar active="desafio" />
    </div>
  );
}