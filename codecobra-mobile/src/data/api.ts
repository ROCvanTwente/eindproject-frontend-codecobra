// api.ts
import { Platform } from "react-native";

// Toggle these for local debugging if needed
// const API_URL = Platform.OS === "android" ? "http://10.0.2.2:5018/api" : "http://localhost:5018/api";
const API_URL = "https://digitalworkplacetestapi.runasp.net/api";

export type MediaKind = "image" | "video" | "audio";

export interface Media {
  type: MediaKind;
  url: string;
}

function toApiRoot(url: string): string {
  return url.replace(/\/$/, "").replace(/\/api$/, "");
}

function detectMediaKind(mediaUrl: string): MediaKind {
  const value = String(mediaUrl ?? "").toLowerCase();
  if (value.startsWith("data:audio/") || /\.(mp3|wav|ogg|m4a)(\?|$)/i.test(value)) {
    return "audio";
  }
  if (value.startsWith("data:video/") || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(value)) {
    return "video";
  }
  return "image";
}

export function resolveMediaUrl(filePath: string | null | undefined): string {
  if (!filePath) return "";
  if (/^(https?:|data:|blob:)/i.test(filePath)) return filePath;
  const root = toApiRoot(API_URL);
  const normalizedPath = filePath.startsWith("/") ? filePath : `/${filePath}`;
  return `${root}${normalizedPath}`;
}

export function mapTourStopResponse(stop: any) {
  if (!stop) return stop;

  // Handles both camelCase and PascalCase from C# backends
  const mediaUrl = stop.mediaUrl ?? stop.MediaUrl ?? "";

  const mapped = {
    ...stop,
    id: Number(stop.id ?? stop.Id ?? 0),
    estimatedDuration: Number(stop.estimatedDuration ?? stop.EstimatedDuration ?? 3),
    media: undefined as Media | undefined,
  };

  if (mediaUrl) {
    mapped.media = {
      type: detectMediaKind(mediaUrl),
      url: mediaUrl,
    };
  }

  return mapped;
}

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
    const data = await response.json();
    return mapTourStopResponse(data);
}
