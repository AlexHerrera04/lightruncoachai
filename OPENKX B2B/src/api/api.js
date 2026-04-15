// LOGIN: envia Basic Auth y recibe un JWT
export async function loginUser(email, password) {
  const response = await fetch("http://52.71.121.184/accounts/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + btoa(`${email}:${password}`)
    },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    throw new Error("Error al iniciar sesión");
  }

  const data = await response.json();

  // GUARDA EL TOKEN JWT DE ACCESO
  localStorage.setItem("accessToken", data.access);

  return data;
}

// OBTENER CONTENIDOS: envia el JWT
export async function getNewContents() {
  const token = localStorage.getItem("accessToken");

  const response = await fetch("http://52.71.121.184/contents/new", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    }
  });

  if (!response.ok) {
    throw new Error("No se pudo obtener el contenido nuevo");
  }

  return await response.json();
}

export async function getGoalsList({ status = null, priority = null } = {}) {
  const token = localStorage.getItem("accessToken");

  let url = "http://52.71.121.184/goals/";

  const params = new URLSearchParams();

  if (status) params.append("status", status);
  if (priority) params.append("priority", priority);

  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    }
  });

  if (!response.ok) {
    throw new Error("No se pudieron obtener las metas");
  }

  return await response.json();
}

export async function getContentDetail(id) {
  const token = localStorage.getItem("accessToken");

  const response = await fetch(`http://52.71.121.184/contents/${id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    }
  });

  if (!response.ok) {
    throw new Error("No se pudo obtener el detalle del contenido");
  }

  return await response.json();
}



