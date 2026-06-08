const API_BASE_URL =
  (import.meta as any).env?.VITE_AUTH_BASE_URL ??
  "http://localhost:5018";

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
  const response = await fetch(
    buildUrl("/login?useCookies=false&useSessionCookies=false"),
    {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
    },
  );

  const data = await response.json().catch(() => ({}));

  if (response.ok) {
    console.log("Login response data:", data);

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
  return fetch(buildUrl("/register?useCookies=false&useSessionCookies=false"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
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
