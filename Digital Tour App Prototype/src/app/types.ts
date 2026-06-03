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

  export interface QrCode {
    id: number;
    code: string;
    name: string;
    createdAt: string;
    statistics: any[];
  }

export interface Stop {
  id: string | number;
  qrCode: QrCode;
  locationNl: string;
  locationEn: string;
  titleNl: string;
  titleEn: string;
  descriptionNl: string;
  descriptionEn: string;
  positionX?: number;
  positionY?: number;
  estimatedDuration: number;
  createdAt: string;
  updatedAt: string;
  order: number;
  mediaUrl?: string | null;
}

export interface TourData {
  stops: Stop[];
  totalDuration: number;
}

export interface UserSession {
  username: string;
  role: "Admin" | "Editor";
}