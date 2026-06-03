export type Language = "nl" | "en";

export type SectionKey =
  | "home"
  | "stops"
  | "theme"
  | "textSpeech"
  | "accounts"
  | "qr"
  | "floorPlan"
  | "scavenger"
  | "stats"
  | "media"
  | "history"
  | "manualAdmin"
  | "manualUser"
  | "start"
  | "battery"
  | "background";

export interface Stop {
  id: number;
  qrCode: string;
  location: {
    nl: string;
    en: string;
  };
  title: {
    nl: string;
    en: string;
  };
  description: {
    nl: string;
    en: string;
  };
  media?: {
    type: "image" | "video" | "audio";
    url: string;
    duration?: number;
    thumbnail?: string;
  };
  estimatedDuration: number;
  // Position on the plattegrond in native pixel coordinates (1531 × 704).
  // Optional — stops without a position still appear in the list but not on the map.
  mapX?: number;
  mapY?: number;
}

export interface TourData {
  stops: Stop[];
  totalDuration: number;
}

export interface UserSession {
  username: string;
  role: "Admin" | "Editor";
}