import React, { useEffect, useMemo, useRef, useState } from 'react';
import '../styles/desafio.css';
import { useNavigate } from 'react-router-dom';
import BottomBar from '../components/BottomBar';
import {
  createChallenge,
  getChallengeAnswerResults,
  getNewContents,
  submitChallengeAnswer
} from '../api/api';

const QUESTION_TIME_LIMIT = 30;
const DEFAULT_DIFFICULTY = ["medium", "hard"];

function getSortedQuestions(challenge) {
  return [...(challenge?.challenge_questions || [])]
    .sort((a, b) => a.sequence - b.sequence)
    .map((item) => ({
      ...item.question,
      sequence: item.sequence,
      challengeQuestionId: item.id,
      pointsAllocated: item.points_allocated ?? 1
    }));
}

function getProgressPercentage(answered, total) {
  if (!total) return 0;
  return Math.min(Math.round((answered / total) * 100), 100);
}

function getQuestionTypeLabel(questionType) {
  if (questionType === "short_answer") return "Respuesta abierta";
  if (questionType === "true_false") return "Verdadero / falso";
  return "Selección múltiple";
}

function getOptionFeedbackStyle(optionId, feedback) {
  if (!feedback) return null;

  if (optionId === feedback.correct_option_id) {
    return {
      outline: "3px solid #ffffff",
      boxShadow: "0 0 0 2px rgba(34,197,94,0.35)",
      opacity: 1
    };
  }

  if (optionId === feedback.selected_option && feedback.is_correct === false) {
    return {
      outline: "3px solid rgba(255,255,255,0.85)",
      boxShadow: "0 0 0 2px rgba(239,68,68,0.35)",
      opacity: 0.85
    };
  }

  return {
    opacity: 0.65
  };
}

async function resolveChallengeContentId() {
  try {
    const historial = JSON.parse(localStorage.getItem("historialContenidos") || "[]");
    if (Array.isArray(historial) && historial.length > 0 && historial[0]?.id) {
      return historial[0].id;
    }
  } catch {}

  const contents = await getNewContents();

  if (Array.isArray(contents) && contents.length > 0 && contents[0]?.id) {
    return contents[0].id;
  }

  throw new Error("No hay contenidos disponibles para generar el desafío");
}

export default function Desafio() {
  const navigate = useNavigate();
  const audioRef = useRef(null);

  const configuredQuestionCount = Math.max(
    parseInt(localStorage.getItem("numPreguntas"), 10) || 5,
    1
  );

  const [challenge, setChallenge] = useState(null);
  const [mostrarPregunta, setMostrarPregunta] = useState(false);
  const [preguntaActual, setPreguntaActual] = useState(0);
  const [finalizado, setFinalizado] = useState(false);
  const [mute, setMute] = useState(false);

  const [seleccion, setSeleccion] = useState(null);
  const [respuestaTexto, setRespuestaTexto] = useState("");
  const [tiempoRestante, setTiempoRestante] = useState(QUESTION_TIME_LIMIT);

  const [creandoDesafio, setCreandoDesafio] = useState(false);
  const [enviandoRespuesta, setEnviandoRespuesta] = useState(false);
  const [error, setError] = useState("");
  const [feedbackActual, setFeedbackActual] = useState(null);

  const [resultadosPorPregunta, setResultadosPorPregunta] = useState({});
  const [resultadosFinales, setResultadosFinales] = useState([]);
  const [mostrarRevision, setMostrarRevision] = useState(false);

  const preguntas = useMemo(() => getSortedQuestions(challenge), [challenge]);
  const totalPreguntas = preguntas.length || configuredQuestionCount;
  const pregunta = preguntas[preguntaActual] || null;
  const preguntasRespondidas = Object.keys(resultadosPorPregunta).length;
  const porcentajeProgreso = getProgressPercentage(preguntasRespondidas, totalPreguntas);

  const radi = 78;
  const circumferencia = 2 * Math.PI * radi;
  const dashOffset = circumferencia - (porcentajeProgreso / 100) * circumferencia;

  const resumenScore = challenge?.score || {};
  const correctas =
    typeof resumenScore.correct === "number"
      ? resumenScore.correct
      : Object.values(resultadosPorPregunta).filter((item) => item?.is_correct === true).length;

  const porcentajeAcierto =
    typeof resumenScore.percentage === "number"
      ? Math.round(resumenScore.percentage)
      : getProgressPercentage(correctas, Math.max(preguntasRespondidas, 1));

  const pendientesRevision = useMemo(() => {
    return Object.values(resultadosPorPregunta).filter((item) => item?.is_correct === null).length;
  }, [resultadosPorPregunta]);

  const reviewItems = useMemo(() => {
    const finalResultsMap = new Map(
      (Array.isArray(resultadosFinales) ? resultadosFinales : []).map((item) => [item.question, item])
    );

    return preguntas
      .map((question) => {
        const liveResult = resultadosPorPregunta[question.id];
        const finalResult = finalResultsMap.get(question.id);
        const result = liveResult || finalResult;

        if (!result) return null;

        const selectedOption = (question.options || []).find(
          (option) => option.id === result.selected_option
        );

        const correctOption = (question.options || []).find(
          (option) => option.id === result.correct_option_id
        );

        return {
          question,
          result,
          selectedOption,
          correctOption
        };
      })
      .filter(Boolean);
  }, [preguntas, resultadosPorPregunta, resultadosFinales]);

  function resetQuestionUi() {
    setSeleccion(null);
    setRespuestaTexto("");
    setFeedbackActual(null);
    setTiempoRestante(QUESTION_TIME_LIMIT);
    setError("");
  }

  function getNextPendingQuestionIndex(fromIndex) {
    if (!preguntas.length) return -1;

    for (let offset = 1; offset < preguntas.length; offset += 1) {
      const candidateIndex = (fromIndex + offset) % preguntas.length;
      const candidateQuestion = preguntas[candidateIndex];

      if (!resultadosPorPregunta[candidateQuestion.id]) {
        return candidateIndex;
      }
    }

    return -1;
  }

  async function cargarResultadosFinales(challengeId) {
    try {
      const { data } = await getChallengeAnswerResults(challengeId);
      const results = Array.isArray(data) ? data : data?.results || [];
      setResultadosFinales(results);
    } catch (err) {
      console.error("Error cargando resultados finales:", err);
    }
  }

  async function finalizarDesafio(challengeId) {
    setMostrarPregunta(false);
    setFinalizado(true);
    setFeedbackActual(null);
    setSeleccion(null);
    setRespuestaTexto("");
    await cargarResultadosFinales(challengeId);
  }

  async function comenzarDesafio() {
    setCreandoDesafio(true);
    setError("");
    setMostrarRevision(false);

    try {
      const contentId = await resolveChallengeContentId();

const challengeData = await createChallenge({
  contentId,
  difficulty: DEFAULT_DIFFICULTY,
  count: configuredQuestionCount
});

      const sortedQuestions = getSortedQuestions(challengeData);

      if (!sortedQuestions.length) {
        throw new Error("El desafío no ha devuelto preguntas");
      }

      setChallenge(challengeData);
      setResultadosPorPregunta({});
      setResultadosFinales([]);
      setPreguntaActual(0);
      setFinalizado(false);
      setMostrarPregunta(true);
      resetQuestionUi();
    } catch (err) {
      setError(err.message || "No se pudo iniciar el desafío");
    } finally {
      setCreandoDesafio(false);
    }
  }

  async function enviarRespuesta() {
    if (!pregunta || !challenge || enviandoRespuesta) return;

    const isShortAnswer = pregunta.question_type === "short_answer";
    const answerReady = isShortAnswer ? respuestaTexto.trim() : seleccion !== null;

    if (!answerReady) return;

    setEnviandoRespuesta(true);
    setError("");

    try {
      const response = await submitChallengeAnswer({
        challengeId: challenge.id,
        questionId: pregunta.id,
        selectedOptionId: isShortAnswer ? null : seleccion,
        answerText: isShortAnswer ? respuestaTexto : ""
      });

      setFeedbackActual(response);

      setResultadosPorPregunta((prev) => ({
        ...prev,
        [pregunta.id]: response
      }));

      setChallenge((prev) => ({
        ...prev,
        answered_questions: response.challenge_score?.total_answered ?? prev?.answered_questions ?? 0,
        status:
          response.challenge_score?.total_answered === prev?.total_questions
            ? "completed"
            : prev?.status,
        score: {
          correct: response.challenge_score?.correct ?? prev?.score?.correct ?? 0,
          total_graded: response.challenge_score?.total_graded ?? prev?.score?.total_graded ?? 0,
          percentage: response.challenge_score?.percentage ?? prev?.score?.percentage ?? null
        }
      }));
    } catch (err) {
      setError(err.message || "No se pudo enviar la respuesta");
    } finally {
      setEnviandoRespuesta(false);
    }
  }

  async function continuarDespuesFeedback() {
    if (!feedbackActual || !challenge) return;

    const totalAnswered = feedbackActual.challenge_score?.total_answered ?? preguntasRespondidas;

    if (totalAnswered >= preguntas.length) {
      await finalizarDesafio(challenge.id);
      return;
    }

    const nextIndex = getNextPendingQuestionIndex(preguntaActual);

    if (nextIndex === -1) {
      await finalizarDesafio(challenge.id);
      return;
    }

    setPreguntaActual(nextIndex);
    resetQuestionUi();
  }

  function omitirPregunta() {
    if (!pregunta) return;

    const nextIndex = getNextPendingQuestionIndex(preguntaActual);

    if (nextIndex === -1) {
      setError("Esta es la última pregunta pendiente. Respóndela para cerrar el desafío.");
      return;
    }

    setPreguntaActual(nextIndex);
    resetQuestionUi();
  }

  useEffect(() => {
    if (!mostrarPregunta || finalizado || feedbackActual || enviandoRespuesta || !pregunta) return;

    if (tiempoRestante <= 0) {
      omitirPregunta();
      return;
    }

    const timer = setTimeout(() => {
      setTiempoRestante((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [
    tiempoRestante,
    mostrarPregunta,
    finalizado,
    feedbackActual,
    enviandoRespuesta,
    pregunta,
    preguntaActual,
    resultadosPorPregunta
  ]);

  useEffect(() => {
    if (!audioRef.current) return;

    audioRef.current.volume = 0.25;

    if (mute) {
      audioRef.current.pause();
      return;
    }

    audioRef.current.play().catch(() => {});
  }, [mute]);

  const isShortAnswer = pregunta?.question_type === "short_answer";
  const answerReady = isShortAnswer ? respuestaTexto.trim().length > 0 : seleccion !== null;
  const progressText = `${preguntasRespondidas}/${totalPreguntas} respondidas`;

  return (
    <div className="desafio-container">
      <audio ref={audioRef} src="/audio/robotscometh.mp3" loop />

      <button className="mute-btn" onClick={() => setMute(!mute)}>
        {mute ? "🔇" : "🔊"}
      </button>

      {mostrarPregunta && !finalizado && pregunta && (
        <div className="encabezado">
          <span className="pregunta-num">
            Pregunta {pregunta.sequence} de {totalPreguntas}
          </span>

          <span className={`tiempo ${tiempoRestante <= 10 ? "tiempo-alerta" : ""}`}>
            ⏱ {tiempoRestante}s
          </span>

          <span className="progreso">{progressText}</span>
        </div>
      )}

      {!mostrarPregunta && !finalizado && (
        <div className="desafio-card">
          <div className="desafio-header">
            <h1 className="desafio-title">Desafío Diario</h1>
            <p className="desafio-subtitle">
              Ponte a prueba con preguntas personalizadas basadas en tus competencias trabajadas
            </p>
          </div>

          <div className="desafio-meta-wrap">
            <div className="desafio-meta-top">
              <div className="desafio-circle-wrap">
                <svg width="196" height="196" viewBox="0 0 196 196">
                  <circle
                    cx="98"
                    cy="98"
                    r={radi}
                    fill="none"
                    stroke="rgba(255,255,255,0.07)"
                    strokeWidth="12"
                  />
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
                  <span className="desafio-circle-num">{preguntasRespondidas}</span>
                  <span className="desafio-circle-label">respondidas</span>
                  <div className="desafio-circle-meta">Objetivo: {totalPreguntas}</div>
                  <div className="desafio-circle-pct">{porcentajeProgreso}% completado</div>
                </div>
              </div>
            </div>

            
          </div>

          <div className="desafio-info">
            <h3>¿Cómo funciona?</h3>
            <ul className="funciona-lista">
              <li className="funciona funciona-0">5 posibles opciones</li>
              <li className="funciona funciona-1">30 segundos por pregunta</li>
              <li className="funciona funciona-2">Corrección inmediata en múltiple opción</li>
              <li className="funciona funciona-3">Resultados finales al completar todas</li>
            </ul>
          </div>

          {error && (
            <p style={{ color: "#fca5a5", marginTop: "0.8rem", textAlign: "center", lineHeight: 1.4 }}>
              {error}
            </p>
          )}

          <div className="desafio-footer">
            <button className="comenzar-btn" onClick={comenzarDesafio} disabled={creandoDesafio}>
              {creandoDesafio ? "Cargando..." : "Comenzar Desafío"}
            </button>

            <p className="comenzar-score">
              Aciertos actuales: <strong>{correctas}</strong>
            </p>
          </div>
        </div>
      )}

      {mostrarPregunta && !finalizado && pregunta && (
        <div className="pregunta-activa">
          <div
            style={{
              fontSize: "0.8rem",
              color: "#94a3b8",
              fontWeight: 600,
              letterSpacing: "0.02em"
            }}
          >
            {getQuestionTypeLabel(pregunta.question_type)}
          </div>

          <h2 className="pregunta">{pregunta.text}</h2>

          {!isShortAnswer && (
            <div className="opciones">
              {(pregunta.options || []).map((op, i) => (
                <button
                  key={op.id}
                  className={`opcion opcion-${i % 5} ${seleccion === op.id ? "opcion-activa" : ""}`}
                  onClick={() => setSeleccion(op.id)}
                  disabled={Boolean(feedbackActual) || enviandoRespuesta}
                  style={getOptionFeedbackStyle(op.id, feedbackActual)}
                >
                  {op.text}
                </button>
              ))}
            </div>
          )}

          {isShortAnswer && (
            <textarea
              value={respuestaTexto}
              onChange={(e) => setRespuestaTexto(e.target.value)}
              disabled={Boolean(feedbackActual) || enviandoRespuesta}
              placeholder="Escribe tu respuesta aquí..."
              style={{
                width: "100%",
                minHeight: "140px",
                borderRadius: "12px",
                border: "1px solid #334155",
                background: "#0f172a",
                color: "#fff",
                padding: "0.95rem",
                fontSize: "0.95rem",
                lineHeight: 1.5,
                resize: "vertical",
                boxSizing: "border-box"
              }}
            />
          )}

          {feedbackActual && (
            <div
              style={{
                padding: "0.9rem 1rem",
                borderRadius: "12px",
                background: "#111827",
                border: "1px solid #334155",
                color: "#e2e8f0",
                lineHeight: 1.45
              }}
            >
              {feedbackActual.is_correct === true && (
                <strong style={{ color: "#86efac" }}>Correcta.</strong>
              )}
              {feedbackActual.is_correct === false && (
                <strong style={{ color: "#fca5a5" }}>Incorrecta.</strong>
              )}
              {feedbackActual.is_correct === null && (
                <strong style={{ color: "#fde68a" }}>Enviada. Queda pendiente de revisión.</strong>
              )}

              <div style={{ marginTop: "0.45rem", fontSize: "0.9rem", color: "#94a3b8" }}>
                Score: {feedbackActual.challenge_score?.correct ?? 0} correctas de{" "}
                {feedbackActual.challenge_score?.total_answered ?? 0} respondidas
              </div>
            </div>
          )}

          {error && (
            <p style={{ color: "#fca5a5", lineHeight: 1.4, margin: 0 }}>
              {error}
            </p>
          )}

          <div className="acciones">
            {!feedbackActual ? (
              <>
                <button className="omitir" onClick={omitirPregunta} disabled={enviandoRespuesta}>
                  Saltar pregunta
                </button>

                <button
                  className="continuar"
                  disabled={!answerReady || enviandoRespuesta}
                  onClick={enviarRespuesta}
                >
                  {enviandoRespuesta ? "Enviando..." : "Responder"}
                </button>
              </>
            ) : (
              <>
                <button className="omitir" onClick={() => navigate('/inicio')}>
                  Salir
                </button>

                <button className="continuar" onClick={continuarDespuesFeedback}>
                  {feedbackActual.challenge_score?.total_answered >= totalPreguntas
                    ? "Ver resultados"
                    : "Siguiente pendiente"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {finalizado && (
        <div className="pantalla-final">
          <h1 className="final-titulo">Desafío completado</h1>
          <p className="final-subtitulo">
            El hardcode ha quedado fuera: estas respuestas vienen del flujo real del backend.
          </p>

          <div className="final-estadisticas">
            <div>
              <span className="label">Correctas</span>
              <span className="value">
                <span className="value-num">{correctas}</span>&nbsp;/ {totalPreguntas}
              </span>
            </div>

            <div>
              <span className="label">Respondidas</span>
              <span className="value puntos">
                <span className="value-num">{preguntasRespondidas}</span>
              </span>
            </div>

            <div>
              <span className="label">Porcentaje</span>
              <span className="value">
                <span className="value-num">{porcentajeAcierto}%</span>
              </span>
            </div>

            <div>
              <span className="label">Pendientes revisión</span>
              <span className="value categoria">
                <span className="value-num">{pendientesRevision}</span>
              </span>
            </div>

            <div className="full">
              <span className="label">Estado</span>
              <span className="value">
                {pendientesRevision > 0 ? "Completado con revisión pendiente" : "Completado"}
              </span>
            </div>
          </div>

          <div className="final-botones">
            <button className="revisar" onClick={() => setMostrarRevision((prev) => !prev)}>
              {mostrarRevision ? "Ocultar revisión" : "Revisar respuestas"}
            </button>
            <button className="volver" onClick={() => navigate('/inicio')}>
              Volver al inicio
            </button>
          </div>

          {mostrarRevision && (
            <div
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: "0.8rem",
                marginTop: "0.25rem"
              }}
            >
              {reviewItems.map((item, index) => (
                <div
                  key={item.question.id}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: "#0f172a",
                    border: "1px solid #1f2937",
                    borderRadius: "14px",
                    padding: "0.95rem"
                  }}
                >
                  <div style={{ color: "#94a3b8", fontSize: "0.78rem", marginBottom: "0.35rem" }}>
                    Pregunta {index + 1}
                  </div>

                  <div style={{ color: "#fff", fontWeight: 700, lineHeight: 1.45, marginBottom: "0.6rem" }}>
                    {item.question.text}
                  </div>

                  {item.question.question_type === "short_answer" ? (
                    <div style={{ color: "#cbd5e1", lineHeight: 1.5 }}>
                      <strong>Tu respuesta:</strong> {item.result.answer_text || "Sin texto"}
                    </div>
                  ) : (
                    <>
                      <div style={{ color: "#cbd5e1", lineHeight: 1.5 }}>
                        <strong>Tu respuesta:</strong>{" "}
                        {item.selectedOption?.text || item.result.selected_option_text || "No disponible"}
                      </div>

                      {item.correctOption && (
                        <div style={{ color: "#86efac", lineHeight: 1.5, marginTop: "0.2rem" }}>
                          <strong>Respuesta correcta:</strong> {item.correctOption.text}
                        </div>
                      )}
                    </>
                  )}

                  <div
                    style={{
                      marginTop: "0.55rem",
                      fontSize: "0.85rem",
                      color:
                        item.result.is_correct === true
                          ? "#86efac"
                          : item.result.is_correct === false
                            ? "#fca5a5"
                            : "#fde68a"
                    }}
                  >
                    {item.result.is_correct === true && "Correcta"}
                    {item.result.is_correct === false && "Incorrecta"}
                    {item.result.is_correct === null && "Pendiente de revisión"}
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="final-mensaje">
            Si el backend devuelve preguntas abiertas, quedarán como pendientes hasta revisión manual.
          </p>
        </div>
      )}

      <BottomBar active="desafio" />
    </div>
  );
}