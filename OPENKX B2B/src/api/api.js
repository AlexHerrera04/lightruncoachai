const API_BASE_URL = "http://52.71.121.184";

function getAccessToken() {
  return localStorage.getItem("accessToken");
}

export function getCurrentUserId() {
  const storedUserId = localStorage.getItem("userId");
  if (storedUserId) return Number(storedUserId);

  const token = getAccessToken();
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return Number(payload.user_id || payload.id || payload.sub || null);
  } catch {
    return null;
  }
}

function buildAuthHeaders() {
  const token = getAccessToken();

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: "Bearer " + token } : {})
  };
}

function extractApiError(payload, fallbackMessage) {
  if (!payload) return fallbackMessage;

  if (typeof payload === "string") {
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload.filter(Boolean).join(" ") || fallbackMessage;
  }

  if (Array.isArray(payload.non_field_errors) && payload.non_field_errors.length > 0) {
    return payload.non_field_errors.join(" ");
  }

  if (typeof payload.detail === "string" && payload.detail.trim()) {
    return payload.detail;
  }

  const firstKey = Object.keys(payload)[0];
  if (!firstKey) return fallbackMessage;

  const value = payload[firstKey];

  if (Array.isArray(value)) {
    return value.join(" ") || fallbackMessage;
  }

  if (typeof value === "string") {
    return value;
  }

  return fallbackMessage;
}

async function parseResponse(response, fallbackMessage) {
  const contentType = response.headers.get("content-type") || "";
  let payload = null;

  try {
    if (contentType.includes("application/json")) {
      payload = await response.json();
    } else {
      const text = await response.text();
      payload = text || null;
    }
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(extractApiError(payload, fallbackMessage));
  }

  return payload;
}

async function apiRequest(
  path,
  { method = "GET", body, fallbackMessage = "Error en la solicitud" } = {}
) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: buildAuthHeaders(),
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await parseResponse(response, fallbackMessage);

  return {
    status: response.status,
    data
  };
}

// LOGIN: envia Basic Auth y recibe un JWT
export async function loginUser(email, password) {
  const response = await fetch(`${API_BASE_URL}/accounts/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + btoa(`${email}:${password}`)
    },
    body: JSON.stringify({ email, password })
  });

  const data = await parseResponse(response, "Error al iniciar sesión");

  localStorage.setItem("accessToken", data.access);

  if (data.refresh) {
    localStorage.setItem("refreshToken", data.refresh);
  }

  if (data.id) {
    localStorage.setItem("userId", String(data.id));
  }

  return data;
}

// OBTENER CONTENIDOS: envia el JWT
export async function getNewContents() {
  const { data } = await apiRequest("/contents/new", {
    fallbackMessage: "No se pudo obtener el contenido nuevo"
  });

  return data;
}

export async function getGoalsList({ status = null, priority = null } = {}) {
  let url = "/goals/";
  const params = new URLSearchParams();

  if (status) params.append("status", status);
  if (priority) params.append("priority", priority);

  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  const { data } = await apiRequest(url, {
    fallbackMessage: "No se pudieron obtener las metas"
  });

  return data;
}

export async function getContentDetail(id) {
  const { data } = await apiRequest(`/contents/${id}`, {
    fallbackMessage: "No se pudo obtener el detalle del contenido"
  });

  return data;
}

export async function createAutoChallenge({
  userId = getCurrentUserId(),
  difficulty = ["medium", "hard"],
  count = 5
} = {}) {
  if (!userId) {
    throw new Error("No se ha podido identificar al usuario actual");
  }

  const { data } = await apiRequest("/contents/challenges/create-auto/", {
    method: "POST",
    body: {
      user: userId,
      difficulty,
      count
    },
    fallbackMessage: "No se pudo crear el desafío automático"
  });

  return data;
}

export async function createChallenge({
  userId = getCurrentUserId(),
  contentId,
  capacityId,
  difficulty = ["medium", "hard"],
  count = 5
} = {}) {
  if (!userId) {
    throw new Error("No se ha podido identificar al usuario actual");
  }

  if (!contentId && !capacityId) {
    throw new Error("Debes indicar contentId o capacityId para crear el desafío");
  }

  const body = {
    user: userId,
    difficulty,
    count
  };

  if (contentId) {
    body.content_id = contentId;
  }

  if (capacityId) {
    body.capacity_id = capacityId;
  }

  const { data } = await apiRequest("/contents/challenges/create/", {
    method: "POST",
    body,
    fallbackMessage: "No se pudo crear el desafío"
  });

  return data;
}

export async function getChallengeDetail(challengeId) {
  const { data } = await apiRequest(`/contents/challenges/${challengeId}/`, {
    fallbackMessage: "No se pudo obtener el detalle del desafío"
  });

  return data;
}

export async function updateChallengeStatus(challengeId, status) {
  const { data } = await apiRequest(`/contents/challenges/${challengeId}/update/`, {
    method: "PATCH",
    body: { status },
    fallbackMessage: "No se pudo actualizar el estado del desafío"
  });

  return data;
}

export async function submitChallengeAnswer({
  challengeId,
  questionId,
  selectedOptionId = null,
  answerText = ""
}) {
  if (!challengeId || !questionId) {
    throw new Error("Faltan datos para enviar la respuesta");
  }

  const body = {
    challenge: challengeId,
    question: questionId
  };

  if (selectedOptionId !== null && selectedOptionId !== undefined) {
    body.selected_option = selectedOptionId;
  }

  if (answerText.trim()) {
    body.answer_text = answerText.trim();
  }

  const { data } = await apiRequest("/contents/answers/submit/", {
    method: "POST",
    body,
    fallbackMessage: "No se pudo enviar la respuesta"
  });

  return data;
}

export async function getChallengeAnswerResults(challengeId) {
  const { status, data } = await apiRequest(
    `/contents/challenges/${challengeId}/answers/results/`,
    {
      fallbackMessage: "No se pudieron obtener los resultados del desafío"
    }
  );

  return {
    status,
    data
  };
}