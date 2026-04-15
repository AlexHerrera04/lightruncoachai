import React, { useState } from 'react';
import '../styles/recuperar.css';
import { useNavigate } from 'react-router-dom';

export default function Recuperar() {
  const [email, setEmail] = useState('');
  const [enviat, setEnviat] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setEnviat(true);
  };

  return (
    <div className="recuperar-container">
      <div className="recuperar-box">

        <div className="recuperar-logo">
          <span className="recuperar-logo-asterisk">✳</span>
          <span className="recuperar-logo-open">OPEN</span>
          <span className="recuperar-logo-kx">KX AI</span>
        </div>

        {!enviat ? (
          <>
            <h1 className="recuperar-title">¿Olvidaste tu contraseña?</h1>
            <p className="recuperar-text">
              Introduce tu correo y te enviaremos un enlace para restablecerla.
            </p>

            <form onSubmit={handleSubmit}>
              <label>Email</label>
              <input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit">Enviar enlace</button>
            </form>
          </>
        ) : (
          <div className="recuperar-confirmat">
            <div className="recuperar-check">
              <svg width="32" height="32" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <polyline points="20,6 9,17 4,12"/>
              </svg>
            </div>
            <h1 className="recuperar-title">Enlace enviado</h1>
            <p className="recuperar-text">
              Si existe una cuenta con <strong>{email}</strong>, recibirás un correo con las instrucciones.
            </p>
          </div>
        )}

        <button className="recuperar-volver" onClick={() => navigate('/login')}>
          ← Volver al login
        </button>

      </div>
    </div>
  );
}
