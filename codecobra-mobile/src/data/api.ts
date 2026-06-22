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

// A stop's mediaUrl may be a JSON-encoded array of urls (multiple media),
// a single url string, or empty. Normalize all cases to a list of urls.
function parseMediaUrls(mediaUrl: string): string[] {
  const raw = String(mediaUrl ?? "").trim();
  if (!raw) return [];

  if (raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .map((url) => String(url ?? "").trim())
          .filter((url) => url.length > 0);
      }
    } catch {
      // Fall through and treat the value as a single url.
    }
  }

  return [raw];
}

export function mapTourStopResponse(stop: any) {
  if (!stop) return stop;

  // Handles both camelCase and PascalCase from C# backends
  const mediaUrl = stop.mediaUrl ?? stop.MediaUrl ?? "";

  const mediaList: Media[] = parseMediaUrls(mediaUrl).map((url) => ({
    type: detectMediaKind(url),
    url,
  }));

  const mapped = {
    ...stop,
    id: Number(stop.id ?? stop.Id ?? 0),
    estimatedDuration: Number(stop.estimatedDuration ?? stop.EstimatedDuration ?? 3),
    // Keep `media` as the first item for backwards compatibility.
    media: mediaList[0],
    mediaList,
  };

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

export async function getPronunciationRules() {
  const response = await fetch(`${API_URL}/tts/all`);
  if (!response.ok) {
    throw new Error("Failed to fetch pronunciation rules");
  }
  return response.json();
}

export { API_URL };