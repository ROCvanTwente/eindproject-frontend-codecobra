const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL ??
  "https://digitalworkplacetestapi.runasp.net";

const buildUrl = (path: string) => `${API_BASE_URL.replace(/\/$/, "")}${path}`;

export async function loginUser(email: string, password: string) {
  return fetch(buildUrl("/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
}

export async function registerUser(email: string, password: string) {
  return fetch(buildUrl("/register"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
}
