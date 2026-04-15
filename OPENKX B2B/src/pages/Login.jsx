import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/login.css';
import { loginUser } from '../api/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const data = await loginUser(email, password);
      console.log("Login correcto:", data);

      // GUARDAMOS EL TOKEN JWT CORRECTO
      localStorage.setItem("accessToken", data.access);

      // GUARDAMOS TAMBIÉN USERNAME Y PASSWORD PARA BASIC AUTH
      localStorage.setItem("username", email);
      localStorage.setItem("password", password);

      // GUARDAR EMAIL
      localStorage.setItem("email", email);

       const noMostrarOnboarding = localStorage.getItem("onboardingNoMostrar") === "true";

      if (noMostrarOnboarding) {
        navigate("/splash");
      } else {
        navigate("/onboarding");
      }
      
    } catch (err) {
      setError("Email o contraseña incorrectos");
    }
  };

  return (
    <div className="login-background">
      <div className="login-card">

        <div className="login-logo-text">
          <span className="login-logo-asterisk">✳</span>
          <span className="login-logo-open">OPEN</span>
<span className="login-logo-kx">KX</span>
<span className="login-logo-ai">AI</span>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Contraseña</label>
          <div className="login-password-wrap">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="button" className="login-eye-btn" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? (
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              ) : (
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              )}
            </button>
          </div>

          <button type="submit">Entrar</button>

          {error && <p className="login-error">{error}</p>}
        </form>

        <div className="login-links">
          <Link to="/recuperar">¿Olvidaste la contraseña?</Link>
          <Link to="/informacion">Más información</Link>
        </div>

      </div>
    </div>
  );
}



