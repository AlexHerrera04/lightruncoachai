import React, { useEffect, useMemo, useRef, useState } from "react";
import "../styles/agenteCoach.css";
import { useNavigate } from "react-router-dom";
import { getGoalsList, getNewContents } from "../api/api";
import BottomBar from "../components/BottomBar";

/* ============================
   API HELPERS
============================ */

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

async function getRadarData() {
  const token = localStorage.getItem("accessToken");
  if (!token) return null;
  const res = await fetch(
    "https://d2dy88a4l687h9.cloudfront.net/diagnoses/capacities-comparison",
    { headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" } }
  );
  if (!res.ok) return null;
  return await res.json();
}

async function askClaude({ instructions, input, maxTokens = 500, responseFormat = null }) {
  try {
    const res = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instructions,
        input,
        maxTokens,
        responseFormat
      })
    });

    if (!res.ok) return "";
    const data = await res.json();
    return data.text?.trim() || "";
  } catch {
    return "";
  }
}

function parseAnalysisResponse(raw) {
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {}

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean))];
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

function getContentId(content) {
  return content?.id ?? content?.pk ?? content?.slug ?? content?.name ?? Math.random().toString(36);
}

function getContentSignals(content) {
  const capacityTags = (content.capacity_filter || [])
    .map(item => normalizeText(item?.capacity))
    .filter(Boolean);

  const industryTags = (content.industry || [])
    .map(item => normalizeText(item?.industry))
    .filter(Boolean);

  const textBlob = normalizeText(
    [
      content.name,
      content.description,
      content.type,
      ...(content.capacity_filter || []).map(item => item?.capacity),
      ...(content.industry || []).map(item => item?.industry)
    ].join(" ")
  );

  return {
    capacityTags: uniqueStrings(capacityTags),
    industryTags: uniqueStrings(industryTags),
    textBlob
  };
}

function scoreContentForTargets(content, targetCapacities) {
  const normalizedTargets = uniqueStrings(targetCapacities.map(normalizeText));
  const { capacityTags, industryTags, textBlob } = getContentSignals(content);

  let score = 0;
  const matchedTargets = [];

  normalizedTargets.forEach(target => {
    if (!target) return;

    const exactCapacity = capacityTags.some(tag => tag === target);
    const partialCapacity = capacityTags.some(tag => tag.includes(target) || target.includes(tag));
    const exactIndustry = industryTags.some(tag => tag === target);
    const partialIndustry = industryTags.some(tag => tag.includes(target) || target.includes(tag));
    const textMatch = textBlob.includes(target);

    if (exactCapacity) {
      score += 12;
      matchedTargets.push(target);
      return;
    }

    if (partialCapacity) {
      score += 8;
      matchedTargets.push(target);
      return;
    }

    if (exactIndustry) {
      score += 5;
      matchedTargets.push(target);
      return;
    }

    if (partialIndustry) {
      score += 3;
      matchedTargets.push(target);
      return;
    }

    if (textMatch) {
      score += 1;
      matchedTargets.push(target);
    }
  });

  if (content.capacity_filter?.length) score += 1;

  return {
    score,
    matchedTargets: uniqueStrings(matchedTargets)
  };
}

/* ============================
   CONSTANTS
============================ */

/* ============================
   CONSTANTS
============================ */

const ANALYSIS_RESPONSE_FORMAT = {
  type: "json_schema",
  name: "coach_analysis",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "etapa",
      "realidad",
      "benchmark",
      "brechas",
      "incoherencias",
      "riesgo",
      "acciones",
      "identidad"
    ],
    properties: {
      etapa: {
        type: "object",
        additionalProperties: false,
        required: ["nombre", "lectura"],
        properties: {
          nombre: { type: "string" },
          lectura: { type: "string" }
        }
      },
      realidad: { type: "string" },
      benchmark: { type: "string" },
      brechas: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: { type: "string" }
      },
      incoherencias: {
        type: "array",
        minItems: 2,
        maxItems: 2,
        items: { type: "string" }
      },
      riesgo: { type: "string" },
      acciones: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: { type: "string" }
      },
      identidad: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: { type: "string" }
      }
    }
  }
};

const PERSONALITIES = {


  motivador: {
    label: "Motivador",
    emoji: "🌟",
    desc: "Empático y muy positivo",
    prompt: `
Eres un coach de alto rendimiento muy humano, empático, positivo y movilizador.
No vienes a informar: vienes a provocar avance real.
Hablas como alguien que ve valor real en la persona y sabe devolvérselo con energía.
Refuerzas lo que sí existe, das perspectiva y empujas a actuar sin meter presión absurda.
Tu tono inspira, acompaña y mueve.
Nunca suenes genérico, blando, vacío o artificial.
`.trim()
  },
  pragmatico: {
    label: "Pragmático",
    emoji: "⚡",
    desc: "Directo y claro",
    prompt: `
Eres un coach de alto rendimiento directo, claro, estructurado y útil.
No vienes a informar: vienes a ordenar la realidad y convertirla en acción.
Vas al grano, priorizas bien y bajas todo a foco, criterio y siguiente paso.
No adornas, no dramatizas y no te pierdes en teoría.
Tu tono debe sentirse sobrio, preciso y accionable.
`.trim()
  },
  brutal: {
    label: "Brutal",
    emoji: "👊",
    desc: "Honesto e incisivo",
    prompt: `
Eres un coach de alto rendimiento brutalmente honesto, frontal, inteligente y muy agudo.
No vienes a informar: vienes a romper excusas y provocar avance real.
Hablas con una energía de mentor duro: directo a la mandíbula, sin azúcar innecesario.
Puedes usar ironía ligera o humor inteligente, pero jamás toxicidad, desprecio ni humillación.
Tu tono debe incomodar con clase, señalar incoherencias con precisión y dejar una verdad difícil de esquivar.
`.trim()
  }
};

const COACH_MEMORY_KEY = "coachConversationMemory";
const CHECK_IN_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const ANALYSIS_HISTORY_KEY = "coachAnalysisHistory";
const MAX_ANALYSIS_HISTORY = 10;

const DEFAULT_OPTION_STATE = {
  opened: false,
  lastOpenedAt: null,
  recommendedContent: [],
  lastMessage: null,
  needsCheckIn: false,
  closedUntil: null,
  lastOutcome: null,
  lastOutcomeAt: null
};

const PRIMARY_OPTION_KEYS = ["debil", "fuerte", "metas"];
const EXTRA_OPTION_KEYS = ["autoengano", "topFreno", "siManager"];

const OPTION_CONFIG = {
  debil: {
    label: "Mejorar mis áreas más débiles",
    icon: "💪",
    shortLabel: "áreas más débiles",
    checkInQuestion:
      "¿Has empezado ya a trabajar lo que te recomendé para reforzar esas competencias clave?",
    yesLabel: "Sí, ya empecé",
    noLabel: "No todavía",
    yesReply:
      "Muy bien. Entonces esta línea queda cerrada por ahora. Lo importante ahora es sostenerlo y dejar una señal visible de avance.",
    noReply:
      "Entonces no la dejes caer otra vez. Empieza por una sola acción pequeña esta semana y conviértela en algo medible."
  },
  fuerte: {
    label: "Potenciar mis puntos fuertes",
    icon: "⭐",
    shortLabel: "puntos fuertes",
    checkInQuestion:
      "¿Has usado ya alguno de esos puntos fuertes en algo concreto desde la última vez?",
    yesLabel: "Sí, lo apliqué",
    noLabel: "No todavía",
    yesReply:
      "Muy bien. Eso es justo lo que hace que una fortaleza deje de ser teoría y empiece a contar de verdad. Esta línea queda cerrada por ahora.",
    noReply:
      "Entonces no te quedes solo con la idea. Elige una situación real esta semana y fuerza una aplicación concreta de esa fortaleza."
  },
  metas: {
    label: "Analizar mis metas actuales",
    icon: "🎯",
    shortLabel: "metas",
    checkInQuestion:
      "¿Has movido ya alguna meta pendiente o sigue todo prácticamente igual?",
    yesLabel: "Sí, avancé algo",
    noLabel: "No, sigue igual",
    yesReply:
      "Muy bien. Aunque el avance sea pequeño, ya has salido del bloqueo. Por ahora cerramos esta línea y más adelante revisamos si se consolida.",
    noReply:
      "Entonces toca dejar de mirar la meta como algo grande. Reduce el siguiente paso hasta que no tengas excusa para no moverlo esta semana."
  },
  autoengano: {
    label: "Autoengaño",
    icon: "🔥",
    shortLabel: "autoengaño",
    checkInQuestion:
      "¿Has corregido algo de ese patrón o sigues cayendo en lo mismo?",
    yesLabel: "Sí, algo cambié",
    noLabel: "No, sigo igual",
    yesReply:
      "Bien. Lo importante aquí no es hacerlo perfecto, sino haber roto la inercia. Cerramos esta línea por ahora.",
    noReply:
      "Entonces al menos no te engañes con eso. Si sigue igual, necesitas una acción concreta, no otra reflexión."
  },
  topFreno: {
    label: "Qué te está frenando",
    icon: "🧨",
    shortLabel: "freno principal",
    checkInQuestion:
      "¿Has movido algo para reducir ese freno o sigue exactamente en el mismo sitio?",
    yesLabel: "Sí, ya moví algo",
    noLabel: "No, sigue igual",
    yesReply:
      "Muy bien. Si ya lo has empezado a mover, esta línea ya ha cumplido su función por ahora.",
    noReply:
      "Entonces ya sabes dónde está el problema. Ahora te toca quitarle espacio con una decisión pequeña pero real esta misma semana."
  },
  siManager: {
    label: "Si fueras mi manager",
    icon: "⚡",
    shortLabel: "feedback manager",
    checkInQuestion:
      "¿Has hecho algo con ese feedback o se ha quedado solo como verdad incómoda?",
    yesLabel: "Sí, actué",
    noLabel: "No todavía",
    yesReply:
      "Bien. Entonces ese feedback ya no se ha quedado en discurso y eso es lo importante. Cerramos esta línea por ahora.",
    noReply:
      "Entonces todavía no te ha servido de verdad. No necesitas más feedback: necesitas una respuesta visible a ese feedback."
  }
};

const INITIAL_COACH_MEMORY = {
  hasStartedConversation: false,
  visits: 0,
  lastConversationAt: null,
  lastStage: null,
  lastTopics: [],
  lastRecommendedAt: null,
  lastGoalReviewAt: null,
  lastPendingGoals: [],
  lastCompletedGoals: [],
  lastCoachQuestion: null,
  optionMemory: {
    debil: { ...DEFAULT_OPTION_STATE },
    fuerte: { ...DEFAULT_OPTION_STATE },
    metas: { ...DEFAULT_OPTION_STATE },
    autoengano: { ...DEFAULT_OPTION_STATE },
    topFreno: { ...DEFAULT_OPTION_STATE },
    siManager: { ...DEFAULT_OPTION_STATE }
  }
};

function AnalisiContent({ analisi, fallbackBenchmark, feedbackDiag, setFeedbackDiag, seguimentFet, setSeguimentFet, personality }) {
  if (!analisi) return null;

   const analysisShareText = [
    "Resumen de mi análisis con Coach AI:",
    analisi.realidad,
    ...(analisi.acciones || []).map(action => `- ${action}`),
    analisi.identidad?.length ? `Mi ADN Digital: ${analisi.identidad.join(" · ")}` : ""
  ].filter(Boolean).join("\n\n");

  const shareByMail = () => {
    const subject = encodeURIComponent("Mi análisis de Coach AI");
    const body = encodeURIComponent(analysisShareText);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const shareByWhatsApp = () => {
    const text = encodeURIComponent(analysisShareText);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <div className="analisi-section analisi-primary">
        <div className="analisi-section-header">
          <span className="analisi-icon">🧠</span>
          <h3 className="analisi-title analisi-color-primary">Realidad Actual</h3>
        </div>
        <p className="analisi-text">{analisi.realidad}</p>
      </div>

      <div className="analisi-section analisi-warning">
        <div className="analisi-section-header">
          <span className="analisi-icon">📊</span>
          <h3 className="analisi-title analisi-color-warning">Benchmark organizacional</h3>
        </div>
        <p className="analisi-text">{analisi.benchmark || fallbackBenchmark}</p>
      </div>

      <div className="analisi-section analisi-warning">
        <div className="analisi-section-header">
          <span className="analisi-icon">⚠️</span>
          <h3 className="analisi-title analisi-color-warning">Brechas Clave</h3>
        </div>
        <ul className="analisi-list">
          {analisi.brechas?.map((item, index) => <li key={index}>{item}</li>)}
        </ul>
      </div>

      <div className="analisi-section analisi-danger">
        <div className="analisi-section-header">
          <span className="analisi-icon">🔍</span>
          <h3 className="analisi-title analisi-color-danger">Áreas de Mejora</h3>
        </div>
        <ul className="analisi-list analisi-list-border">
          {analisi.incoherencias?.map((item, index) => <li key={index}>{item}</li>)}
        </ul>
      </div>

      <div className="analisi-section analisi-danger">
        <div className="analisi-section-header">
          <span className="analisi-icon">📉</span>
          <h3 className="analisi-title analisi-color-danger">Riesgo</h3>
        </div>
        <p className="analisi-text">{analisi.riesgo}</p>
      </div>

      <div className="analisi-section analisi-success">
        <div className="analisi-section-header">
          <span className="analisi-icon">🚀</span>
          <h3 className="analisi-title analisi-color-success">Acción Sugerida</h3>
        </div>
        <div className="analisi-accions">
          {analisi.acciones?.map((item, index) => (
            <button key={index} className="analisi-accio-btn">
              <span className="analisi-accio-arrow">→</span>
              {item}
            </button>
          ))}
        </div>
      </div>

      {analisi.identidad && (
        <div className="analisi-share-card">
          <div className="analisi-share-inner">
            <span className="analisi-share-label">Mi ADN Digital</span>
            <div className="analisi-share-words">
              {analisi.identidad.map((word, index) => (
                <React.Fragment key={index}>
                  <span className="analisi-share-word">{word}</span>
                  {index < analisi.identidad.length - 1 && <span className="analisi-share-dot">·</span>}
                </React.Fragment>
              ))}
            </div>
            <span className="analisi-share-brand">✳ Open KX</span>
          </div>

          <button
            className="analisi-share-btn"
            onClick={() => {
              const subtitle = analisi.identidad.join(" · ");
              const shareText = `Mi identidad profesional hoy: ${subtitle} — Open KX`;
              localStorage.setItem("miADNDigitalSubtitle", subtitle);
              localStorage.setItem("resumenADN", subtitle);
              window.dispatchEvent(new Event("adn-subtitle-updated"));
              if (navigator.share) navigator.share({ text: shareText });
              else navigator.clipboard.writeText(shareText);
            }}
          >
            Actualizar en mi Perfil
          </button>
        </div>
      )}

      <div className="analisi-share-actions">
            <button
              className="analisi-share-btn analisi-share-btn-secondary"
              onClick={shareByMail}
            >
              Compartir por mail
            </button>
            <button
              className="analisi-share-btn analisi-share-btn-secondary analisi-share-btn-whatsapp"
              onClick={shareByWhatsApp}
            >
              Compartir por WhatsApp
            </button>
          </div>

      {setFeedbackDiag && setSeguimentFet && (
        <>
          <div className="analisi-seguiment">
            <p className="analisi-seguiment-q">Modo Seguimiento: ¿Harás las acciones recomendadas?</p>
            <div className="analisi-seguiment-btns">
              <button
                className={"analisi-seg-btn analisi-seg-si" + (seguimentFet === true ? " actiu" : "")}
                onClick={() => setSeguimentFet(true)}
              >
                ✅ Sí, las haré
              </button>
              <button
                className={"analisi-seg-btn analisi-seg-no" + (seguimentFet === false ? " actiu" : "")}
                onClick={() => setSeguimentFet(false)}
              >
                ❌ No, haré otra cosa
              </button>
            </div>
            {seguimentFet === true && (
              <p className="analisi-seguiment-resp positiu">
                {getToneText(personality, {
  motivador: "Bien. Ahora lo valioso es sostenerlo y convertir esa intención en algo visible.",
  pragmatico: "Bien. Ahora lo importante no es la intención, sino sostenerla.",
  brutal: "Bien. La intención no vale mucho si no la sostienes."
})}
              </p>
            )}
            {seguimentFet === false && (
              <p className="analisi-seguiment-resp negatiu">
                {getToneText(personality, {
  motivador: "Sin acción no habrá cambio. Si esto no lo vas a mover, decide con claridad qué sí vas a hacer avanzar.",
  pragmatico: "Sin acción no hay cambio. Si no lo harás, necesitas decidir qué sí vas a mover.",
  brutal: "Sin acción no hay cambio. Si esto no lo vas a hacer, decide ya qué sí vas a mover."
})}
              </p>
            )}
          </div>

          <div className="analisi-feedback">
            <span className="analisi-feedback-label">¿Qué te han parecido estas recomendaciones de tu Coach AI?</span>
            <div className="analisi-feedback-btns">
              {[["like", "👍"], ["neutral", "😐"], ["dislike", "👎"]].map(([key, emoji]) => (
                <button
                  key={key}
                  className={"analisi-fb-btn" + (feedbackDiag === key ? " analisi-fb-actiu" : "")}
                  onClick={() => setFeedbackDiag(key)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default function AgenteCoach() {
  const navigate = useNavigate();
  const chatEndRef = useRef(null);

  const [activeMode, setActiveMode] = useState(null);
  const [personality, setPersonality] = useState(
    () => localStorage.getItem("coachPersonality") || "pragmatico"
  );
  const [showPersonalityMenu, setShowPersonalityMenu] = useState(false);

  const [competenciasClave, setCompetenciasClave] = useState([]);
  const [radarData, setRadarData] = useState(null);
  const [goals, setGoals] = useState([]);
  const [contenidos, setContenidos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState(0);
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [showContinuePrompt, setShowContinuePrompt] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [loadingExtraOption, setLoadingExtraOption] = useState(false);

  const [recommendedByType, setRecommendedByType] = useState({
    debil: [],
    fuerte: [],
    metas: []
  });

  const [pendingDecision, setPendingDecision] = useState(null);
  const [sessionHiddenOptions, setSessionHiddenOptions] = useState([]);

  const [analisiLoading, setAnalisiLoading] = useState(false);
  const [analisi, setAnalisi] = useState(null);
  const [analisiDone, setAnalisiDone] = useState(false);
  const [feedbackDiag, setFeedbackDiag] = useState(null);
  const [seguimentFet, setSeguimentFet] = useState(null);
  const [analisiBlocked, setAnalisiBlocked] = useState(false);
  const [analisisHistory, setAnalisisHistory] = useState(() =>
    safeParseStorage(ANALYSIS_HISTORY_KEY, [])
  );
  const [showHistorial, setShowHistorial] = useState(false);
  const [historialSelected, setHistorialSelected] = useState(null);

  const [coachMemory, setCoachMemory] = useState(() =>
    safeParseStorage(COACH_MEMORY_KEY, INITIAL_COACH_MEMORY)
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing, showMoreOptions, showContinuePrompt, pendingDecision]);

   useEffect(() => {
    async function loadAll() {
      try {
        const [accountRes, radarRes, goalsRes, contentsRes] = await Promise.allSettled([
          getUserAccount(),
          getRadarData(),
          getGoalsList(),
          getNewContents()
        ]);

        if (accountRes.status === "fulfilled") {
          const account = accountRes.value;
          setCompetenciasClave(Array.isArray(account?.capacity) ? account.capacity : []);
        } else {
          console.error("Error cargando account:", accountRes.reason);
          setCompetenciasClave([]);
        }

        if (radarRes.status === "fulfilled") {
          setRadarData(Array.isArray(radarRes.value) ? radarRes.value : []);
        } else {
          console.error("Error cargando radar:", radarRes.reason);
          setRadarData([]);
        }

        if (goalsRes.status === "fulfilled") {
          const goalsData = goalsRes.value;
          setGoals(
            Array.isArray(goalsData)
              ? goalsData
              : Array.isArray(goalsData?.results)
                ? goalsData.results
                : []
          );
        } else {
          console.error("Error cargando goals:", goalsRes.reason);
          setGoals([]);
        }

        if (contentsRes.status === "fulfilled") {
          const contents = contentsRes.value;
          setContenidos(
            Array.isArray(contents)
              ? contents
              : Array.isArray(contents?.results)
                ? contents.results
                : []
          );
        } else {
          console.error("Error cargando contents:", contentsRes.reason);
          setContenidos([]);
        }
      } finally {
        setLoading(false);
      }
    }

    loadAll();
  }, []);

  function persistCoachMemory(nextMemory) {
    localStorage.setItem(COACH_MEMORY_KEY, JSON.stringify(nextMemory));
  }

  function updateCoachMemory(patch) {
    setCoachMemory(prev => {
      const base = prev || INITIAL_COACH_MEMORY;
      const next = typeof patch === "function" ? patch(base) : { ...base, ...patch };
      persistCoachMemory(next);
      return next;
    });
  }

  function getRawOptionMemory(optionKey) {
    return coachMemory?.optionMemory?.[optionKey] || { ...DEFAULT_OPTION_STATE };
  }

  function getRuntimeOptionMemory(optionKey) {
    const raw = { ...DEFAULT_OPTION_STATE, ...getRawOptionMemory(optionKey) };
    if (!raw.closedUntil) return raw;

    const closedUntilTs = new Date(raw.closedUntil).getTime();
    if (Number.isNaN(closedUntilTs)) return raw;

    if (closedUntilTs <= Date.now()) {
      return { ...DEFAULT_OPTION_STATE };
    }

    return raw;
  }

  function updateOptionMemory(optionKey, patch) {
    updateCoachMemory(prev => ({
      ...prev,
      optionMemory: {
        ...(prev.optionMemory || {}),
        [optionKey]: {
          ...(prev.optionMemory?.[optionKey] || { ...DEFAULT_OPTION_STATE }),
          ...patch
        }
      }
    }));
  }

  function savePersonality(newPersonality) {
    setPersonality(newPersonality);
    localStorage.setItem("coachPersonality", newPersonality);
  }

   function savePersonality(newPersonality) {
    setPersonality(newPersonality);
    localStorage.setItem("coachPersonality", newPersonality);
  }

  function getToneText(personalityKey, variants) {
  return variants[personalityKey] || variants.pragmatico;
}

  function resetConversationState() {
    setStep(0);
    setMessages([]);
    setShowContinuePrompt(false);
    setShowMoreOptions(false);
    setLoadingExtraOption(false);
    setPendingDecision(null);
    setSessionHiddenOptions([]);
    setRecommendedByType({
      debil: [],
      fuerte: [],
      metas: []
    });
  }

  function resetAnalysisState() {
    setAnalisi(null);
    setAnalisiDone(false);
    setFeedbackDiag(null);
    setSeguimentFet(null);
    setAnalisiBlocked(false);
    setShowHistorial(false);
    setHistorialSelected(null);
  }

  function addBot(text) {
    setMessages(prev => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, from: "bot", type: "text", text }
    ]);
  }

  function addUser(text) {
    setMessages(prev => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, from: "user", type: "text", text }
    ]);
  }

  function addRecommendationBlock(title, items, optionKey) {
    setMessages(prev => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        from: "bot",
        type: "recommendations",
        title,
        optionKey,
        items
      }
    ]);
  }

  function getRadarEntries() {
    return Array.isArray(radarData)
      ? radarData.filter(item => Number(item.value) > 0)
      : [];
  }

  function getKeyCompetencyEntries() {
    const normalizedKeys = new Set(competenciasClave.map(normalizeText).filter(Boolean));
    return getRadarEntries().filter(item => normalizedKeys.has(normalizeText(item.capacity)));
  }

  function getComplementaryCompetencyEntries() {
    const normalizedKeys = new Set(competenciasClave.map(normalizeText).filter(Boolean));
    return getRadarEntries().filter(item => !normalizedKeys.has(normalizeText(item.capacity)));
  }

  function sortEntriesDesc(entries) {
    return [...entries].sort((a, b) => Number(b.value) - Number(a.value));
  }

  function sortEntriesAsc(entries) {
    return [...entries].sort((a, b) => Number(a.value) - Number(b.value));
  }

  function getGoalName(goal) {
    return goal?.name || goal?.title || goal?.goal || "";
  }

  function getGoalPriorityWeight(goal) {
    const raw = normalizeText(goal?.priority);
    if (["alta", "high", "urgent", "urgente", "critical", "critica", "crítica"].includes(raw)) return 3;
    if (["media", "medium", "normal"].includes(raw)) return 2;
    if (["baja", "low"].includes(raw)) return 1;
    return 0;
  }

  function getGoalPriorityLabel(goal) {
    const weight = getGoalPriorityWeight(goal);
    if (weight === 3) return "alta";
    if (weight === 2) return "media";
    if (weight === 1) return "baja";
    return "";
  }

  function getGoalStatusLabel(goal) {
    const raw = normalizeText(goal?.status || goal?.state);
    if (["completed", "complete", "done", "finalizada", "finalizado", "completada", "completado"].includes(raw)) {
      return "cumplida";
    }
    if (["in progress", "in_progress", "progress", "ongoing", "started", "activa", "en progreso", "en curso", "iniciada"].includes(raw)) {
      return "en progreso";
    }
    if (["pending", "todo", "pendiente", "open"].includes(raw)) {
      return "pendiente";
    }
    return raw || "activa";
  }

  function isGoalCompleted(goal) {
    return getGoalStatusLabel(goal) === "cumplida";
  }

  function getGoalDueDate(goal) {
    const rawDate = goal?.expiration_date || goal?.due_date || goal?.deadline;
    if (!rawDate) return null;

    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  }

  function formatGoalDueDate(goal) {
    const parsed = getGoalDueDate(goal);
    if (!parsed) return "";
    return parsed.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  }

  function isGoalOverdue(goal) {
    const dueDate = getGoalDueDate(goal);
    if (!dueDate || isGoalCompleted(goal)) return false;

    const today = new Date();
    const due = new Date(dueDate);

    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    return due < today;
  }

  function getDaysUntilDue(goal) {
    const dueDate = getGoalDueDate(goal);
    if (!dueDate) return null;

    const today = new Date();
    const due = new Date(dueDate);

    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  function getGoalUrgencyLabel(goal) {
    if (isGoalCompleted(goal)) return "cerrada";

    const days = getDaysUntilDue(goal);
    if (days === null) return "sin fecha";
    if (days < 0) return `retrasada ${Math.abs(days)} día${Math.abs(days) === 1 ? "" : "s"}`;
    if (days === 0) return "vence hoy";
    if (days <= 3) return `vence en ${days} día${days === 1 ? "" : "s"}`;
    return `vence en ${days} días`;
  }

  function getPrioritizedGoals(limit = goals.length || 0) {
    return [...goals]
      .filter(Boolean)
      .sort((a, b) => {
        const overdueDiff = Number(isGoalOverdue(b)) - Number(isGoalOverdue(a));
        if (overdueDiff !== 0) return overdueDiff;

        const priorityDiff = getGoalPriorityWeight(b) - getGoalPriorityWeight(a);
        if (priorityDiff !== 0) return priorityDiff;

        const aDue = getGoalDueDate(a)?.getTime() || Number.MAX_SAFE_INTEGER;
        const bDue = getGoalDueDate(b)?.getTime() || Number.MAX_SAFE_INTEGER;
        if (aDue !== bDue) return aDue - bDue;

        return getGoalName(a).localeCompare(getGoalName(b));
      })
      .slice(0, limit);
  }

  function getGoalSummary(limit = 3) {
    return getPrioritizedGoals(limit)
      .map(goal => {
        const parts = [getGoalName(goal)];
        const status = getGoalStatusLabel(goal);
        const priority = getGoalPriorityLabel(goal);
        const dueDate = formatGoalDueDate(goal);

        if (status) parts.push(status);
        if (priority) parts.push(`prioridad ${priority}`);
        if (dueDate) parts.push(`vence ${dueDate}`);
        if (isGoalOverdue(goal)) parts.push("retrasada");

        return parts.join(" · ");
      })
      .filter(Boolean);
  }

  function buildGoalsDetailedStr(limit = 8) {
    return getPrioritizedGoals(limit)
      .map((goal, index) => {
        const parts = [
          `${index + 1}. ${getGoalName(goal) || "Meta sin nombre"}`,
          `estado ${getGoalStatusLabel(goal)}`
        ];

        const priority = getGoalPriorityLabel(goal);
        const dueDate = formatGoalDueDate(goal);
        const urgency = getGoalUrgencyLabel(goal);

        if (priority) parts.push(`prioridad ${priority}`);
        if (dueDate) parts.push(`fecha ${dueDate}`);
        if (urgency) parts.push(urgency);

        return parts.join(" · ");
      })
      .join("\n");
  }

  function hasLeadershipSignal() {
    const text = competenciasClave.join(" ").toLowerCase();
    return text.includes("lider") || text.includes("leader") || text.includes("liderazgo");
  }

  function getCoachStage() {
    const keyEntries = getKeyCompetencyEntries();
    const keyAverage = keyEntries.length
      ? keyEntries.reduce((sum, item) => sum + Number(item.value), 0) / keyEntries.length
      : 0;
    const weakKeyEntries = sortEntriesAsc(keyEntries).filter(item => Number(item.value) < 60);
    const activeGoals = goals.filter(goal => !isGoalCompleted(goal));
    const completedGoals = goals.filter(goal => isGoalCompleted(goal));

    if (!keyEntries.length && !goals.length) {
      return {
        key: "sin_foco",
        label: "Sin foco claro",
        summary:
          "Hay intención de mejora, pero todavía faltan señales suficientes para sostener una dirección clara en competencias clave y metas.",
        identity: ["Explorador", "Intermitente", "Emergente"]
      };
    }

    if (keyAverage < 45 || weakKeyEntries.length >= Math.max(2, Math.ceil(keyEntries.length / 2))) {
      return {
        key: "desalineado",
        label: "Desalineado",
        summary:
          "Hoy hay distancia entre lo que la organización necesita de ti y lo que realmente estás sosteniendo en tus competencias clave.",
        identity: ["Consciente", "Irregular", "Limitado"]
      };
    }

    if (keyAverage < 60 || (activeGoals.length > 0 && completedGoals.length === 0)) {
      return {
        key: "activacion",
        label: "En activación",
        summary:
          "Ya hay señales de movimiento, pero todavía estás convirtiendo intención en ejecución visible y consistente.",
        identity: ["Intencional", "Reactivo", "Emergente"]
      };
    }

    if (keyAverage < 75) {
      return {
        key: "construccion",
        label: "En construcción",
        summary:
          "Tu base ya es reconocible, pero aún necesitas más consistencia para que tus competencias clave pesen de verdad en tu impacto.",
        identity: ["Comprometido", "Constante", "Visible"]
      };
    }

    return {
      key: "consolidacion",
      label: "En consolidación",
      summary:
        "Tu perfil ya muestra solidez; el siguiente salto está en mantener el nivel y convertirlo en influencia sostenida.",
      identity: ["Estratégico", "Disciplinado", "Influyente"]
    };
  }

  function formatMemoryDate(dateString) {
    if (!dateString) return "";
    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  }

  function getMemorySummary() {
    const parts = [];

    if (coachMemory.lastConversationAt) {
      parts.push(`Última conversación: ${formatMemoryDate(coachMemory.lastConversationAt)}.`);
    }
    if (coachMemory.lastStage) {
      parts.push(`Última etapa detectada: ${coachMemory.lastStage}.`);
    }
    if (coachMemory.lastTopics?.length) {
      parts.push(`Temas tratados: ${coachMemory.lastTopics.join(", ")}.`);
    }
    if (coachMemory.lastPendingGoals?.length) {
      parts.push(`Metas pendientes detectadas: ${coachMemory.lastPendingGoals.slice(0, 4).join(", ")}.`);
    }
    if (coachMemory.lastCompletedGoals?.length) {
      parts.push(`Metas cumplidas detectadas: ${coachMemory.lastCompletedGoals.slice(0, 3).join(", ")}.`);
    }

    return parts.join(" ");
  }

  function buildProfileStr() {
    const totalComp = getRadarEntries().length;
    const stage = getCoachStage();
    const keyStrong = sortEntriesDesc(getKeyCompetencyEntries()).slice(0, 3);
    const keyWeak = sortEntriesAsc(getKeyCompetencyEntries()).slice(0, 4);
    const complementaryStrong = sortEntriesDesc(getComplementaryCompetencyEntries()).slice(0, 2);

    return `Etapa interna detectada: ${stage.label}. Competencias clave asignadas (${competenciasClave.length}): ${competenciasClave.join(", ") || "ninguna"}. Total de competencias con progreso: ${totalComp}. Fortalezas clave internas: ${keyStrong.map(item => `${item.capacity} (${parseFloat(Number(item.value).toFixed(1))}%)`).join(", ") || "sin datos"}. Brechas clave internas: ${keyWeak.map(item => `${item.capacity} (${parseFloat(Number(item.value).toFixed(1))}%)`).join(", ") || "sin datos"}. Complementarias destacadas: ${complementaryStrong.map(item => `${item.capacity} (${parseFloat(Number(item.value).toFixed(1))}%)`).join(", ") || "sin datos"}. Metas priorizadas (${goals.length}): ${getGoalSummary(5).join(" | ") || "ninguna"}. Señal de liderazgo: ${hasLeadershipSignal() ? "sí" : "no"}. Usa todo esto como contexto interno, no como listado para el usuario.`;
  }

  function isProfileLoadedForAnalysis() {
    return !loading;
  }

  function getAnalysisContextMeta() {
    return {
      profileReady: isProfileLoadedForAnalysis(),
      competenciasCount: competenciasClave.length,
      radarCount: getRadarEntries().length,
      goalsCount: goals.length
    };
  }

const COACH_COMMON_INSTRUCTIONS = `
Eres un Coach Profesional de Alto Rendimiento dentro de Open KX.

INVARIANTES DE CONTENIDO
- El diagnóstico de fondo debe ser el mismo en cualquier personalidad.
- Las prioridades deben ser las mismas en cualquier personalidad.
- La acción principal recomendada debe ser la misma en cualquier personalidad.
- Lo que cambia entre personalidades es la forma de decirlo, no el fondo.

PRIORIDAD OBLIGATORIA
1. Desarrollo de talento en competencias clave.
2. Cumplimiento de metas y objetivos.
3. Impacto visible y liderazgo si hay señales para ello.
4. Competencias complementarias solo como matiz.

REGLAS GENERALES
- Sé concreto, humano y accionable.
- No uses lenguaje genérico ni robótico.
- No hagas listas de competencias sin interpretarlas.
- No expliques el tono.
- No digas "como coach", "analizando tu perfil" ni frases meta.
- Responde como mensaje final al usuario.
`.trim();

const PERSONALITY_INSTRUCTIONS = {
  motivador: `
VOZ MOTIVADOR
- Misma verdad, mismas prioridades y misma acción central que los otros modos.
- Habla con calidez alta y energía limpia.
- Primero reconoce base real; después empuja.
- Usa frases con algo más de aire y cadencia.
- Debe sentirse cercano, movilizador y confiado.
- Prohibido sonar seco, cortante, cínico o excesivamente frío.
- Prohibido usar giros tipo: "seamos claros", "sin rodeos", "te toca ya", "no pretendas".
`.trim(),

  pragmatico: `
VOZ PRAGMATICO
- Misma verdad, mismas prioridades y misma acción central que los otros modos.
- Habla claro, sobrio y útil.
- Prioriza orden, criterio y siguiente paso.
- Frases limpias, sin épica y sin dureza teatral.
- Prohibido sonar blandito, inspiracional o sarcástico.
`.trim(),

  brutal: `
VOZ BRUTAL
- Misma verdad, mismas prioridades y misma acción central que los otros modos.
- Habla con frontalidad alta y tensión más alta.
- Usa frases más cortas y con más pegada.
- Señala incoherencias, excusas o falta de ejecución de forma directa.
- Puede haber ironía ligera, nunca insulto ni humillación.
- Prohibido sonar cálido, edulcorado o paternal.
- Prohibido usar giros tipo: "vamos juntos", "esto ya suma", "hay margen real para avanzar si enfocamos bien".
`.trim()
};

const COACH_COMMON_INSTRUCTIONS = `
Eres un Coach Profesional de Alto Rendimiento dentro de Open KX.

INVARIANTES DE CONTENIDO
- El diagnóstico de fondo debe ser el mismo en cualquier personalidad.
- Las prioridades deben ser las mismas en cualquier personalidad.
- La acción principal recomendada debe ser la misma en cualquier personalidad.
- Lo que cambia entre personalidades es la forma de decirlo, no el fondo.

PRIORIDAD OBLIGATORIA
1. Desarrollo de talento en competencias clave.
2. Cumplimiento de los objetivos de su organización.
3. Aumentar impacto compartiendo contenido si hay señales de liderazgo, visibilidad o capacidad de influencia.
4. Desarrollo de talento en competencias complementarias solo como matiz.

REGLAS CLAVE
- Sé pro, conciso, claro, humano y accionable.
- Evita teoría innecesaria.
- Prioriza impacto sobre explicación.
- Detecta incoherencias y exprésalas claramente.
- Usa ejemplos concretos si ayudan.
- Mantén respuestas estructuradas.
- No uses lenguaje genérico ni robótico.
- Cada respuesta debe sentirse personalizada y basada en datos reales.
- El usuario debe sentir: "esto me conoce mejor de lo que esperaba".
- No repitas competencias como una lista; interprétalas.
- Cuando hables de competencias clave, háblalas como desarrollo de talento.
- Cuando hables de competencias complementarias, háblalas también como desarrollo de talento, pero siempre en segundo plano.
- Cuando hables de metas, háblalas como capacidad para cumplir los objetivos de su organización.
- Cuando hables de compartir contenido, háblalo como palanca para aumentar impacto, visibilidad y referencia interna.
- No des más de 3 acciones cuando toque proponer acciones.
- Nada de prefacios explicativos.
- Nada de "como coach", "analizando tu perfil" o frases meta.
- No expliques el tono: simplemente úsalo.
- Habla como alguien que ya ha entendido al usuario y va a lo importante.
`.trim();

const PERSONALITY_INSTRUCTIONS = {
  motivador: `
VOZ MOTIVADOR
- Misma verdad, mismas prioridades y misma acción central que los otros modos.
- Habla con calidez alta, energía limpia y confianza.
- Reconoce lo que sí existe antes de empujar lo que falta.
- Usa una cadencia algo más viva y cercana.
- Debe sentirse humano, movilizador y nada frío.
- No suenes seco, cortante ni sarcástico.
`.trim(),

  pragmatico: `
VOZ PRAGMATICO
- Misma verdad, mismas prioridades y misma acción central que los otros modos.
- Habla claro, sobrio, ordenado y útil.
- Prioriza foco, criterio, orden y siguiente paso.
- Frases limpias, sin épica y sin dureza teatral.
- No suenes blandito, inspiracional ni sarcástico.
`.trim(),

  brutal: `
VOZ BRUTAL
- Misma verdad, mismas prioridades y misma acción central que los otros modos.
- Habla con frontalidad alta y más tensión.
- Usa frases más cortas y con más pegada.
- Señala incoherencias, excusas o falta de ejecución con claridad.
- Puede haber ironía ligera, nunca insulto ni humillación.
- No suenes cálido, edulcorado ni paternal.
`.trim()
};

function buildCoachPromptBase(personalityKey, extraInstructions = "") {
  return {
    instructions: `${COACH_COMMON_INSTRUCTIONS}

${PERSONALITY_INSTRUCTIONS[personalityKey]}`,
    input: `MEMORIA PREVIA
${getMemorySummary() || "Sin memoria previa relevante."}

PERFIL BASE
${buildProfileStr()}

TAREA ACTUAL
${extraInstructions}`.trim()
  };
}
  
  function buildFallbackBenchmark() {
    const weakKey = sortEntriesAsc(getKeyCompetencyEntries()).slice(0, 2);
    const strongKey = sortEntriesDesc(getKeyCompetencyEntries()).slice(0, 1);
    const activeGoals = getPrioritizedGoals(2).map(getGoalName).filter(Boolean);

    const weakText = weakKey.length
      ? "todavía se percibe una distancia respecto a los perfiles que hoy están sosteniendo con más consistencia los comportamientos críticos del entorno"
      : "todavía no estás dejando una señal tan estable como la de los perfiles más consistentes del entorno";

    const strongText = strongKey.length
      ? "Aun así, sí se aprecia una base valiosa que te da margen real para recortar esa distancia si ordenas mejor tu ejecución"
      : "Aun así, sí hay margen claro para acercarte a ese nivel si conviertes mejor la intención en consistencia";

    const goalsText = activeGoals.length
      ? `Esa diferencia también se nota en cómo estás empujando metas como ${activeGoals.join(", ")}, donde todavía falta una tracción más visible y sostenida.`
      : "Esa diferencia también se nota en la falta de una tracción visible y sostenida sobre prioridades concretas.";

    return `Ahora mismo ${weakText}. ${strongText}. ${goalsText}`;
  }

  function buildFallbackConversationSummary(personalityKey = personality) {
  const stage = getCoachStage();
  const goalNames = getPrioritizedGoals(2).map(getGoalName).filter(Boolean);

  const opening = getToneText(personalityKey, {
    motivador: `Ahora mismo estás en un momento ${stage.label.toLowerCase()}, pero lo importante es que sí hay margen real para moverte mejor.`,
    pragmatico: `Ahora mismo estás en un momento ${stage.label.toLowerCase()}, con margen real para moverte mejor.`,
    brutal: `Ahora mismo estás en un momento ${stage.label.toLowerCase()}, y todavía no lo estás convirtiendo en todo lo que podría dar de sí.`
  });

  const goalsLine = goalNames.length > 0
    ? getToneText(personalityKey, {
        motivador: `Eso también se nota en metas como ${goalNames.join(", ")}, donde ya hay intención, pero todavía falta más tracción visible.`,
        pragmatico: `Eso también se nota en metas como ${goalNames.join(", ")}, donde todavía falta más tracción visible.`,
        brutal: `Eso también se nota en metas como ${goalNames.join(", ")}, donde la intención todavía pesa más que la ejecución.`
      })
    : getToneText(personalityKey, {
        motivador: "Ahora toca convertir ese margen en una prioridad concreta para que el avance se vea de verdad.",
        pragmatico: "Ahora toca convertir ese margen en una prioridad concreta.",
        brutal: "Si no lo conviertes en una prioridad concreta, se quedará en sensación de margen."
      });

  const close = getToneText(personalityKey, {
    motivador: "Si eliges bien dónde poner el foco y haces una acción visible hoy, esta conversación ya puede servirte de verdad.",
    pragmatico: "Si eliges bien dónde poner el foco y haces una acción visible hoy, esta conversación ya sirve para algo real.",
    brutal: "Si hoy no sale una acción visible, esta conversación no cambia nada."
  });

  return [opening, goalsLine, close].join(" ");
}

  function buildGoalsChatFallback(personalityKey = personality) {
  const prioritizedGoals = getPrioritizedGoals(5);
  const completedGoals = goals.filter(goal => isGoalCompleted(goal));
  const inProgressGoals = goals.filter(goal => getGoalStatusLabel(goal) === "en progreso");
  const overdueGoals = goals.filter(goal => isGoalOverdue(goal));
  const nextGoal = prioritizedGoals[0];

  if (!goals.length) {
    return getToneText(personalityKey, {
      motivador: "Ahora mismo no veo metas activas en tu perfil. No pasa nada, pero sí conviene ordenar esto ya: define una meta concreta con fecha y una primera acción pequeña.",
      pragmatico: "Ahora mismo no veo metas activas en tu perfil. Define una meta concreta con fecha y una primera acción pequeña.",
      brutal: "Ahora mismo no veo metas activas en tu perfil. Sin una meta concreta, todo se queda en intención difusa. Define una con fecha y una primera acción ya."
    });
  }

  const parts = [];

  parts.push(
    `Ahora mismo tienes ${goals.length} meta${goals.length === 1 ? "" : "s"}: ${completedGoals.length} cerrada${completedGoals.length === 1 ? "" : "s"}, ${inProgressGoals.length} en progreso y ${overdueGoals.length} fuera de fecha.`
  );

  if (overdueGoals.length > 0) {
    parts.push(
      getToneText(personalityKey, {
        motivador: `La urgencia real está en ${overdueGoals.map(goal => `"${getGoalName(goal)}"`).slice(0, 2).join(" y ")}, y aquí hay una oportunidad clara de recuperar tracción.`,
        pragmatico: `La urgencia real está en ${overdueGoals.map(goal => `"${getGoalName(goal)}"`).slice(0, 2).join(" y ")}.`,
        brutal: `La urgencia real está en ${overdueGoals.map(goal => `"${getGoalName(goal)}"`).slice(0, 2).join(" y ")}. Ahí es donde ahora mismo se ve el atasco.`
      })
    );
  }

  if (nextGoal) {
    parts.push(
      getToneText(personalityKey, {
        motivador: `Si tuviera que enfocarte en una ahora, sería "${getGoalName(nextGoal)}".`,
        pragmatico: `Si tuviera que ordenar tu foco ahora, sería en "${getGoalName(nextGoal)}".`,
        brutal: `Si hay que elegir una ahora, es "${getGoalName(nextGoal)}".`
      })
    );
  }

  parts.push(
    getToneText(personalityKey, {
      motivador: "No intentes moverlo todo a la vez. Elige una y hazla avanzar de verdad.",
      pragmatico: "No intentes empujar todo a la vez. Cierra o desbloquea una primero.",
      brutal: "No empujes todo a la vez. Cierra una."
    })
  );

  return parts.join(" ");
}

  function buildFallbackAnalysis(personalityKey = personality) {
    const stage = getCoachStage();
    const keyStrong = sortEntriesDesc(getKeyCompetencyEntries()).slice(0, 3);
    const keyWeak = sortEntriesAsc(getKeyCompetencyEntries()).slice(0, 3);
    const prioritizedGoals = getPrioritizedGoals(5);
    const activeGoals = prioritizedGoals.map(getGoalName).filter(Boolean);
    const overdueGoal = prioritizedGoals.find(goal => isGoalOverdue(goal));
    const nextPriorityGoal = prioritizedGoals.find(goal => !isGoalCompleted(goal));
    const weakFocus = keyWeak[0]?.capacity || null;
    const leadSignal = hasLeadershipSignal();

    const hasStrongBase = keyStrong.length > 0;
    const hasGaps = keyWeak.length > 0;
    const hasGoals = activeGoals.length > 0;

    const realityParts = [];

    if (hasStrongBase) {
      realityParts.push(
        "Ahora mismo sí se percibe que tienes base y recursos para aportar más valor del que todavía estás consiguiendo sostener con continuidad."
      );
    } else {
      realityParts.push(
        "Ahora mismo todavía no se percibe una base suficientemente sólida y visible, y eso hace que tu progreso se sienta más frágil de lo que podría ser."
      );
    }

    if (stage.key === "desalineado") {
      realityParts.push(
        "La sensación general no es de falta de capacidad, sino de desajuste entre lo que podrías dar y lo que realmente está quedando consolidado en tu día a día."
      );
    } else if (stage.key === "activacion") {
      realityParts.push(
        "Ya hay señales de movimiento, pero todavía no la consistencia necesaria para que ese avance se vea estable y creíble."
      );
    } else if (stage.key === "construccion") {
      realityParts.push(
        "Tu evolución ya empieza a tener forma, pero aún necesita más regularidad para que gane peso de verdad."
      );
    } else {
      realityParts.push(
        "Tu momento actual no pide empezar desde cero, sino consolidar mejor lo que ya se está moviendo para que tenga más impacto real."
      );
    }

    if (hasGoals) {
      realityParts.push(
        `Eso también se nota en cómo estás llevando metas como ${activeGoals.slice(0, 3).join(", ")}, donde hay intención y cierto movimiento, pero todavía no una tracción suficientemente visible.`
      );
    } else {
      realityParts.push(
        "También se nota en que todavía falta una prioridad concreta que ordene mejor tu energía y haga más visible tu avance."
      );
    }

    if (hasGaps) {
      realityParts.push(
        "El siguiente salto no depende tanto de hacer más cosas, sino de ordenar mejor el foco y sostener durante más tiempo aquello que hoy más condiciona tu evolución."
      );
    } else {
      realityParts.push(
        "El siguiente salto depende sobre todo de convertir mejor tu intención en hábitos visibles y sostenidos."
      );
    }

    const brechas = [
      "Todavía hay una distancia clara entre tu potencial real y la consistencia con la que lo estás convirtiendo en resultados visibles.",
      hasGoals
        ? "Tus metas activas necesitan más tracción y menos sensación de avance intermitente."
        : "Necesitas una prioridad más concreta y sostenida para que el avance deje de ser difuso.",
      "Te conviene dejar de repartir energía entre demasiados frentes y proteger mucho mejor lo verdaderamente importante."
    ];

    const incoherencias = [
      "Hay intención de mejorar, pero esa intención no siempre se traduce con la claridad suficiente en hábitos, decisiones y señales visibles.",
      "Sabes que puedes dar más, pero todavía no estás protegiendo ese crecimiento con la disciplina y la continuidad que requiere."
    ];

    const riesgo =
      "Si sigues igual, tu evolución puede quedarse en una sensación de potencial no terminado: se verá que hay base, pero no la solidez suficiente como para que tu crecimiento resulte claro, estable y creíble.";

    const acciones = [
      weakFocus
        ? `Competencias clave: durante los próximos 7 días centra una práctica concreta en ${weakFocus} y deja una evidencia visible de mejora antes de terminar la semana.`
        : "Competencias clave: protege una conducta concreta esta semana para que tu nivel deje de depender de días buenos y empiece a verse estable.",
      overdueGoal
        ? `Metas: la prioridad inmediata es desbloquear "${getGoalName(overdueGoal)}", porque ya va fuera de fecha. Define hoy mismo el siguiente paso y ciérralo esta semana.`
        : nextPriorityGoal
          ? `Metas: convierte "${getGoalName(nextPriorityGoal)}" en tu foco real de esta semana y haz una acción visible sobre ella antes de la próxima revisión.`
          : "Metas: define hoy una prioridad concreta para los próximos 7 días y trátala como si ya tuviera fecha de entrega.",
      leadSignal
        ? "Liderazgo visible: si ya hay una señal de liderazgo en tu perfil, te toca dar ejemplo compartiendo más contenido útil y moviendo conversación; liderar también es hacer visible criterio para otros."
        : "Visibilidad e influencia: comparte más contenido útil esta semana para que tu avance no se quede solo en trabajo interno y empiece a generar referencia en otros."
    ];

  const realidad = getToneText(personalityKey, {
  motivador: realityParts.join(" "),
  pragmatico: realityParts.join(" "),
  brutal: realityParts.join(" ")
});

const benchmark = getToneText(personalityKey, {
  motivador: buildFallbackBenchmark(),
  pragmatico: buildFallbackBenchmark(),
  brutal: buildFallbackBenchmark()
});

const brechasByTone = {
  motivador: [
    "Hay más capacidad de la que todavía estás consiguiendo convertir en resultados visibles y sostenidos.",
    hasGoals
      ? "Tus metas activas necesitan más tracción y menos avance intermitente."
      : "Necesitas una prioridad más concreta y sostenida para que el avance deje de ser difuso.",
    "Te va a ayudar mucho dejar de repartir energía entre demasiados frentes y proteger mejor lo verdaderamente importante."
  ],
  pragmatico: [
    "Todavía hay una distancia clara entre tu potencial real y la consistencia con la que lo estás convirtiendo en resultados visibles.",
    hasGoals
      ? "Tus metas activas necesitan más tracción y menos sensación de avance intermitente."
      : "Necesitas una prioridad más concreta y sostenida para que el avance deje de ser difuso.",
    "Te conviene dejar de repartir energía entre demasiados frentes y proteger mucho mejor lo verdaderamente importante."
  ],
  brutal: [
    "Hay una distancia clara entre lo que podrías dar y lo que realmente estás sosteniendo.",
    hasGoals
      ? "Tus metas activas siguen teniendo más intención que tracción."
      : "Sin una prioridad concreta, el avance se queda difuso.",
    "Sigues repartiendo energía en demasiados frentes y eso te está restando impacto."
  ]
};

const incoherenciasByTone = {
  motivador: [
    "Hay intención de mejorar, pero todavía no se está traduciendo con suficiente claridad en hábitos, decisiones y señales visibles.",
    "Sabes que puedes dar más, y ahora toca proteger ese crecimiento con más disciplina y continuidad."
  ],
  pragmatico: [
    "Hay intención de mejorar, pero esa intención no siempre se traduce con la claridad suficiente en hábitos, decisiones y señales visibles.",
    "Sabes que puedes dar más, pero todavía no estás protegiendo ese crecimiento con la disciplina y la continuidad que requiere."
  ],
  brutal: [
    "Dices que quieres mejorar, pero eso todavía no aparece con suficiente claridad en tus hábitos y decisiones.",
    "Sabes que puedes dar más, pero todavía no lo estás protegiendo con la disciplina que hace falta."
  ]
};

const riesgoByTone = getToneText(personalityKey, {
  motivador: "Si sigues igual, puedes quedarte por debajo de lo que realmente podrías consolidar. Hay base, pero ahora toca convertirla en algo más sólido, visible y creíble.",
  pragmatico: "Si sigues igual, tu evolución puede quedarse en una sensación de potencial no terminado: se verá que hay base, pero no la solidez suficiente como para que tu crecimiento resulte claro, estable y creíble.",
  brutal: "Si sigues igual, te vas a quedar en tierra de nadie: con base, sí, pero sin la solidez suficiente como para que tu crecimiento resulte claro y creíble."
});

const accionesByTone = {
  motivador: [
    weakFocus
      ? `Competencias clave: durante los próximos 7 días centra una práctica concreta en ${weakFocus} y deja una evidencia visible de mejora antes de terminar la semana.`
      : "Competencias clave: protege una conducta concreta esta semana para que tu nivel empiece a verse más estable.",
    overdueGoal
      ? `Metas: la prioridad inmediata es desbloquear "${getGoalName(overdueGoal)}", porque ya va fuera de fecha. Define hoy mismo el siguiente paso y ciérralo esta semana.`
      : nextPriorityGoal
        ? `Metas: convierte "${getGoalName(nextPriorityGoal)}" en tu foco real de esta semana y haz una acción visible sobre ella antes de la próxima revisión.`
        : "Metas: define hoy una prioridad concreta para los próximos 7 días y trátala como si ya tuviera fecha de entrega.",
    leadSignal
      ? "Liderazgo visible: si ya hay una señal de liderazgo en tu perfil, ahora toca dar ejemplo compartiendo más contenido útil y moviendo conversación."
      : "Visibilidad e influencia: comparte más contenido útil esta semana para que tu avance también se haga visible para otros."
  ],
  pragmatico: [
    weakFocus
      ? `Competencias clave: durante los próximos 7 días centra una práctica concreta en ${weakFocus} y deja una evidencia visible de mejora antes de terminar la semana.`
      : "Competencias clave: protege una conducta concreta esta semana para que tu nivel deje de depender de días buenos y empiece a verse estable.",
    overdueGoal
      ? `Metas: la prioridad inmediata es desbloquear "${getGoalName(overdueGoal)}", porque ya va fuera de fecha. Define hoy mismo el siguiente paso y ciérralo esta semana.`
      : nextPriorityGoal
        ? `Metas: convierte "${getGoalName(nextPriorityGoal)}" en tu foco real de esta semana y haz una acción visible sobre ella antes de la próxima revisión.`
        : "Metas: define hoy una prioridad concreta para los próximos 7 días y trátala como si ya tuviera fecha de entrega.",
    leadSignal
      ? "Liderazgo visible: si ya hay una señal de liderazgo en tu perfil, te toca dar ejemplo compartiendo más contenido útil y moviendo conversación; liderar también es hacer visible criterio para otros."
      : "Visibilidad e influencia: comparte más contenido útil esta semana para que tu avance no se quede solo en trabajo interno y empiece a generar referencia en otros."
  ],
  brutal: [
    weakFocus
      ? `Competencias clave: durante los próximos 7 días centra una práctica concreta en ${weakFocus} y deja una evidencia visible de mejora antes de terminar la semana.`
      : "Competencias clave: fija una conducta concreta esta semana y haz que se vea.",
    overdueGoal
      ? `Metas: la prioridad inmediata es desbloquear "${getGoalName(overdueGoal)}", porque ya va fuera de fecha. Define hoy el siguiente paso y ciérralo esta semana.`
      : nextPriorityGoal
        ? `Metas: convierte "${getGoalName(nextPriorityGoal)}" en tu foco real de esta semana y mueve una acción visible antes de la próxima revisión.`
        : "Metas: define hoy una prioridad concreta para los próximos 7 días y compórtate como si ya fuera una entrega real.",
    leadSignal
      ? "Liderazgo visible: si ya hay señal de liderazgo, demuéstralo compartiendo más contenido útil y generando conversación."
      : "Visibilidad e influencia: comparte más contenido útil esta semana para que tu avance no se quede encerrado en ti."
  ]
};

return {
  etapa: {
    nombre: stage.label,
    lectura: stage.summary
  },
  realidad,
  benchmark,
  brechas: brechasByTone[personalityKey],
  incoherencias: incoherenciasByTone[personalityKey],
  riesgo: riesgoByTone,
  acciones: accionesByTone[personalityKey],
  identidad: stage.identity
};
  }

  function buildFallbackConversationExtras(personalityKey = personality) {
  const weakestKey = sortEntriesAsc(getKeyCompetencyEntries()).slice(0, 1)[0];
  const strongestKey = sortEntriesDesc(getKeyCompetencyEntries()).slice(0, 1)[0];
  const prioritizedGoal = getPrioritizedGoals(1)[0];
  const firstGoal = prioritizedGoal ? getGoalName(prioritizedGoal) : null;

  return {
    autoengano: weakestKey
      ? getToneText(personalityKey, {
          motivador: `Te estás diciendo que con el tiempo bastará, pero la realidad es que la brecha en ${weakestKey.capacity} sigue marcando tu techo. La buena noticia es que esto sí se puede mover si lo atacas de verdad.`,
          pragmatico: `Te estás contando que con el tiempo bastará, cuando la realidad es que la brecha en ${weakestKey.capacity} sigue marcando tu techo.`,
          brutal: `Te estás contando que con el tiempo bastará, y no. La brecha en ${weakestKey.capacity} sigue marcando tu techo.`
        })
      : getToneText(personalityKey, {
          motivador: "Te estás diciendo que con intención basta, pero lo que realmente va a mover esto es constancia visible.",
          pragmatico: "Te estás contando que con intención basta, cuando lo que falta es constancia visible.",
          brutal: "Te estás contando que con intención basta. No basta. Falta constancia visible."
        }),

    topFreno: firstGoal
      ? getToneText(personalityKey, {
          motivador: `Tu freno principal ahora mismo es no convertir la meta "${firstGoal}" en una acción pequeña, concreta y repetible.`,
          pragmatico: `Tu freno principal es no convertir la meta "${firstGoal}" en una acción pequeña, concreta y repetible.`,
          brutal: `Tu freno principal es seguir sin convertir "${firstGoal}" en una acción pequeña, concreta y repetible.`
        })
      : weakestKey
        ? getToneText(personalityKey, {
            motivador: `Tu freno principal es seguir dejando ${weakestKey.capacity} para más adelante, cuando justo ahí hay una oportunidad clara de cambio.`,
            pragmatico: `Tu freno principal es seguir dejando ${weakestKey.capacity} para más adelante.`,
            brutal: `Tu freno principal es seguir dejando ${weakestKey.capacity} para más adelante.`
          })
        : getToneText(personalityKey, {
            motivador: "Tu mayor freno ahora mismo es la falta de foco sostenido.",
            pragmatico: "Tu mayor freno es la falta de foco sostenido.",
            brutal: "Tu mayor freno es la falta de foco sostenido."
          }),

    siManager: strongestKey
      ? getToneText(personalityKey, {
          motivador: `Veo una base buena en ${strongestKey.capacity}, y precisamente por eso ahora toca verte ejecutar con ese mismo nivel en lo que hoy más te limita.`,
          pragmatico: `Veo una base buena en ${strongestKey.capacity}, pero necesito verte ejecutar con el mismo nivel en lo que hoy más te limita.`,
          brutal: `Veo una base buena en ${strongestKey.capacity}, pero no me sirve si luego no ejecutas con ese nivel donde más flojeas.`
        })
      : getToneText(personalityKey, {
          motivador: "Ahora mismo necesito menos intención declarada y más señales claras de progreso real.",
          pragmatico: "Ahora mismo necesito menos discurso y más señales claras de progreso real.",
          brutal: "Ahora mismo necesito menos discurso y más progreso real."
        })
  };
}

  function buildTargetConfig(pref) {
    const weakKeyTargets = sortEntriesAsc(getKeyCompetencyEntries()).map(item => item.capacity);
    const strongKeyTargets = sortEntriesDesc(getKeyCompetencyEntries()).map(item => item.capacity);
    const complementarySupport = sortEntriesDesc(getComplementaryCompetencyEntries())
      .slice(0, 2)
      .map(item => item.capacity);

    if (pref === "debil") {
      const targets = weakKeyTargets.length
        ? weakKeyTargets
        : sortEntriesAsc(getRadarEntries()).map(item => item.capacity);

      return {
        targetCapacities: targets,
        secondaryCapacities: complementarySupport,
        targetLabel: "puntos débiles dentro de tus competencias clave"
      };
    }

    if (pref === "fuerte") {
      const targets = strongKeyTargets.length
        ? strongKeyTargets
        : sortEntriesDesc(getRadarEntries()).map(item => item.capacity);

      return {
        targetCapacities: targets,
        secondaryCapacities: complementarySupport,
        targetLabel: "puntos fuertes dentro de tus competencias clave"
      };
    }

    return {
      targetCapacities: uniqueStrings([
        ...competenciasClave,
        ...getPrioritizedGoals(3).map(getGoalName)
      ]),
      secondaryCapacities: complementarySupport,
      targetLabel: "metas críticas y competencias clave"
    };
  }

  function getRecommendedContents(pref) {
    const { targetCapacities } = buildTargetConfig(pref);

    const oppositeType =
      pref === "debil" ? "fuerte" :
      pref === "fuerte" ? "debil" :
      null;

    const blockedIds = new Set([
      ...(oppositeType ? recommendedByType[oppositeType] : []),
      ...recommendedByType[pref]
    ]);

    const scored = contenidos
      .map(content => {
        const scoring = scoreContentForTargets(content, targetCapacities);
        return {
          content,
          score: scoring.score,
          id: getContentId(content)
        };
      })
      .filter(item => item.score > 0)
      .filter(item => !blockedIds.has(item.id))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return String(a.content.name || "").localeCompare(String(b.content.name || ""));
      });

    let selected = scored.slice(0, 5).map(item => item.content);

    if (selected.length < 5) {
      const selectedIds = new Set(selected.map(item => getContentId(item)));
      const fallback = contenidos
        .filter(content => !blockedIds.has(getContentId(content)))
        .filter(content => !selectedIds.has(getContentId(content)))
        .slice(0, 5 - selected.length);

      selected = [...selected, ...fallback];
    }

    return selected;
  }

  function buildOptionSessionSnapshot(extraPatch = {}) {
    const pendingGoals = goals
      .filter(goal => !isGoalCompleted(goal))
      .map(goal => getGoalName(goal))
      .filter(Boolean)
      .slice(0, 6);

    const completedGoals = goals
      .filter(goal => isGoalCompleted(goal))
      .map(goal => getGoalName(goal))
      .filter(Boolean)
      .slice(0, 6);

    return {
      hasStartedConversation: true,
      lastConversationAt: new Date().toISOString(),
      lastStage: getCoachStage().label,
      lastPendingGoals: pendingGoals,
      lastCompletedGoals: completedGoals,
      ...extraPatch
    };
  }

  function markConversationOpened() {
    updateCoachMemory(prev => ({
      ...prev,
      ...buildOptionSessionSnapshot(),
      visits: (prev.visits || 0) + 1
    }));
  }

  function updateConversationSnapshot(extraPatch = {}) {
    updateCoachMemory(prev => ({
      ...prev,
      ...buildOptionSessionSnapshot(extraPatch)
    }));
  }

  function isOptionBlockedByCooldown(optionKey) {
    const runtime = getRuntimeOptionMemory(optionKey);
    return Boolean(runtime.closedUntil);
  }

  function isOptionVisible(optionKey) {
    return !sessionHiddenOptions.includes(optionKey) && !isOptionBlockedByCooldown(optionKey);
  }

  const visiblePrimaryOptions = useMemo(
    () => PRIMARY_OPTION_KEYS.filter(isOptionVisible),
    [sessionHiddenOptions, coachMemory]
  );

  const visibleExtraOptions = useMemo(
    () => EXTRA_OPTION_KEYS.filter(isOptionVisible),
    [sessionHiddenOptions, coachMemory]
  );

  async function startConversation() {
    resetAnalysisState();
    resetConversationState();
    setActiveMode("conversar");
    setShowPersonalityMenu(false);
    setStep(1);

    const selectedPersonality = PERSONALITIES[personality];
    const hasMemory = coachMemory?.hasStartedConversation;

    markConversationOpened();

    if (!hasMemory) {
      setTyping(true);
      await wait(850);
      setTyping(false);
      addBot(`Hola. Soy tu Coach AI en modo ${selectedPersonality.label}. ${selectedPersonality.emoji}`);

      const prompt = buildCoachPromptBase(
  personality,
  `- Esta es la primera conversación o no hay memoria útil previa.
- Escribe un mensaje natural, humano y breve.
- Nada de sonar robótico.
- El foco principal debe estar en competencias clave y metas.
- Cierra con sensación de que hoy toca elegir bien dónde poner el foco.`
);

      setTyping(true);
      const aiAnalysis = await askClaude(prompt, 320);
      setTyping(false);

    const introMessage = aiAnalysis?.trim()
  ? aiAnalysis.trim()
  : buildFallbackConversationSummary(personality);
      addBot(introMessage);
      updateConversationSnapshot({
        lastCoachQuestion: introMessage
      });
    } else {
      const continueMessage = getToneText(personality, {
  motivador: "Seguimos donde lo dejamos. Elige qué quieres revisar y lo convertimos en avance real.",
  pragmatico: "Seguimos donde lo dejamos. Elige qué quieres revisar y voy al grano.",
  brutal: "Seguimos donde lo dejamos. Elige qué quieres revisar y te digo dónde está el punto crítico."
});
      addBot(continueMessage);
      updateConversationSnapshot({
        lastCoachQuestion: continueMessage
      });
    }

    setStep(2);
  }

  function openCheckInDecision(optionKey) {
    const config = OPTION_CONFIG[optionKey];
    const runtime = getRuntimeOptionMemory(optionKey);
    const contentSuffix =
      runtime.recommendedContent?.length > 0 && optionKey !== "metas"
        ? ` Te recomendé ${runtime.recommendedContent.slice(0, 2).join(" y ")}.`
        : "";

      const question = `${config.checkInQuestion}${contentSuffix}`;
    addBot(question);
    setPendingDecision({
      optionKey,
      yesLabel: config.yesLabel,
      noLabel: config.noLabel
    });

    updateConversationSnapshot({
      lastTopics: uniqueStrings([...(coachMemory.lastTopics || []), optionKey]).slice(-6),
      lastCoachQuestion: question
    });
  }

  function closeOptionFor24Hours(optionKey, outcome, message) {
    const now = Date.now();
    updateOptionMemory(optionKey, {
      ...DEFAULT_OPTION_STATE,
      opened: true,
      lastOpenedAt: new Date(now).toISOString(),
      lastMessage: message,
      lastOutcome: outcome,
      lastOutcomeAt: new Date(now).toISOString(),
      closedUntil: new Date(now + CHECK_IN_COOLDOWN_MS).toISOString()
    });
  }

  function handleDecision(answer) {
    if (!pendingDecision) return;

    const { optionKey, yesLabel, noLabel } = pendingDecision;
    const config = OPTION_CONFIG[optionKey];

    addUser(answer ? yesLabel : noLabel);

    const reply = answer ? config.yesReply : config.noReply;
    addBot(reply);

    closeOptionFor24Hours(optionKey, answer ? "yes" : "no", reply);

    updateConversationSnapshot({
      lastTopics: uniqueStrings([...(coachMemory.lastTopics || []), optionKey]).slice(-6),
      lastCoachQuestion: reply
    });

    setPendingDecision(null);
    setShowContinuePrompt(true);
  }

  async function generateGoalsAnalysis() {
    setStep(3);

    setTyping(true);
    await wait(650);
    setTyping(false);
        addBot(getToneText(personality, {
  motivador: "Vamos a por tus metas, porque aquí hay margen real para avanzar si enfocamos bien.",
  pragmatico: "Voy directa a tus metas.",
  brutal: "Vamos con tus metas. Aquí es donde se ve la verdad."
}));

    const selectedPersonality = PERSONALITIES[personality];

    const goalsPrompt = buildCoachPromptBase(
  personality,
  `- El usuario ha elegido revisar sus metas.
- NO recomiendes contenidos.
- Analiza sus metas actuales con foco en:
  1. cuáles están cumplidas,
  2. cuáles siguen abiertas,
  3. cuáles van tarde,
  4. qué meta debería atacar ahora.
- Máximo 6 líneas.
- Cierra con un siguiente paso muy concreto.`
);

    setTyping(true);
    const aiGoals = await askClaude(goalsPrompt, 320);
    setTyping(false);

    const finalText = aiGoals?.trim()
  ? aiGoals.trim()
  : buildGoalsChatFallback(personality);
    addBot(finalText);

    updateOptionMemory("metas", {
      opened: true,
      lastOpenedAt: new Date().toISOString(),
      lastMessage: finalText,
      needsCheckIn: true,
      closedUntil: null,
      lastOutcome: null,
      lastOutcomeAt: null
    });

    updateConversationSnapshot({
      lastTopics: uniqueStrings([...(coachMemory.lastTopics || []), "metas"]).slice(-6),
      lastGoalReviewAt: new Date().toISOString(),
      lastCoachQuestion: finalText
    });

    setStep(2);
    setShowContinuePrompt(true);
  }

  async function generateRecommendations(pref) {
    setStep(3);

    setTyping(true);
    await wait(700);
    setTyping(false);
    addBot(getToneText(personality, {
  motivador: "Buscando justo lo que más encaja con tu momento para que esto te ayude de verdad.",
  pragmatico: "Buscando solo lo que encaja de verdad con tu momento.",
  brutal: "Buscando solo lo que de verdad te sirve ahora."
}));
    const { targetCapacities, secondaryCapacities, targetLabel } = buildTargetConfig(pref);
    const matched = getRecommendedContents(pref);
    const selectedPersonality = PERSONALITIES[personality];

    setRecommendedByType(prev => ({
      ...prev,
      [pref]: [...new Set([...prev[pref], ...matched.map(item => getContentId(item))])]
    }));

    const contentList = matched
      .map((content, index) => `${index + 1}. "${content.name}" (${content.type || "general"})`)
      .join("\n");

    const recPrompt = buildCoachPromptBase(
  personality,
  `- El usuario quiere trabajar sus ${targetLabel}.
- Competencias objetivo principales: ${targetCapacities.slice(0, 5).join(", ") || "sin datos"}.
- Competencias complementarias secundarias: ${secondaryCapacities?.slice(0, 3).join(", ") || "ninguna"}.
- Contenidos seleccionados:
${contentList}
- Escribe 4 a 6 líneas.
- El foco principal debe estar en competencias clave.
- Si mencionas complementarias, solo como apoyo.
- Cierra diciendo por cuál empezar.`
);

    setTyping(true);
    const aiRec = await askClaude(recPrompt, 260);
    setTyping(false);

   const finalText = aiRec?.trim()
  ? aiRec.trim()
  : getToneText(personality, {
      motivador: "He seleccionado estos contenidos para ayudarte a trabajar lo que más pesa de verdad ahora mismo dentro de tus competencias clave. Empieza por el primero, porque es el que mejor te puede dar tracción inmediata.",
      pragmatico: "He seleccionado estos contenidos para ayudarte a trabajar lo que más pesa de verdad ahora mismo dentro de tus competencias clave. Empieza por el primero, porque es el que mejor te puede dar tracción inmediata.",
      brutal: "He seleccionado estos contenidos para trabajar lo que de verdad pesa ahora en tus competencias clave. Empieza por el primero. Es el que más tracción inmediata te puede dar."
    });


    addBot(finalText);
    addRecommendationBlock(`Recomendaciones para ${targetLabel}`, matched, pref);

    updateOptionMemory(pref, {
      opened: true,
      lastOpenedAt: new Date().toISOString(),
      recommendedContent: matched.map(item => item.name).slice(0, 5),
      lastMessage: finalText,
      needsCheckIn: true,
      closedUntil: null,
      lastOutcome: null,
      lastOutcomeAt: null
    });

    updateConversationSnapshot({
      lastTopics: uniqueStrings([
        ...(coachMemory.lastTopics || []),
        pref === "debil" ? "puntos débiles" : "puntos fuertes"
      ]).slice(-6),
      lastRecommendedAt: new Date().toISOString(),
      lastCoachQuestion: finalText
    });

    setStep(2);
    setShowContinuePrompt(true);
  }

  async function handlePreferencia(pref) {
    const config = OPTION_CONFIG[pref];
    addUser(config.label);
    setSessionHiddenOptions(prev => uniqueStrings([...prev, pref]));
    setShowMoreOptions(false);
    setShowContinuePrompt(false);

    const optionState = getRuntimeOptionMemory(pref);

    if (optionState.opened && optionState.needsCheckIn) {
      openCheckInDecision(pref);
      return;
    }

    if (pref === "metas") {
      await generateGoalsAnalysis();
      return;
    }

    await generateRecommendations(pref);
  }

  function handleOpenMoreOptions() {
    setShowMoreOptions(true);
    setShowContinuePrompt(false);
    addUser("Ver más");
  }

  async function handleExtraOption(type) {
    if (loadingExtraOption) return;

    const config = OPTION_CONFIG[type];
    addUser(config.label);
    setSessionHiddenOptions(prev => uniqueStrings([...prev, type]));
    setShowMoreOptions(false);
    setShowContinuePrompt(false);

    const optionState = getRuntimeOptionMemory(type);
    if (optionState.opened && optionState.needsCheckIn) {
      openCheckInDecision(type);
      return;
    }

    setLoadingExtraOption(true);
    setTyping(true);

    const selectedPersonality = PERSONALITIES[personality];
    const fallback = buildFallbackConversationExtras(personality);

    const prompts = {
  autoengano: buildCoachPromptBase(
    personality,
    `- Explica el principal autoengaño del usuario en 3 a 5 líneas.
- Debe sonar humano e incisivo.
- Devuelve el foco a la brecha clave o a la meta crítica.`
  ),
  topFreno: buildCoachPromptBase(
    personality,
    `- Explica cuál es la top 1 cosa que le está frenando ahora mismo.
- Máximo 4 líneas.
- Conecta el freno con una competencia clave o una meta crítica.`
  ),
  siManager: buildCoachPromptBase(
    personality,
    `- Habla como si fueras su manager y le dieras feedback real.
- Máximo 5 líneas.
- Reconoce una base positiva si existe, pero exige foco en la brecha clave.`
  )
};

    try {
      const raw = await askClaude(prompts[type], 220);
      const cleanText = raw?.trim();

      const fallbackMap = {
        autoengano: fallback.autoengano,
        topFreno: fallback.topFreno,
        siManager: fallback.siManager
      };

       const result = cleanText?.trim()
  ? cleanText.trim()
  : fallbackMap[type];
      setTyping(false);
      addBot(result);

      updateOptionMemory(type, {
        opened: true,
        lastOpenedAt: new Date().toISOString(),
        lastMessage: result,
        needsCheckIn: true,
        closedUntil: null,
        lastOutcome: null,
        lastOutcomeAt: null
      });

      updateConversationSnapshot({
        lastTopics: uniqueStrings([...(coachMemory.lastTopics || []), type]).slice(-6),
        lastCoachQuestion: result
      });
    } catch {
      const fallbackMap = {
        autoengano: fallback.autoengano,
        topFreno: fallback.topFreno,
        siManager: fallback.siManager
      };
const fallbackText = fallbackMap[type];
      setTyping(false);
      addBot(fallbackText);

      updateOptionMemory(type, {
        opened: true,
        lastOpenedAt: new Date().toISOString(),
        lastMessage: fallbackText,
        needsCheckIn: true,
        closedUntil: null,
        lastOutcome: null,
        lastOutcomeAt: null
      });

      updateConversationSnapshot({
        lastTopics: uniqueStrings([...(coachMemory.lastTopics || []), type]).slice(-6),
        lastCoachQuestion: fallbackText
      });
    } finally {
      setLoadingExtraOption(false);
      setStep(2);
      setShowContinuePrompt(true);
    }
  }

  function getTodayDateStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function hasAnalisisTodayAlready() {
    const history = safeParseStorage(ANALYSIS_HISTORY_KEY, []);
    if (!history.length) return false;
    const last = history[0];
    return last?.date === getTodayDateStr() && last?.meta?.profileReady === true;
  }

   function saveAnalisisToHistory(analisiData) {
    const meta = getAnalysisContextMeta();
    if (!meta.profileReady) return;

    const history = safeParseStorage(ANALYSIS_HISTORY_KEY, []);
    const entry = {
      id: Date.now().toString(),
      date: getTodayDateStr(),
      dateLabel: new Date().toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      }),
      timeLabel: new Date().toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit"
      }),
      data: analisiData,
      meta
    };
    const next = [entry, ...history].slice(0, MAX_ANALYSIS_HISTORY);
    localStorage.setItem(ANALYSIS_HISTORY_KEY, JSON.stringify(next));
    setAnalisisHistory(next);
  }

   async function startAnalysis() {
    if (loading) return;

    resetConversationState();
    resetAnalysisState();
    setActiveMode("analizar");
    setShowPersonalityMenu(false);

    if (hasAnalisisTodayAlready()) {
      setAnalisiBlocked(true);
      return;
    }

    setAnalisiLoading(true);

    const selectedPersonality = PERSONALITIES[personality];

    const prompt = buildCoachPromptBase(
  personality,
  `- Analiza al usuario en profundidad.
- El centro del análisis deben ser SIEMPRE sus competencias clave.
- Las metas son el segundo eje del análisis.
- Las competencias complementarias solo pueden aparecer como matiz sutil y nunca como protagonistas.
- NO uses lenguaje genérico, robótico ni repetitivo.
- NO hables de "ADN", "esencia", "identidad profesional" ni conceptos parecidos dentro de realidad, benchmark, brechas o riesgo.
- No digas que es una simulación.
- No empieces la realidad con frases como "Tu etapa actual es..." ni uses nombres de etapa como apertura del texto.
- No listes competencias una detrás de otra como si fuera un informe.
- Devuelve SOLO JSON válido, sin texto antes ni después:
{
  "etapa": {
    "nombre": "nombre corto de la etapa",
    "lectura": "lectura humana de 2-3 líneas"
  },
  "realidad": "texto de 4-6 líneas, humano, claro y nada repetitivo",
  "benchmark": "comparación con el resto del entorno, tono ejecutivo y humano, empezando con Ahora mismo...",
  "brechas": ["brecha 1", "brecha 2", "brecha 3"],
  "incoherencias": ["incoherencia 1", "incoherencia 2"],
  "riesgo": "texto redactado de 3-4 líneas",
  "acciones": [
    "Competencias clave: acción concreta y específica",
    "Metas: acción concreta, priorizando metas vencidas si existen",
    "Liderazgo visible: acción para compartir más contenido y dar ejemplo"
  ],
  "identidad": ["Palabra1", "Palabra2", "Palabra3"]
}

REGLAS DE CONTENIDO — MUY IMPORTANTES

REALIDAD
- La sección "realidad" debe sonar humana, útil y específica.
- Debe describir en pocas líneas qué dicen los datos del usuario hoy.
- Orden obligatorio dentro de "realidad":
  1. primero competencias clave,
  2. después metas,
  3. y solo al final, de forma sutil, alguna competencia complementaria si realmente aporta contexto.
- La realidad NO debe centrarse en conceptos abstractos.
- La realidad NO debe hablar de ADN ni identidad.
- La realidad NO debe enumerar todas las competencias; debe interpretarlas.
- Si las competencias clave muestran una brecha clara, dilo de forma directa y natural.
- Si las competencias clave muestran fortaleza, reconócelo antes de marcar lo que falta.
- Las metas deben aparecer como consecuencia práctica del nivel actual de sus competencias clave.

BRECHAS CLAVE
- La sección "brechas" debe hablar sí o sí de competencias clave no desarrolladas o todavía poco sólidas.
- Al menos 2 de las 3 brechas deben estar directamente relacionadas con competencias clave.
- Las metas activas o vencidas deben aparecer si refuerzan una brecha real.
- Las competencias complementarias no deben dominar esta sección.

INCOHERENCIAS
- Deben conectar lo que el usuario podría estar dando según sus competencias clave vs lo que realmente está sosteniendo hoy.
- Deben sonar humanas, no como frases vacías.

BENCHMARK
- Debe comparar al usuario con el resto del entorno sin sonar frío.
- Debe empezar directamente con "Ahora mismo...".
- Debe apoyarse sobre todo en competencias clave y ejecución sobre metas.
- No repitas constantemente palabras como "organización", "entorno" o "perfil".

ESTILO
- Evita repetir la misma estructura de frase.
- Evita expresiones comodín como "se percibe", "ahora mismo" o "potencial" demasiadas veces.
- Cada bloque debe sonar escrito por una persona, no por una plantilla.
- El usuario debe sentir que esto le describe de verdad.

PRIORIDAD FINAL
- Las competencias clave son el núcleo del diagnóstico.
- Las metas son el segundo eje.
- Las complementarias solo matizan.
- Devuelve exactamente 3 acciones.
- La acción de competencias debe referirse a competencias clave concretas.
- La acción de metas debe priorizar metas vencidas si existen.
- Si existe señal de liderazgo en el perfil, úsala para reforzar la tercera acción.`
);

    try {
  const raw = await askClaude({
    instructions: prompt.instructions,
    input: prompt.input,
    maxTokens: 950,
    responseFormat: ANALYSIS_RESPONSE_FORMAT
  });

  const parsed = parseAnalysisResponse(raw);
  const result = parsed || buildFallbackAnalysis(personality);
  setAnalisi(result);
  saveAnalisisToHistory(result);

} catch {
  const fallback = buildFallbackAnalysis(personality);
  setAnalisi(fallback);
  saveAnalisisToHistory(fallback);
} finally {
  setAnalisiLoading(false);
  setAnalisiDone(true);
}
  }

  return (
    <div className="coach-page">
      <div className="coach-header">
        <button className="coach-back" onClick={() => navigate(-1)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15,18 9,12 15,6" />
          </svg>
        </button>

        <div className="coach-header-info">
          <div className="coach-avatar">
            <span className="coach-avatar-icon">{PERSONALITIES[personality].emoji}</span>
          </div>

          <div className="coach-header-copy">
            <h1 className="coach-name">Coach AI</h1>
            <span className="coach-status">
              {loading ? "Cargando perfil..." : typing || analisiLoading || loadingExtraOption ? "Pensando..." : "En línea"}
            </span>
          </div>
        </div>

        {!activeMode && (
          <div className="coach-personality-chip-wrap">
            <button
              type="button"
              className="coach-personality-chip"
              onClick={() => setShowPersonalityMenu(prev => !prev)}
            >
              <div className="coach-personality-chip-copy">
                <span className="coach-personality-chip-title">{PERSONALITIES[personality].label}</span>
                <span className="coach-personality-chip-subtitle">Personalidad</span>
              </div>
              <span className="coach-personality-chip-gear">⚙️</span>
            </button>

            {showPersonalityMenu && (
              <div className="coach-header-dropdown">
                {Object.entries(PERSONALITIES).map(([key, option]) => (
                  <button
                    key={key}
                    type="button"
                    className={
                      "personality-dropdown-item" +
                      (personality === key ? " personality-dropdown-item-active" : "")
                    }
                    onClick={() => {
                      savePersonality(key);
                      setShowPersonalityMenu(false);
                    }}
                  >
                    <span className="personality-dropdown-emoji">{option.emoji}</span>
                    <div className="personality-dropdown-copy">
                      <span className="personality-dropdown-label">{option.label}</span>
                      <span className="personality-dropdown-desc">{option.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeMode && (
          <button
            className="coach-mode-back"
            onClick={() => {
              setActiveMode(null);
              resetConversationState();
              resetAnalysisState();
              setShowPersonalityMenu(false);
            }}
          >
            ← Cambiar
          </button>
        )}
      </div>

      {!activeMode && !loading && (
        <>
          <div className="coach-welcome coach-welcome-with-bottom">
            <div className="coach-welcome-avatar">{PERSONALITIES[personality].emoji}</div>
            <h2 className="coach-welcome-title">¿Qué quieres hacer?</h2>
            <p className="coach-welcome-sub">Elige cómo quieres trabajar con tu Coach AI</p>

            <div className="coach-mode-cards">
              <button className="coach-mode-card" onClick={startConversation}>
                <span className="coach-mode-icon">💬</span>
                <div className="coach-mode-card-copy">
                  <span className="coach-mode-mini-label">Conversar</span>
                  <p className="coach-mode-main-title coach-mode-main-title-conversar">
                    Tengamos una conversación
                  </p>
                  <p className="coach-mode-desc">
                  El coach recuerda lo trabajado, te da diferentes pautas para seguir adelante y te ayuda con acciones concretas.
                  </p>
                </div>
              </button>

              <button
                className="coach-mode-card"
                onClick={startAnalysis}
                disabled={loading}
              >
                <span className="coach-mode-icon">🔬</span>
                <div className="coach-mode-card-copy">
                  <span className="coach-mode-mini-label">Analizar</span>
                  <p className="coach-mode-main-title coach-mode-main-title-analizar">
                    ¿Cómo lo estoy haciendo?
                  </p>
                  <p className="coach-mode-desc">
                    Diagnóstico profundo: realidad, benchmark, brechas, riesgos, acciones e identidad profesional.
                  </p>
                </div>
              </button>
            </div>
          </div>

          <BottomBar />
        </>
      )}

      {loading && (
        <div className="coach-loading">
          <div className="coach-loading-dot" />
          <span>Preparando tu sesión de coaching...</span>
        </div>
      )}

      {activeMode === "conversar" && (
        <div className="coach-chat">
          {messages.map(message => {
            if (message.type === "recommendations") {
              return (
                <div key={message.id} className="coach-recs coach-recs-history">
                  {message.items.map((item, index) => (
                    <button
                      className="coach-rec-card"
                      key={`${message.id}-${getContentId(item)}-${index}`}
                      onClick={() => navigate("/explorar")}
                    >
                      <div className="coach-rec-left">
                        <span className="coach-rec-num">{index + 1}</span>
                        <div>
                          <p className="coach-rec-title">{item.name}</p>
                          {item.type && <span className="coach-rec-type">{item.type}</span>}
                        </div>
                      </div>
                      <span className="coach-rec-arrow">›</span>
                    </button>
                  ))}
                </div>
              );
            }

            return (
              <div key={message.id} className={`coach-msg ${message.from === "bot" ? "coach-msg-bot" : "coach-msg-user"}`}>
                {message.from === "bot" && <span className="coach-msg-avatar">{PERSONALITIES[personality].emoji}</span>}
                <div className={`coach-bubble ${message.from === "bot" ? "coach-bubble-bot" : "coach-bubble-user"}`}>
                  {message.text.split("\n").map((line, lineIndex, array) => (
                    <React.Fragment key={lineIndex}>
                      {line}
                      {lineIndex < array.length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            );
          })}

          {typing && (
            <div className="coach-msg coach-msg-bot">
              <span className="coach-msg-avatar">{PERSONALITIES[personality].emoji}</span>
              <div className="coach-bubble coach-bubble-bot coach-typing">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
            </div>
          )}

          {showContinuePrompt && !typing && !pendingDecision && (
            <div className="coach-msg coach-msg-bot">
              <span className="coach-msg-avatar">{PERSONALITIES[personality].emoji}</span>
              <div className="coach-bubble coach-bubble-bot">
                Si quieres, seguimos con otra línea.
              </div>
            </div>
          )}

          {pendingDecision && !typing && (
            <div className="coach-options">
              <button className="coach-option" onClick={() => handleDecision(true)}>
                <span className="coach-option-icon">✅</span>
                {pendingDecision.yesLabel}
              </button>
              <button className="coach-option" onClick={() => handleDecision(false)}>
                <span className="coach-option-icon">❌</span>
                {pendingDecision.noLabel}
              </button>
            </div>
          )}

          {step === 2 && !typing && !pendingDecision && !showMoreOptions && (
            <div className="coach-options">
              {visiblePrimaryOptions.includes("debil") && (
                <button className="coach-option" onClick={() => handlePreferencia("debil")}>
                  <span className="coach-option-icon">{OPTION_CONFIG.debil.icon}</span>
                  {OPTION_CONFIG.debil.label}
                </button>
              )}

              {visiblePrimaryOptions.includes("fuerte") && (
                <button className="coach-option" onClick={() => handlePreferencia("fuerte")}>
                  <span className="coach-option-icon">{OPTION_CONFIG.fuerte.icon}</span>
                  {OPTION_CONFIG.fuerte.label}
                </button>
              )}

              {visiblePrimaryOptions.includes("metas") && (
                <button className="coach-option" onClick={() => handlePreferencia("metas")}>
                  <span className="coach-option-icon">{OPTION_CONFIG.metas.icon}</span>
                  {OPTION_CONFIG.metas.label}
                </button>
              )}

              {visibleExtraOptions.length > 0 && (
                <button className="coach-option coach-option-more" onClick={handleOpenMoreOptions}>
                  <span className="coach-option-icon">➕</span>
                  Ver más
                </button>
              )}
            </div>
          )}

          {step === 2 && showMoreOptions && !typing && !pendingDecision && (
            <div className="coach-options">
              {visibleExtraOptions.includes("autoengano") && (
                <button className="coach-option" onClick={() => handleExtraOption("autoengano")}>
                  <span className="coach-option-icon">{OPTION_CONFIG.autoengano.icon}</span>
                  {OPTION_CONFIG.autoengano.label}
                </button>
              )}

              {visibleExtraOptions.includes("topFreno") && (
                <button className="coach-option" onClick={() => handleExtraOption("topFreno")}>
                  <span className="coach-option-icon">{OPTION_CONFIG.topFreno.icon}</span>
                  {OPTION_CONFIG.topFreno.label}
                </button>
              )}

              {visibleExtraOptions.includes("siManager") && (
                <button className="coach-option" onClick={() => handleExtraOption("siManager")}>
                  <span className="coach-option-icon">{OPTION_CONFIG.siManager.icon}</span>
                  {OPTION_CONFIG.siManager.label}
                </button>
              )}

              <button className="coach-option coach-option-back" onClick={() => setShowMoreOptions(false)}>
                <span className="coach-option-icon">←</span>
                Volver
              </button>
            </div>
          )}

          {step === 2 &&
            !typing &&
            !pendingDecision &&
            visiblePrimaryOptions.length === 0 &&
            visibleExtraOptions.length === 0 && (
              <div className="coach-end-state">
                <p className="coach-end-text">
                  {getToneText(personality, {
  motivador: "Por ahora ya has cerrado todas las líneas disponibles. Vuelve en unas horas y revisamos juntos qué se ha movido.",
  pragmatico: "Por ahora ya has cerrado todas las líneas disponibles. Vuelve en unas horas y revisamos si ha cambiado algo.",
  brutal: "Por ahora ya has cerrado todas las líneas disponibles. Vuelve cuando haya algo nuevo que mover."
})}
                </p>
              </div>
            )}

          <div ref={chatEndRef} />
        </div>
      )}

      {activeMode === "analizar" && (
        <div className="coach-analisi">
          {analisiBlocked && (
            <div className="analisi-blocked-wrap">
              <div className="analisi-blocked-icon">⚡</div>
              <h3 className="analisi-blocked-title">Ya tienes tu análisis de hoy</h3>
              <p className="analisi-blocked-desc">
                Solo puedes hacer un diagnóstico por día. Vuelve mañana para un nuevo análisis.
              </p>
              {analisisHistory.length > 0 && (
                <div className="analisi-historial-wrap">
                  <p className="analisi-historial-label">📋 Historial de análisis anteriores</p>
                  <div className="analisi-historial-list">
                    {analisisHistory.map((entry) => (
                      <button
                        key={entry.id}
                        className={"analisi-historial-item" + (historialSelected?.id === entry.id ? " analisi-historial-item-active" : "")}
                        onClick={() => setHistorialSelected(historialSelected?.id === entry.id ? null : entry)}
                      >
                        <span className="analisi-historial-date">{entry.dateLabel}</span>
                        <span className="analisi-historial-time">{entry.timeLabel}</span>
                        <span className="analisi-historial-arrow">{historialSelected?.id === entry.id ? "▲" : "▼"}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {historialSelected && (
                <div className="analisi-historial-detail">
                  <p className="analisi-historial-detail-label">Análisis del {historialSelected.dateLabel}</p>
                 <AnalisiContent
  analisi={historialSelected.data}
  fallbackBenchmark={buildFallbackBenchmark()}
  personality={personality}
/>
                </div>
              )}
            </div>
          )}

          {!analisiBlocked && analisiLoading && (
            <div className="coach-loading">
              <div className="coach-loading-dot" />
              <span>Generando tu diagnóstico...</span>
            </div>
          )}

          {!analisiBlocked && analisiDone && analisi && (
            <div className="analisi-sections">
             <AnalisiContent
  analisi={analisi}
  fallbackBenchmark={buildFallbackBenchmark()}
  feedbackDiag={feedbackDiag}
  setFeedbackDiag={setFeedbackDiag}
  seguimentFet={seguimentFet}
  setSeguimentFet={setSeguimentFet}
  personality={personality}
/>
            </div>
          )}

          {!analisiBlocked && analisiDone && !analisi && (
            <div className="coach-loading">
              <span>No se pudo generar el diagnóstico. Inténtalo de nuevo.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}