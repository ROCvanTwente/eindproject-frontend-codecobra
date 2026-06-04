import { getAuthHeaders } from "./authApi";

const API_BASE_URL = "https://digitalworkplacetestapi.runasp.net/api";

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
