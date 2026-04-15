import React, { useState, useEffect } from 'react';
import '../styles/coachRecomendaciones.css';
import { useNavigate } from 'react-router-dom';

const COACH_MEMORY_KEY = "coachConversationMemory";

const OPTION_CONFIG = {
  debil:      { label: "Áreas a mejorar",       icon: "💪", color: "warning" },
  fuerte:     { label: "Puntos fuertes",         icon: "⭐", color: "success" },
  metas:      { label: "Metas",                  icon: "🎯", color: "primary" },
  autoengano: { label: "Autoengaño detectado",   icon: "🔥", color: "danger"  },
  topFreno:   { label: "Freno principal",        icon: "🧨", color: "danger"  },
  siManager:  { label: "Feedback como manager",  icon: "⚡", color: "primary" },
};

const TOPIC_LABELS = {
  debil:      "Áreas más débiles",
  fuerte:     "Puntos fuertes",
  metas:      "Metas",
  autoengano: "Autoengaño",
  topFreno:   "Freno principal",
  siManager:  "Feedback manager",
};

function formatDate(isoString) {
  if (!isoString) return null;
  const d = new Date(isoString);
  if (isNaN(d)) return null;
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
}

function safeParseStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export default function CoachRecomendaciones() {
  const navigate = useNavigate();
  const [memory, setMemory] = useState(null);

  useEffect(() => {
    const data = safeParseStorage(COACH_MEMORY_KEY, null);
    setMemory(data);
  }, []);

  const hasData = memory && memory.hasStartedConversation;

  // Recull tots els contenidos recomanats de totes les opcions
  const allRecommendations = hasData
    ? Object.entries(memory.optionMemory || {})
        .filter(([, state]) => state?.recommendedContent?.length > 0)
        .map(([key, state]) => ({
          key,
          config: OPTION_CONFIG[key],
          contents: state.recommendedContent,
          lastMessage: state.lastMessage,
          date: formatDate(state.lastOpenedAt),
          outcome: state.lastOutcome,
        }))
    : [];

  // Temes tractats (topics)
  const topics = hasData ? (memory.lastTopics || []) : [];

  return (
    <div className="coachrec-page">

      {/* HEADER */}
      <div className="coachrec-header">
        <button className="coachrec-back" onClick={() => navigate(-1)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15,18 9,12 15,6" />
          </svg>
        </button>
        <div>
          <h1 className="coachrec-title">Recomendaciones de mi Coach AI</h1>
          <p className="coachrec-subtitle"></p>
        </div>
      </div>

      {!hasData && (
        <div className="coachrec-empty">
          <span className="coachrec-empty-icon">🤖</span>
          <p className="coachrec-empty-title">Todavía sin historial</p>
          <p className="coachrec-empty-desc">
            Cuando hayas tenido una conversación con tu Coach IA, aquí aparecerán sus recomendaciones y memoria.
          </p>
          <button className="coachrec-cta" onClick={() => navigate(-1)}>
            Ir al Coach
          </button>
        </div>
      )}

      {hasData && (
        <div className="coachrec-content">

          {/* RESUMEN DE SESIÓN */}
          <div className="coachrec-block">
            <div className="coachrec-block-header">
              <span className="coachrec-block-icon">📋</span>
              <h2 className="coachrec-block-title">Resumen de sesiones</h2>
            </div>
            <div className="coachrec-summary-grid">
              <div className="coachrec-summary-item">
                <span className="coachrec-summary-num">{memory.visits || 0}</span>
                <span className="coachrec-summary-label">Sesiones totales</span>
              </div>
              {memory.lastStage && (
                <div className="coachrec-summary-item">
                  <span className="coachrec-summary-num coachrec-summary-stage">{memory.lastStage}</span>
                  <span className="coachrec-summary-label">Etapa actual</span>
                </div>
              )}
              {memory.lastConversationAt && (
                <div className="coachrec-summary-item">
                  <span className="coachrec-summary-num coachrec-summary-date">{formatDate(memory.lastConversationAt)}</span>
                  <span className="coachrec-summary-label">Última sesión</span>
                </div>
              )}
            </div>
          </div>

          {/* TEMES TRACTATS */}
          {topics.length > 0 && (
            <div className="coachrec-block">
              <div className="coachrec-block-header">
                <span className="coachrec-block-icon">🧭</span>
                <h2 className="coachrec-block-title">Líneas trabajadas con el coach</h2>
              </div>
              <div className="coachrec-topics">
                {topics.map((topic, i) => (
                  <span key={i} className="coachrec-topic-chip">
                    {OPTION_CONFIG[topic]?.icon || "•"} {TOPIC_LABELS[topic] || topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* METES PENDENTS */}
          {memory.lastPendingGoals?.length > 0 && (
            <div className="coachrec-block">
              <div className="coachrec-block-header">
                <span className="coachrec-block-icon">🎯</span>
                <h2 className="coachrec-block-title">Metas en seguimiento</h2>
              </div>
              <div className="coachrec-goals-list">
                {memory.lastPendingGoals.map((goal, i) => (
                  <div key={i} className="coachrec-goal-item coachrec-goal-pending">
                    <span className="coachrec-goal-dot" />
                    <span className="coachrec-goal-name">{goal}</span>
                    <span className="coachrec-goal-badge coachrec-badge-pending">Pendiente</span>
                  </div>
                ))}
                {memory.lastCompletedGoals?.map((goal, i) => (
                  <div key={`done-${i}`} className="coachrec-goal-item coachrec-goal-done">
                    <span className="coachrec-goal-dot coachrec-dot-done" />
                    <span className="coachrec-goal-name">{goal}</span>
                    <span className="coachrec-goal-badge coachrec-badge-done">Cumplida ✓</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CONTENIDOS RECOMANATS */}
          {allRecommendations.length > 0 && (
            <div className="coachrec-block">
              <div className="coachrec-block-header">
                <span className="coachrec-block-icon">📚</span>
                <h2 className="coachrec-block-title">Contenidos recomendados</h2>
              </div>
              <div className="coachrec-recs-list">
                {allRecommendations.map(({ key, config, contents, date }) => (
                  <div key={key} className={`coachrec-rec-group coachrec-rec-${config?.color || 'primary'}`}>
                    <div className="coachrec-rec-group-header">
                      <span className="coachrec-rec-icon">{config?.icon}</span>
                      <span className="coachrec-rec-label">{config?.label}</span>
                      {date && <span className="coachrec-rec-date">{date}</span>}
                    </div>
                    <div className="coachrec-rec-items">
                      {contents.map((name, i) => (
                        <div key={i} className="coachrec-rec-item">
                          <span className="coachrec-rec-num">{i + 1}</span>
                          <span className="coachrec-rec-name">{name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MISSATGE DE SEGUIMENT */}
          {memory.lastCoachQuestion && (
            <div className="coachrec-block">
              <div className="coachrec-block-header">
                <span className="coachrec-block-icon">💬</span>
                <h2 className="coachrec-block-title">Último mensaje del coach</h2>
              </div>
              <div className="coachrec-last-msg">
                <p className="coachrec-last-msg-text">"{memory.lastCoachQuestion}"</p>
              </div>
            </div>
          )}

          {allRecommendations.length === 0 && topics.length === 0 && (
            <div className="coachrec-empty-inline">
              <p>Todavía no hay recomendaciones guardadas. Conversa más con tu Coach para que aparezcan aquí.</p>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
