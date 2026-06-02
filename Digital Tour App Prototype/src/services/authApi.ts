const API_BASE_URL =
  (import.meta as any).env?.VITE_AUTH_BASE_URL ??
  "http://localhost:5000";

const TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

const buildUrl = (path: string) => `${API_BASE_URL.replace(/\/$/, "")}${path}`;

export function setAccessToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setRefreshToken(token: string) {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function getAuthHeaders() {
  const token = getAccessToken();
  if (!token) {
    return {};
  }
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function loginUser(email: string, password: string) {
  const response = await fetch(buildUrl("/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (response.ok) {
    const data = await response.json();
    console.log("Login response data:", data);
    
    if (data.accessToken) {
      setAccessToken(data.accessToken);
    }
    if (data.refreshToken) {
      setRefreshToken(data.refreshToken);
    }
  } else {
    const errorData = await response.json().catch(() => ({}));
    console.error("Login error response:", response.status, errorData);
  }

  return response;
}

export function setSessionData(username: string, role: string) {
  const session = { username, role };
  localStorage.setItem("currentSession", JSON.stringify(session));
  console.log("Session saved:", session);
}

export function getSessionData() {
  const session = localStorage.getItem("currentSession");
  const parsed = session ? JSON.parse(session) : null;
  console.log("Session retrieved:", parsed);
  return parsed;
}

export function clearSessionData() {
  localStorage.removeItem("currentSession");
  console.log("Session cleared");
}

export async function registerUser(email: string, password: string) {
  return fetch(buildUrl("/register"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
}
