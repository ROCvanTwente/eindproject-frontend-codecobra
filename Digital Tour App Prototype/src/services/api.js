import { getAuthHeaders } from "./authApi";

const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL ?? "http://localhost:5000/api";

function toApiRoot(url) {
  return url.replace(/\/$/, "").replace(/\/api$/, "");
}

export function normalizeMediaUrlForStorage(mediaUrl) {
  if (!mediaUrl) return mediaUrl;
  const value = String(mediaUrl).trim();
  const apiRoot = toApiRoot(API_BASE_URL);

  if (value.startsWith(`${apiRoot}/uploads/`)) {
    return value.replace(apiRoot, "");
  }

  return value;
}

export function resolveMediaUrl(filePath) {
  if (!filePath) return "";
  if (/^https?:\/\//i.test(filePath)) return filePath;
  const root = toApiRoot(API_BASE_URL);
  const normalizedPath = filePath.startsWith("/")
    ? filePath
    : `/${filePath}`;
  return `${root}${normalizedPath}`;
}

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

export async function uploadMedia(file, qrCodeId) {
  const formData = new FormData();
  formData.append("file", file);
  if (typeof qrCodeId === "number" && qrCodeId > 0) {
    formData.append("qrCodeId", String(qrCodeId));
  }

  const response = await fetch(`${API_BASE_URL}/media/upload`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to upload media");
  }

  return await response.json();
}

export async function updateStopMedia(id, mediaUrl) {
  const normalizedMediaUrl = normalizeMediaUrlForStorage(mediaUrl);
  const response = await fetch(`${API_BASE_URL}/stops/${id}/media`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ mediaUrl: normalizedMediaUrl ?? null }),
  });

  if (response.status === 404) {
    throw new Error(
      "Endpoint /api/stops/{id}/media not found. Restart backend so the latest StopsController routes are loaded.",
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to update stop media");
  }

  return await response.json();
}

