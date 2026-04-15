import React from 'react';
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import Login from "./pages/Login";
import Inicio from "./pages/Inicio";
import Recuperar from "./pages/Recuperar";
import Informacion from "./pages/Informacion";
import Desafio from "./pages/Desafio";
import Notificaciones from './pages/Notificaciones';
import Explorar from './pages/Explorar';
import Perfil from './pages/Perfil';
import MiADN from './pages/MiADN';
import Crear from "./pages/Crear";
import CrearPaso2 from './pages/CrearPaso2';
import CrearPaso3 from './pages/CrearPaso3';
import ContenidoSubido from "./pages/ContenidoSubido";
import VideosGuardados from "./pages/VideosGuardados";
import SolicitarAcceso from "./pages/SolicitarAcceso";
import Onboarding from "./pages/Onboarding";
import SplashScreen from "./pages/SplashScreen";
import Historial from "./pages/Historial";
import HistorialPuntos from "./pages/HistorialPuntos";
import AgenteCoach from "./pages/AgenteCoach";
import CoachRecomendaciones from "./pages/CoachRecomendaciones";

export default function Router() {
  const location = useLocation();

  return (
    <Routes>

      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<Login />} />
      <Route path="/inicio" element={<Inicio />} />
      <Route path="/recuperar" element={<Recuperar />} />
      <Route path="/informacion" element={<Informacion />} />
      <Route path="/desafio" element={<Desafio />} />
      <Route path="/notificaciones" element={<Notificaciones />} />

      <Route
        path="/explorar"
        element={
          <Explorar key={location.state?.metaParaIniciar?.id || Date.now()} />
        }
      />

      <Route path="/perfil" element={<Perfil />} />
      <Route path="/miadn" element={<MiADN />} />
      <Route path="/crear" element={<Crear />} />
      <Route path="/crear/paso2" element={<CrearPaso2 />} />
      <Route path="/crear/paso3" element={<CrearPaso3 />} />
      <Route path="/contenido-subido" element={<ContenidoSubido />} />
      <Route path="/videos-guardados" element={<VideosGuardados />} />
      <Route path="/solicitar-acceso" element={<SolicitarAcceso />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/splash" element={<SplashScreen />} />
      <Route path="/historial" element={<Historial />} />
      <Route path="/historial-puntos" element={<HistorialPuntos />} />
      <Route path="/coach" element={<AgenteCoach />} />
      <Route path="/coach-recomendaciones" element={<CoachRecomendaciones />} />

    </Routes>
  );
}
