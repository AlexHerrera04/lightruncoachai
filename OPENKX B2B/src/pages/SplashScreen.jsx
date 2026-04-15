import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/splash.css';

export default function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/inicio", { replace: true });
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="splash-container">
      <div className="splash-logo">
        <span className="splash-asterisk">✳</span>
        <span className="splash-text">
  <span className="splash-text-main">Open KX</span>{" "}
  <span className="splash-text-ai">AI</span>
</span>
      </div>
      <div className="splash-spinner" />
    </div>
  );
}
