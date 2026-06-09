import { getAuthHeaders } from "./authApi";

const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL ?? "https://digitalworkplacetestapi.runasp.net/api";

function toApiRoot(url) {
  return url.replace(/\/$/, "").replace(/\/api$/, "");
}

function getValue(source, keys, fallback = undefined) {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null) {
      return value;
    }
  }
  return fallback;
}

function appendFormValue(formData, key, value) {
  if (value === undefined || value === null) {
    return;
  }
  formData.append(key, String(value));
}

function detectMediaKind(mediaUrl) {
  const value = String(mediaUrl ?? "").toLowerCase();

  if (
    value.startsWith("data:audio/") ||
    /\.(mp3|wav|ogg|m4a)(\?|$)/i.test(value)
  ) {
    return "audio";
  }

  if (
    value.startsWith("data:video/") ||
    /\.(mp4|webm|mov|m4v)(\?|$)/i.test(value)
  ) {
    return "video";
  }

  return "image";
}

function getQrCodeValue(stop) {
  const nestedQrCode = getValue(stop, ["qrCode", "QRCode", "qrcode"]);

  if (typeof nestedQrCode === "string") {
    return nestedQrCode;
  }

  if (nestedQrCode && typeof nestedQrCode === "object") {
    return String(getValue(nestedQrCode, ["code", "Code"], ""));
  }

  return String(getValue(stop, ["qrCodeId", "QRCodeId"], "") ?? "");
}

export function mapTourStopResponse(stop) {
  if (!stop) {
    return stop;
  }

  const mediaUrl = getValue(stop, ["mediaUrl", "MediaUrl"], "");
  const mapped = {
    id: Number(getValue(stop, ["id", "Id"], 0)),
    qrCode: getQrCodeValue(stop),
    location: {
      nl: String(getValue(stop, ["locationNl", "LocationNl"], "") ?? ""),
      en: String(getValue(stop, ["locationEn", "LocationEn"], "") ?? ""),
    },
    title: {
      nl: String(getValue(stop, ["titleNl", "TitleNl"], "") ?? ""),
      en: String(getValue(stop, ["titleEn", "TitleEn"], "") ?? ""),
    },
    description: {
      nl: String(getValue(stop, ["descriptionNl", "DescriptionNl"], "") ?? ""),
      en: String(getValue(stop, ["descriptionEn", "DescriptionEn"], "") ?? ""),
    },
    estimatedDuration: Number(
      getValue(stop, ["estimatedDuration", "EstimatedDuration"], 3) ?? 3,
    ),
    mapX: getValue(stop, ["positionX", "PositionX"], undefined),
    mapY: getValue(stop, ["positionY", "PositionY"], undefined),
  };

  if (mediaUrl) {
    mapped.media = {
      type: detectMediaKind(mediaUrl),
      url: mediaUrl,
    };
  }

  return mapped;
}

export function buildTourStopFormData(stop, options = {}) {
  const { qrFieldName, includeEmptyMediaUrl = false } = options;
  const formData = new FormData();

  if (
    qrFieldName &&
    String(qrFieldName).toLowerCase() !== "qrcode"
  ) {
    appendFormValue(formData, qrFieldName, stop.qrCode);
  }

  appendFormValue(formData, "qrCode", stop.qrCode);

  appendFormValue(formData, "LocationNl", stop.location?.nl ?? "");
  appendFormValue(formData, "LocationEn", stop.location?.en ?? "");
  appendFormValue(formData, "TitleNl", stop.title?.nl ?? "");
  appendFormValue(formData, "TitleEn", stop.title?.en ?? "");
  appendFormValue(formData, "DescriptionNl", stop.description?.nl ?? "");
  appendFormValue(formData, "DescriptionEn", stop.description?.en ?? "");
  appendFormValue(formData, "PositionX", stop.mapX);
  appendFormValue(formData, "PositionY", stop.mapY);
  appendFormValue(formData, "EstimatedDuration", stop.estimatedDuration);

  const mediaUrl = stop.media?.url;
  if (mediaUrl || includeEmptyMediaUrl) {
    appendFormValue(formData, "MediaUrl", mediaUrl ?? "");
  }

  return formData;
}

export async function createTourStop(stop) {
  const response = await AddTourStop(buildTourStopFormData(stop));

  return {
    ...mapTourStopResponse(response),
    qrCode: stop.qrCode,
  };
}

export async function saveTourStop(id, stop) {
  const response = await updateTourStop(
    id,
    buildTourStopFormData(stop, {
      includeEmptyMediaUrl: true,
    }),
  );

  return {
    ...mapTourStopResponse(response),
    qrCode: stop.qrCode,
  };
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
  if (/^(https?:|data:|blob:)/i.test(filePath)) return filePath;
  const root = toApiRoot(API_BASE_URL);
  const normalizedPath = filePath.startsWith("/")
    ? filePath
    : `/${filePath}`;
  return `${root}${normalizedPath}`;
}

export async function getLandingPageUrl() {
  const response = await fetch(`${API_BASE_URL}/qrcode/landing-url`, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to fetch landing page URL");
  }

  return await response.json();
}

export async function saveLandingPageUrl(url) {
  const response = await fetch(`${API_BASE_URL}/qrcode/landing-url`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to save landing page URL");
  }

  return await response.json();
}

export async function getAllAccounts() {
  const response = await fetch(`${API_BASE_URL}/user/all`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to fetch accounts");
  }
  return await response.json();
}

export async function createAccount(username, password, role, email) {
  const response = await fetch(`${API_BASE_URL}/user/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ username, password, role, email: email || undefined }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to create account");
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
    const errorText = await response.text();
    throw new Error(errorText || "Failed to delete account");
  }
  return await response.json();
}

export async function updateAccountRole(id, role) {
  const response = await fetch(`${API_BASE_URL}/user/update-role/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ newRole: role }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to update account role");
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
    const errorText = await response.text();
    throw new Error(errorText || "Failed to update tour stop");
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
    body: JSON.stringify({
      mediaUrl: normalizedMediaUrl ? normalizedMediaUrl : null,
    }),
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

export async function getNumberScansQrCode(id) {
  const response = await fetch(`${API_BASE_URL}/qrcode/statistics/${id}`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  if (!response.ok) {    const errorText = await response.text();
    throw new Error(errorText || "Failed to fetch QR code statistics");
  }
  return await response.json();
}

