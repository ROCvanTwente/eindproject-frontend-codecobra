export type Language = "nl" | "en";

export interface Stop {
  id: number;
  qrCodeId: string;
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
  mediaUrl?: string;
}

export interface TourData {
  stops: Stop[];
  totalDuration: number;
}
