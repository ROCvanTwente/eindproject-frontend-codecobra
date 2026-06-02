import { getAuthHeaders } from "./authApi";

const API_BASE_URL = "https://localhost:7199/api";

export async function getAllAccounts() {
  const response = await fetch(`${API_BASE_URL}/user/all`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
    if (!response.ok) {
        throw new Error("Failed to fetch accounts");
    }
    return await response.json();
}

export async function createAccount(username, email, password, role) {
  const response = await fetch(`${API_BASE_URL}/user/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ username, email, password, role }),
  });

  if (!response.ok) {
    throw new Error("Failed to create account");
  }

  return await response.json();
}

export async function deleteAccount(id) {
  const response = await fetch(`${API_BASE_URL}/user/delete/${id}`, {
    method: "DELETE",
    headers: {
      ...getAuthHeaders(),
    },
  });
  if (!response.ok) {
    throw new Error("Failed to delete account");
  }
  return await response.json();
}

export async function getAllTourStops() {
  const response = await fetch(`${API_BASE_URL}/stops/all`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  if (!response.ok) {
    throw new Error("Failed to fetch tour stops");
  }
  return await response.json();
}

export async function getTourStopById(id) {
  const response = await fetch(`${API_BASE_URL}/stops/${id}`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  if (!response.ok) {
    throw new Error("Failed to fetch tour stop");
  }
  return await response.json();
}

export async function AddTourStop(formData) {
  const response = await fetch(`${API_BASE_URL}/stops/add`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
    },
    body: formData,
  });
  if (!response.ok) {
    throw new Error("Failed to add tour stop");
  }
  return await response.json();
}

export async function deleteTourStop(id) {
  const response = await fetch(`${API_BASE_URL}/stops/${id}`, {
    method: "DELETE",
    headers: {
      ...getAuthHeaders(),
    },
  });
  if (!response.ok) {
    throw new Error("Failed to delete tour stop");
  }
  return await response.json();
}

export async function updateTourStop(id, formData) {
  const response = await fetch(`${API_BASE_URL}/stops/${id}`, {
    method: "PUT",
    headers: {
      ...getAuthHeaders(),    
    },
    body: formData,
  });
  if (!response.ok) {
    throw new Error("Failed to update tour stop");
  }
  return await response.json();
}

