import React from 'react';
import '../styles/informacion.css';
import { useNavigate } from 'react-router-dom';

export default function Informacion() {
  const navigate = useNavigate();

  return (
    <div className="info-container">
      <div className="info-box">

        <div className="info-logo">
          <span className="info-logo-asterisk">✳</span>
          <span className="info-logo-open">OPEN</span>
          <span className="info-logo-kx">KX AI</span>
        </div>

        <h1 className="info-title">Como acceder a la plataforma</h1>

        <p className="info-text">
          Open KX es una plataforma de aprendizaje gamificado que impulsa el desarrollo de competencias mediante experiencias personalizadas para empresas y sus equipos.
        </p>

        <p className="info-subtitle">El acceso está disponible únicamente para:</p>

        <div className="info-cards">
          <div className="info-card">
            <h3>👥 Usuarios enrolados</h3>
            <p>
              Empleados de empresas clientes que utilizan la plataforma para desarrollar su ADN Digital y participar en desafíos de aprendizaje continuo.
            </p>
          </div>

          <div className="info-card">
            <h3>🎓 Expertos y proveedores B2B</h3>
            <p>
              Profesionales externos que comparten su conocimiento mediante videos, demos y contenido educativo para la comunidad.
            </p>
          </div>
        </div>

        <div className="info-contacto">
          <h3>¿Necesitas acceso?</h3>
          <p>
            Contáctanos y te indicaremos los pasos para obtenerlo:{' '}
            <a href="https://openkx.ai/demo/" target="_blank" rel="noreferrer">
              openkx.ai/demo
            </a>
          </p>
          <p>
            Más información en{' '}
            <a href="https://openkx.ai" target="_blank" rel="noreferrer">
              openkx.ai
            </a>
          </p>
        </div>

        <button className="info-link" onClick={() => navigate('/login')}>← Volver al login</button>

      </div>
    </div>
  );
}
