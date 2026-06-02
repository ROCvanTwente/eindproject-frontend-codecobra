export type Language = "nl" | "en";

export interface Stop {
  id: number;
  qrCode: string;
  location: { nl: string; en: string };
  title: { nl: string; en: string };
  description: { nl: string; en: string };
  media?: {
    type: "image" | "video" | "audio";
    url: string;
    duration?: number;
    thumbnail?: string;
  };
  estimatedDuration: number;
  mapX?: number;
  mapY?: number;
}

export interface TourData {
  stops: Stop[];
  totalDuration: number;
}
