import React, { useEffect, useState } from 'react';
import '../styles/confirmacion.css';
import { useNavigate } from 'react-router-dom';

export default function ConfirmacionPublicacion() {
  const navigate = useNavigate();
  const [progreso, setProgreso] = useState(0);
  const [completado, setCompletado] = useState(false);

  useEffect(() => {
    let valor = 0;
    const intervalo = setInterval(() => {
      valor += 2;
      if (valor >= 100) {
        valor = 100;
        setProgreso(100);
        setCompletado(true);
        clearInterval(intervalo);
      } else {
        setProgreso(valor);
      }
    }, 40);

    return () => clearInterval(intervalo);
  }, []);

  return (
    <div className="confirmacion-wrapper">
      <div className="confirmacion-box">

        <h2 className="titulo">Contenido publicado</h2>

        {!completado && (
          <p className="sub">Tu contenido está siendo procesado</p>
        )}

        {completado && (
          <p className="sub completado-texto">Contenido procesado correctamente</p>
        )}

        <div className="bloque">

          {!completado && (
            <p className="etiqueta">Procesando contenido...</p>
          )}

          {completado && (
            <div className="check-final">✔</div>
          )}

          <div className="barra-progreso">
            <div style={{ width: `${progreso}%` }}></div>
          </div>

          {!completado && (
            <p className="gris">{progreso}% completado</p>
          )}

          {completado && (
            <p className="gris">100% completado</p>
          )}
        </div>

        <div className="bloque">
          <p className="etiqueta puntos-grandes">+50 puntos ganados</p>
          <p className="gris">¡Sigue creando contenido!</p>
        </div>

        <p className="pregunta">¿Qué quieres hacer ahora?</p>

        <div className="botones">
          <button className="btn-lila" onClick={() => navigate('/inicio')}>
            Subir otro contenido
          </button>

          <button className="btn-secundario" onClick={() => navigate('/crear')}>
            Volver al inicio
          </button>
        </div>

      </div>
    </div>
  );
}
