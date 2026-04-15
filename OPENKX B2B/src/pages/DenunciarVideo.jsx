import React, { useState } from 'react';
import '../styles/denunciar.css';

export default function DenunciarVideo({ onClose }) {
  const [motivo, setMotivo] = useState('');
  const [enviado, setEnviado] = useState(false);

  const motivos = [
    'Spam o contenido engañoso',
    'Contenido inapropiado',
    'Acoso o intimidación',
    'Información falsa',
    'Violación de derechos de autor',
    'Otro motivo',
  ];

  const enviarDenuncia = () => {
    setEnviado(true);

    setTimeout(() => {
      setEnviado(false);
      onClose();
    }, 1800);
  };

  return (
    <div className="denunciar-overlay" onClick={onClose}>
      <div
        className="denunciar-modal"
        onClick={(e) => e.stopPropagation()}
      >

        <div className="denunciar-handle"></div>

        <h2>Denunciar video</h2>

        <div className="alerta-falsa">
          <strong>Denuncias falsas</strong>
          <p>
            Las denuncias falsas o malintencionadas pueden resultar en la suspensión de tu cuenta.
          </p>
        </div>

        <h3>¿Por qué denuncias este video?</h3>

        <ul className="motivos-lista">
          {motivos.map((m) => (
            <li key={m}>
              <label>
                <input
                  type="radio"
                  name="motivo"
                  value={m}
                  checked={motivo === m}
                  onChange={() => setMotivo(m)}
                />
                {m}
              </label>
            </li>
          ))}
        </ul>

        <button
          className={`btn-enviar ${!motivo ? "disabled" : ""}`}
          disabled={!motivo}
          onClick={enviarDenuncia}
        >
          Enviar denuncia
        </button>

      </div>

      {enviado && (
        <div className="toast-denuncia">
          ✔️ Denuncia enviada correctamente
        </div>
      )}
    </div>
  );
}
