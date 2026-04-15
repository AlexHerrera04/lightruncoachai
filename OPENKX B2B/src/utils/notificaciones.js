// Sistema de notificaciones — guardar y leer del localStorage

const STORAGE_KEY = "openkx_notificaciones";

export function getNotificaciones() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

export function addNotificacion({ titulo, texto, tipo = "info" }) {
  const notis = getNotificaciones();
  const nueva = {
    id: Date.now(),
    titulo,
    texto,
    tipo, // "meta", "logro", "social", "info"
    tiempo: new Date().toISOString(),
    leida: false,
  };
  const actualizado = [nueva, ...notis].slice(0, 50); // max 50
  localStorage.setItem(STORAGE_KEY, JSON.stringify(actualizado));
  return nueva;
}

export function marcarLeida(id) {
  const notis = getNotificaciones();
  const actualizado = notis.map(n => n.id === id ? { ...n, leida: true } : n);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(actualizado));
}

export function marcarTodasLeidas() {
  const notis = getNotificaciones();
  const actualizado = notis.map(n => ({ ...n, leida: true }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(actualizado));
}

export function getNoLeidas() {
  return getNotificaciones().filter(n => !n.leida).length;
}

export function tiempoRelativo(isoString) {
  const diff = Math.floor((Date.now() - new Date(isoString)) / 1000);
  if (diff < 60) return "Ahora mismo";
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `Hace ${Math.floor(diff / 86400)} días`;
  return new Date(isoString).toLocaleDateString("es-ES");
}
