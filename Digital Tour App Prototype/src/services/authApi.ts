const API_BASE_URL =
  (import.meta as any).env?.VITE_AUTH_BASE_URL ??
  "https://localhost:7000";

const TOKEN_KEY = "accessToken";
const LEGACY_TOKEN_KEY = "token";
const REFRESH_TOKEN_KEY = "refreshToken";

const buildUrl = (path: string) => `${API_BASE_URL.replace(/\/$/, "")}${path}`;
const buildApiUrl = (path: string) =>
  `${API_BASE_URL.replace(/\/$/, "")}/api${path}`;

export function setAccessToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(LEGACY_TOKEN_KEY, token);
}

export function getAccessToken() {
  return (
    localStorage.getItem(TOKEN_KEY) ??
    localStorage.getItem(LEGACY_TOKEN_KEY)
  );
}

export function setRefreshToken(token: string) {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAccessToken();
  if (!token) {
    return {};
  }
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function loginUser(email: string, password: string) {
  const identifier = email.trim();

  const response = await fetch(
    buildUrl("/login?useCookies=false&useSessionCookies=false"),
    {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: identifier, password }),
    },
  );

  const data = await response.json().catch(() => ({}));

  if (response.ok) {
    if (data.accessToken) {
      setAccessToken(data.accessToken);
    }
    if (data.refreshToken) {
      setRefreshToken(data.refreshToken);
    }
  } else {
    console.error("Login error response:", response.status, data);
  }

  return { ok: response.ok, status: response.status, data };
}

export function setSessionData(username: string, role: string) {
  const session = { username, role };
  localStorage.setItem("currentSession", JSON.stringify(session));
}

export function getSessionData() {
  const session = localStorage.getItem("currentSession");
  const parsed = session ? JSON.parse(session) : null;
  return parsed;
}

export function clearSessionData() {
  localStorage.removeItem("currentSession");
}

export async function registerUser(username: string, password: string) {
  const normalizedUsername = username.trim().toLowerCase();
  const generatedEmail = `${normalizedUsername}@codecobra.local`;

  return fetch(buildUrl("/register?useCookies=false&useSessionCookies=false"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: generatedEmail, password }),
  });
}

export async function getCurrentUserInfo() {
  const response = await fetch(buildApiUrl("/user/me"), {
    headers: {
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    return null;
  }

  return await response.json();
}
