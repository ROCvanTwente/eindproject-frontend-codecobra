export type Language = "nl" | "en";
export type Gender = "female" | "male";

export interface Stop {
  id: number;
  qrCode: string;
  locationNl: string;
  locationEn: string;
  titleNl: string;
  titleEn: string;
  descriptionNl: string;
  descriptionEn: string;
  media?: {
    type: "image" | "video" | "audio";
    url: string;
    duration?: number;
    thumbnail?: string;
  };
  estimatedDuration: number;
  positionX?: number;
  positionY?: number;
}

export interface TourData {
  stops: Stop[];
  totalDuration: number;
}
