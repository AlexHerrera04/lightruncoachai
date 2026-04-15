import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../styles/explorar.css';
import { useNavigate, useLocation } from 'react-router-dom';
import ContenidoExpandido from './ContenidoExpandido';
import BottomBar from '../components/BottomBar';
import DenunciarVideo from './DenunciarVideo';
import Comentarios from './Comentarios';
import Compartir from './Compartir';
import { getNewContents, getContentDetail } from "../api/api";
import { useSwipeable } from 'react-swipeable';
import { addNotificacion } from '../utils/notificaciones';


const PLANTILLES = [
  { img: "/iconos/Plantilla1Azul.png",        textColor: "white" },
  { img: "/iconos/Plantilla2VerdeOscuro.png",  textColor: "white" },
  { img: "/iconos/Plantilla3VerdeClaro.png",   textColor: "white" },
  { img: "/iconos/Plantilla4Morado.png",       textColor: "white" },
  { img: "/iconos/Plantilla5Rojo.png",         textColor: "white" },
  { img: "/iconos/Plantilla6Blanco.png",       textColor: "#1e293b" },
  { img: "/iconos/Plantilla7Amarillo.png",     textColor: "#1e293b" },
  { img: "/iconos/Plantilla8Naranja.png",      textColor: "white" },
  { img: "/iconos/Plantilla9Negro.png",        textColor: "white" },
  { img: "/iconos/Plantilla10Marron.png",      textColor: "white" },
  { img: "/iconos/Plantilla11Rosa.png",        textColor: "#1e293b" },
];

const FONTS = [
  { family: "'Georgia', serif",                  weight: "900", style: "normal" },
  { family: "'Impact', 'Arial Narrow', sans-serif", weight: "900", style: "normal" },
  { family: "'Courier New', monospace",          weight: "700", style: "normal" },
  { family: "'Trebuchet MS', sans-serif",        weight: "900", style: "italic" },
  { family: "'Arial Black', sans-serif",         weight: "900", style: "normal" },
  { family: "'Times New Roman', serif",          weight: "700", style: "italic" },
];

// 3 estils combinant highlight + color + underline
const TITOL_ESTILS = [
  "highlight_first",   // primera paraula amb fons, resta en color accent
  "underline_mid",     // paraula del mig subratllada, última en color accent
  "highlight_last",    // última paraula amb fons, primera en color accent
];

function TitolEstilitzat({ text, keyword, estil, tc, fontIdx, fontSize }) {
  // Si tenim keyword de la IA, apliquem l'efecte sobre aquella paraula
  // Si no, apliquem sobre l'última paraula com a fallback
  const font = FONTS[fontIdx % FONTS.length];
  const words = text.toUpperCase().split(" ");
  const accent = tc === "white" ? "#f59e0b" : "#7c3aed";
  const bgColor = tc === "white" ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.8)";
  const hlColor = tc === "white" ? "#0f172a" : "white";
  const midIdx = Math.floor(words.length / 2);
  const lastIdx = words.length - 1;
  const shadow = tc === "white" ? "0 2px 20px rgba(0,0,0,0.35)" : "none";

  const baseStyle = {
    fontFamily: font.family,
    fontWeight: font.weight,
    fontStyle: font.style,
    fontSize,
    lineHeight: "1.85",
    letterSpacing: "-0.01em",
    color: tc,
    textShadow: shadow,
  };

  // Troba l'índex de la keyword dins les paraules
  const STOP_WORDS = new Set(["THE","LOS","LAS","UNO","UNA","PARA","CON","POR","QUE","DEL","SUS","TUS","MIS","SER","HAY","SON","EST","ESTE","ESTA","COMO","CUANDO","DONDE","DE","EN","EL","LA","UN","AL","SE","LE","ME","TE","YA","NO","SI"]);
  const isValid = w => w.length >= 5 && !STOP_WORDS.has(w.toUpperCase());
  const kwUpper = (keyword || "").toUpperCase();
  const kwIdx = (kwUpper.length >= 5 && !STOP_WORDS.has(kwUpper))
    ? words.findIndex(w => w.includes(kwUpper) || kwUpper.includes(w))
    : -1;
  // Fallback: paraula vàlida (>= 5 lletres, no stop word)
  const fallbackIdx = words.findIndex(w => isValid(w));
  // Si no n'hi ha cap de vàlida, no aplicar cap efecte (-1 = cap)
  const targetIdx = kwIdx >= 0 ? kwIdx : fallbackIdx >= 0 ? fallbackIdx : -1;

  if (estil === "highlight_first") {
    // Highlight sobre la keyword
    return (
      <div style={baseStyle}>
        {words.map((w, i) => (
          <span key={i} style={
            i === targetIdx
              ? { background: bgColor, color: hlColor, padding: "2px 8px", borderRadius: "4px", margin: "0 2px" }
              : {}
          }>
            {w}{i < lastIdx ? " " : ""}
          </span>
        ))}
      </div>
    );
  }

  if (estil === "color_only") {
    // Només color diferent a la keyword, sense subratllat
    return (
      <div style={baseStyle}>
        {words.map((w, i) => (
          <span key={i} style={{ color: i === targetIdx ? accent : tc }}>
            {w}{i < lastIdx ? " " : ""}
          </span>
        ))}
      </div>
    );
  }

  // highlight_last — highlight keyword + color en una altra
  const otherIdx = words.findIndex((w, i) => i !== targetIdx && isValid(w));
  return (
    <div style={baseStyle}>
      {words.map((w, i) => (
        <span key={i} style={
          i === targetIdx
            ? { background: bgColor, color: hlColor, padding: "2px 8px", borderRadius: "4px", margin: "0 2px" }
            : i === otherIdx && otherIdx !== targetIdx
            ? { color: accent }
            : {}
        }>
          {w}{i < lastIdx ? " " : ""}
        </span>
      ))}
    </div>
  );
}

// Cache de paraules clau per títol
const keywordCache = {};

async function fetchKeyword(title) {
  if (keywordCache[title]) return keywordCache[title];
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 20,
        messages: [{
          role: "user",
          content: `Del siguiente título, devuelve SOLO la palabra más importante o llamativa (máximo 2 palabras). Solo la palabra, sin explicación: "${title}"`
        }]
      })
    });
    const data = await res.json();
    const word = data.content?.[0]?.text?.trim().toUpperCase() || "";
    keywordCache[title] = word;
    return word;
  } catch {
    return "";
  }
}

// Decoracions SVG per cada "estil" (3 estils que roten)
function DecoSVG({ estil, color }) {
  const c = color === "white" ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)";
  if (estil === 0) return (
    <svg style={{position:"absolute",inset:0,width:"100%",height:"100%"}} viewBox="0 0 420 750" preserveAspectRatio="xMidYMid slice">
      <circle cx="350" cy="120" r="180" fill="none" stroke={c} strokeWidth="60"/>
      <circle cx="350" cy="120" r="100" fill="none" stroke={c} strokeWidth="30"/>
      <circle cx="70" cy="650" r="120" fill="none" stroke={c} strokeWidth="50"/>
      <line x1="0" y1="380" x2="420" y2="380" stroke={c} strokeWidth="1.5"/>
      <line x1="0" y1="390" x2="420" y2="390" stroke={c} strokeWidth="0.5"/>
    </svg>
  );
  if (estil === 1) return (
    <svg style={{position:"absolute",inset:0,width:"100%",height:"100%"}} viewBox="0 0 420 750" preserveAspectRatio="xMidYMid slice">
      <rect x="-40" y="80" width="200" height="200" fill="none" stroke={c} strokeWidth="40" transform="rotate(15 100 180)"/>
      <rect x="260" y="480" width="240" height="240" fill="none" stroke={c} strokeWidth="50" transform="rotate(-10 380 600)"/>
      <line x1="0" y1="0" x2="420" y2="750" stroke={c} strokeWidth="1"/>
      <line x1="420" y1="0" x2="0" y2="750" stroke={c} strokeWidth="1"/>
    </svg>
  );
  return (
    <svg style={{position:"absolute",inset:0,width:"100%",height:"100%"}} viewBox="0 0 420 750" preserveAspectRatio="xMidYMid slice">
      <line x1="0" y1="150" x2="420" y2="150" stroke={c} strokeWidth="80"/>
      <line x1="0" y1="600" x2="420" y2="600" stroke={c} strokeWidth="80"/>
      <circle cx="210" cy="375" r="90" fill={c}/>
      <circle cx="210" cy="375" r="50" fill="none" stroke={c} strokeWidth="20"/>
    </svg>
  );
}

function PlantillaVertical({ item }) {
  const idx = (item.id || 0) % PLANTILLES.length;
  const fontIdx = (item.id || 0) % FONTS.length;
  const estilDeco = (item.id || 0) % 3;
  const plantilla = PLANTILLES[idx];
  const tc = plantilla.textColor;
  const nomFont = item.external_source || item.origin || "";
  const [keyword, setKeyword] = useState(keywordCache[item.name] || "");

  useEffect(() => {
    if (!item.name || keyword) return;
    fetchKeyword(item.name).then(setKeyword);
  }, [item.name]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: "12px", overflow: "hidden" }}>
      <img src={plantilla.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <DecoSVG estil={estilDeco} color={tc} />

      {/* TIPUS DE CONTINGUT — dalt */}
      {item.type && (
        <div style={{
          position: "absolute", top: "20px", left: "20px",
          color: tc, fontFamily: "'Inter', sans-serif",
          fontSize: "0.7rem", fontWeight: "800",
          letterSpacing: "0.2em", textTransform: "uppercase",
          opacity: 0.6,
        }}>{item.type}</div>
      )}

      {/* TÍTOL — centre, mida adaptativa + estil */}
      {(() => {
        const chars = (item.name || "").length;
        let fs;
        if (chars <= 15)       fs = "3.6rem";
        else if (chars <= 25)  fs = "3rem";
        else if (chars <= 40)  fs = "2.4rem";
        else if (chars <= 55)  fs = "2rem";
        else if (chars <= 75)  fs = "1.7rem";
        else                   fs = "1.4rem";
        const estilIdx = (item.id || 0) % TITOL_ESTILS.length;
        return (
          <div style={{
            position: "absolute",
            top: "38%", left: "0", right: "0",
            transform: "translateY(-50%)",
            padding: "0 24px",
            textAlign: "center",
          }}>
            <TitolEstilitzat
              text={item.name || ""}
              keyword={keyword}
              estil={TITOL_ESTILS[estilIdx]}
              tc={tc}
              fontIdx={fontIdx}
              fontSize={fs}
            />
          </div>
        );
      })()}

      {/* FONT — baix */}
      {nomFont && (
        <div style={{
          position: "absolute", bottom: "24px", left: "24px", right: "24px",
          display: "flex", alignItems: "center", gap: "8px",
        }}>
          <div style={{ flex: 1, height: "1px", background: tc === "white" ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)" }} />
          <span style={{
            color: tc, fontFamily: "'Inter', sans-serif",
            fontSize: "0.72rem", fontWeight: "700",
            letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.7,
          }}>{nomFont}</span>
        </div>
      )}
    </div>
  );
}

function getImagenVertical(item) {
  return item.public_vertical_image || null;
}

function CompetenciasLimitadas({ industries }) {
  const [expanded, setExpanded] = useState(false);
  if (!industries || industries.length === 0) return null;
  const visible = expanded ? industries : industries.slice(0, 5);
  const hasMore = industries.length > 5;
  return (
    <div className="competencias">
      {visible.map((i, idx) => <span key={idx}>{i.industry}</span>)}
      {hasMore && (
        <button className="ver-mas-btn" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Ver menos' : 'Ver más'}
        </button>
      )}
    </div>
  );
}

export default function Explorar() {
  const location = useLocation();
  const metaParaIniciar = location.state?.metaParaIniciar || null;
  const navigate = useNavigate();

  // TABS
  const [tab, setTab] = useState("parati");

  // Para ti
  const [mostrarContenido, setMostrarContenido] = useState(false);
  const [mostrarDenuncia, setMostrarDenuncia] = useState(false);
  const [mensajeGuardado, setMensajeGuardado] = useState(false);
  const [liked, setLiked] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [mostrarComentarios, setMostrarComentarios] = useState(false);
  const [mostrarCompartir, setMostrarCompartir] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [contenidoSeleccionado, setContenidoSeleccionado] = useState(null);

  // Buscar
  const [busqueda, setBusqueda] = useState("");
  const [visibles, setVisibles] = useState(25);

  const feedRef = useRef(null);
  const itemRefs = useRef([]);
  const indexRef = useRef(0);
  const scrollLockRef = useRef(false);

  useEffect(() => {
    async function fetchContents() {
      try {
        const data = await getNewContents();
        setItems([...data]);
      } catch (error) {
        console.error("Error cargando contenidos:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchContents();
  }, []);

  function navegarAlContenido(id) {
    const idx = items.findIndex(i => i.id === id);
    if (idx !== -1) { setIndex(idx); setMostrarContenido(false); }
  }

  useEffect(() => {
    if (!metaParaIniciar || items.length === 0) return;
    const id = metaParaIniciar.content;
    if (!id) return;
    const existe = items.some(i => i.id === id);
    if (!existe) {
      getContentDetail(id).then(detalle => { setItems(prev => [detalle, ...prev]); setIndex(0); });
    } else {
      if (metaParaIniciar.content) navegarAlContenido(metaParaIniciar.content);
    }
  }, [items, metaParaIniciar]);

  const contenido = items[index];

   useEffect(() => {
    indexRef.current = index;
  }, [index]);

 useEffect(() => {
    if (tab !== "parati") return;
    const root = feedRef.current;
    const nodes = itemRefs.current.filter(Boolean);
    if (!root || !nodes.length) return;

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visible) return;

        const newIndex = Number(visible.target.dataset.index);
        if (!Number.isNaN(newIndex)) {
          setIndex(newIndex);
        }
      },
      {
        root,
        threshold: 0.6
      }
    );

    nodes.forEach(node => observer.observe(node));
    return () => observer.disconnect();
  }, [items, tab]);


    const goToContent = useCallback((targetIndex) => {
    if (!items.length) return;

    const safeIndex = Math.max(0, Math.min(targetIndex, items.length - 1));
    const node = itemRefs.current[safeIndex];

    if (!node || scrollLockRef.current) return;

    scrollLockRef.current = true;
    setIndex(safeIndex);

    node.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    window.setTimeout(() => {
      scrollLockRef.current = false;
    }, 320);
  }, [items.length]);

  const nextContent = useCallback(() => {
    goToContent(indexRef.current + 1);
  }, [goToContent]);

  const prevContent = useCallback(() => {
    goToContent(indexRef.current - 1);
  }, [goToContent]);

  const isInteractiveTarget = useCallback((target) => {
    return target instanceof Element &&
      Boolean(target.closest("button, a, input, textarea, [data-no-swipe='true']"));
  }, []);

  const swipeHandlers = useSwipeable({
    onSwipedUp: ({ event }) => {
      if (tab !== "parati" || isInteractiveTarget(event.target)) return;
      nextContent();
    },
    onSwipedDown: ({ event }) => {
      if (tab !== "parati" || isInteractiveTarget(event.target)) return;
      prevContent();
    },
    delta: 18,
    trackTouch: true,
    trackMouse: true,
    preventScrollOnSwipe: true,
  });

  const handleWheel = useCallback((event) => {
    if (tab !== "parati") return;
    if (Math.abs(event.deltaY) < 12 || scrollLockRef.current) return;

    event.preventDefault();

    if (event.deltaY > 0) {
      nextContent();
      return;
    }

    prevContent();
  }, [nextContent, prevContent, tab]);

  const handleGuardar = () => {
    if (!contenido) return;
    const item = { titulo: contenido.name || "Título desconocido", autor: contenido.origin || "Autor desconocido", imagen: contenido.public_image };
    const guardados = JSON.parse(localStorage.getItem("videosGuardados")) || [];
    guardados.push(item);
    localStorage.setItem("videosGuardados", JSON.stringify(guardados));
    setGuardado(true);
    setMensajeGuardado(true);
    setTimeout(() => setMensajeGuardado(false), 1500);
    addNotificacion({ titulo: "Contenido guardado 🔖", texto: `Has guardado "${contenido?.name || "este contenido"}"`, tipo: "info" });
  };

  const handleVerContenido = async (item) => {
    const target = item || contenido;
    if (!target) return;
    try {
      const detalle = await getContentDetail(target.id);
      setContenidoSeleccionado(detalle);
      setMostrarContenido(true);
    } catch (error) {
      console.error("Error obteniendo detalle:", error);
    }
  };

  // Filtre de cerca
  const resultadosBusqueda = busqueda.trim().length === 0
    ? items
    : items.filter(item => {
        const q = busqueda.toLowerCase();
        return (
          (item.name || "").toLowerCase().includes(q) ||
          (item.short_description || "").toLowerCase().includes(q) ||
          (item.origin || "").toLowerCase().includes(q) ||
          (item.industry || []).some(ind => (ind.industry || "").toLowerCase().includes(q))
        );
      });

  return (
    <>
       <div
        className="explorar-mobile"
        {...swipeHandlers}
        onWheel={handleWheel}
      >

        {/* TABS */}
        <div className="explorar-tabs">
          <button
            className={"explorar-tab" + (tab === "parati" ? " explorar-tab-actiu" : "")}
            onClick={() => setTab("parati")}
          >Para ti</button>
          <button
            className={"explorar-tab" + (tab === "buscar" ? " explorar-tab-actiu" : "")}
            onClick={() => setTab("buscar")}
          >Buscar</button>
        </div>

        {/* ===== PARA TI ===== */}
        {tab === "parati" && (
          <div ref={feedRef} className="parati-feed">
            {!loading && items.length > 0 ? (
              items.map((item, itemIndex) => (
                <section
                  key={item.id || itemIndex}
                  ref={el => (itemRefs.current[itemIndex] = el)}
                  data-index={itemIndex}
                  className="video-slide"
                >
                  <div className="video-container">
                    {getImagenVertical(item)
                      ? <img src={getImagenVertical(item)} alt={item.name} className="video-frame img-real" />
                      : <PlantillaVertical item={item} />}

                    <div className="overlay-text">
                      <h2>{item?.origin || "Autor desconocido"}</h2>
                      <h3>{item?.name || "Cargando título..."}</h3>
                      <p>{item?.short_description || "Cargando descripción..."}</p>
                      <button className="ver-button" onClick={() => handleVerContenido(item)}>Ver contenido</button>
                      <CompetenciasLimitadas industries={item?.industry} />
                    </div>

                    <div className="acciones-mobile">
                      <button className={`accion-btn ${liked && index === itemIndex ? "liked" : ""}`} onClick={() => {
                        const nouEstat = !(liked && index === itemIndex);
                        setIndex(itemIndex);
                        setLiked(nouEstat);
                        if (nouEstat) addNotificacion({ titulo: "Has dado like 👍", texto: `Te ha gustado "${item?.name || "este contenido"}"`, tipo: "social" });
                      }}>
                        <svg width="20" height="20" fill="white" viewBox="0 0 24 24"><path d="M2 21h4V9H2v12zM23 10c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>
                      </button>
                      <button className="accion-btn" onClick={() => {
                        setIndex(itemIndex);
                        setMostrarComentarios(true);
                        addNotificacion({ titulo: "Has comentado 💬", texto: `Has comentado "${item?.name || "este contenido"}"`, tipo: "social" });
                      }}>
                        <svg width="20" height="20" fill="white" viewBox="0 0 24 24"><path d="M21 6h-2v9H7v2c0 .55.45 1 1 1h9l4 4V7c0-.55-.45-1-1-1zM17 2H3c-.55 0-1 .45-1 1v14l4-4h11c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1z"/></svg>
                      </button>
                      <button className={`accion-btn ${guardado && index === itemIndex ? "saved" : ""}`} onClick={() => {
                        setIndex(itemIndex);
                        handleGuardar();
                      }}>
                        <svg width="20" height="20" fill="white" viewBox="0 0 24 24"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
                      </button>
                      <button className="accion-btn" onClick={() => {
                        setIndex(itemIndex);
                        setMostrarCompartir(true);
                        addNotificacion({ titulo: "Has compartido 🔗", texto: `Has compartido "${item?.name || "este contenido"}"`, tipo: "social" });
                      }}>
                        <svg width="20" height="20" fill="white" viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.02-4.11c.54.5 1.25.81 2.07.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.07 8.81C7.53 8.31 6.82 8 6 8c-1.66 0-3 1.34-3 3s1.34 3 3 3c.82 0 1.53-.31 2.07-.81l7.12 4.17c-.05.21-.09.43-.09.64 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>
                      </button>
                      <button className="accion-btn denunciar" onClick={() => {
                        setIndex(itemIndex);
                        setMostrarDenuncia(true);
                      }}>
                        <svg width="20" height="20" fill="white" viewBox="0 0 24 24"><path d="M4 2h14l-4 6 4 6H4v8H2V2z" /></svg>
                      </button>
                    </div>

                    {mensajeGuardado && index === itemIndex && (
                      <div className="mensaje-guardado">Guardado en tu perfil</div>
                    )}

                    
                  </div>
                </section>
              ))
            ) : (
              <div className="video-container">
                <div className="spinner-carga">
                  <div className="spinner-roda"></div>
                  <p>Cargando contenido...</p>
                </div>
              </div>
            )}
          </div>
        )}

       

        {/* ===== BUSCAR ===== */}
        {tab === "buscar" && (
          <div className="buscar-container">
            <div className="buscar-barra-wrap">
              <svg className="buscar-icona" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="7"/><line x1="16.65" y1="16.65" x2="21" y2="21" strokeLinecap="round"/>
              </svg>
              <input
                className="buscar-input"
                type="text"
                placeholder="Busca contenido, autor, tema..."
                value={busqueda}
                onChange={e => { setBusqueda(e.target.value); setVisibles(25); }}
                autoFocus
              />
              {busqueda && (
                <button className="buscar-clear" onClick={() => setBusqueda("")}>✕</button>
              )}
            </div>

            {loading ? (
              <div className="buscar-spinner"><div className="spinner-roda"></div></div>
            ) : resultadosBusqueda.length === 0 ? (
              <div className="buscar-empty">
                <p>No se encontraron resultados para "{busqueda}"</p>
              </div>
            ) : (
              <>
                <div className="buscar-grid">
                  {resultadosBusqueda.slice(0, visibles).map((item, i) => (
                    <div key={item.id || i} className="buscar-card" onClick={() => handleVerContenido(item)}>
                      <div className="buscar-card-img">
                        <img
                          src={item.public_image || item.public_vertical_image}
                          alt={item.name}
                          onError={e => { e.target.style.display = 'none'; }}
                        />
                        {item.content_type && <span className="buscar-card-badge">{item.content_type}</span>}
                        {item.origin && <span className="buscar-card-origen">{item.origin}</span>}
                      </div>
                      <div className="buscar-card-info">
                        <h4>{item.name}</h4>
                        <p>{item.short_description}</p>
                        {item.rating && <span className="buscar-card-rating">{item.rating}</span>}
                      </div>
                    </div>
                  ))}
                </div>
                {resultadosBusqueda.length > visibles && (
                  <button className="buscar-ver-mas" onClick={() => setVisibles(v => v + 25)}>
                    Ver más
                  </button>
                )}
              </>
            )}
          </div>
        )}

        <BottomBar active="explorar" />
      </div>

      {mostrarContenido && contenidoSeleccionado && (
        <ContenidoExpandido contenido={contenidoSeleccionado} onClose={() => setMostrarContenido(false)} />
      )}
      {mostrarDenuncia && <DenunciarVideo onClose={() => setMostrarDenuncia(false)} />}
      {mostrarComentarios && <Comentarios onClose={() => setMostrarComentarios(false)} />}
      {mostrarCompartir && <Compartir onClose={() => setMostrarCompartir(false)} />}
    </>
  );
}
