 import { Platform } from "react-native";

//  const API_URL =
//    Platform.OS === "android"
//      ? "http://10.0.2.2:5018/api"
//      : "http://localhost:5018/api";

const API_URL = "https://digitalworkplacetestapi.runasp.net/api";

export async function recordScan(qrCode: string) {
  const response = await fetch(`${API_URL}/qrcode/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ qrCode }),
  });

  if (!response.ok) {
    throw new Error("Failed to record scan");
  }

  return response.json();
}

export async function getAllStops() {
    const response = await fetch(`${API_URL}/stops/all`);
    if (!response.ok) {
        throw new Error("Failed to fetch stops");
    }
    return response.json();
}

export async function getStopById(id: number) {
    const response = await fetch(`${API_URL}/stops/${id}`);
    if (!response.ok) {
        throw new Error("Failed to fetch stop");
    }
    return response.json();
}

export { API_URL };