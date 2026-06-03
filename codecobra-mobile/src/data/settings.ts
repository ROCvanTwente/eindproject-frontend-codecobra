import AsyncStorage from "@react-native-async-storage/async-storage";

export type SpeedKey = "slow" | "normal" | "fast";
export type VoiceGender = "female" | "male";

export interface ScavengerQuestion {
  id: number;
  stopId: number;
  question: { nl: string; en: string };
  answer: string;
}

export interface HistoryEntry {
  id: number;
  timestamp: number;
  actor: string;
  action: string;
  target: string;
}

export interface BeaconBattery {
  beaconId: string;
  name: string;
  batteryPct: number;
  lastSeen: number;
}

export interface VisitStat {
  stopId: number;
  visits: number;
  totalDurationSec: number;
}

export interface ManualSection {
  id: number;
  title: { nl: string; en: string };
  body: { nl: string; en: string };
}

const STORAGE_KEY = "gieterij-admin-settings";
const STOPS_KEY = "gieterij-stops-v2";

export async function loadStops() {
  try {
    const raw = await AsyncStorage.getItem(STOPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveStops(stops: unknown[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STOPS_KEY, JSON.stringify(stops));
  } catch {}
}
