import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAllStops, getPronunciationRules } from "./api";

export type SpeedKey = "slow" | "normal" | "fast";
export type VoiceGender = "female" | "male";

export interface AdminAccount {
  id: number;
  username: string;
  password: string;
  role: "admin" | "editor";
  email?: string;
}

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

export interface AdminSettings {
  manualAdmin: ManualSection[];
  manualUser: ManualSection[];
  homeBackground: string;
  textSpeed: SpeedKey;
  ttsEnabled: boolean;
  ttsRate: number;
  voiceGender: VoiceGender;
  theme: { primary: string; secondary: string };
  accounts: AdminAccount[];
  currentSession: { username: string; role: string } | null;
  scavengerEnabled: boolean;
  scavengerQuestions: ScavengerQuestion[];
  history: HistoryEntry[];
  beaconBatteries: BeaconBattery[];
  batteryThresholdPct: number;
  visitStats: VisitStat[];
}

const STORAGE_KEY = "gieterij-admin-settings";
const STOPS_KEY = "gieterij-stops-v2";

export const DEFAULTS: AdminSettings = {
  textSpeed: "normal",
  ttsEnabled: true,
  ttsRate: 0.9,
  voiceGender: "female",
  theme: { primary: "#E30613", secondary: "#0066B3" },
  accounts: [
    { id: 1, username: "admin", password: "gieterij", role: "admin", email: "admin@gieterij.nl" },
  ],
  currentSession: null,
  scavengerEnabled: false,
  scavengerQuestions: [],
  history: [],
  beaconBatteries: [
    { beaconId: "b1", name: "Gieterij-1", batteryPct: 82, lastSeen: Date.now() },
    { beaconId: "b2", name: "Gieterij-2", batteryPct: 64, lastSeen: Date.now() },
    { beaconId: "b3", name: "Gieterij-3", batteryPct: 18, lastSeen: Date.now() },
    { beaconId: "b4", name: "Gieterij-4", batteryPct: 91, lastSeen: Date.now() },
    { beaconId: "b5", name: "Gieterij-5", batteryPct: 45, lastSeen: Date.now() },
  ],
  batteryThresholdPct: 20,
  visitStats: [],
  homeBackground: "",
  manualAdmin: [
    { id: 1, title: { nl: "1. Inloggen", en: "1. Sign in" }, body: { nl: "Gebruik je beheerders-gebruikersnaam en wachtwoord. Standaard: admin / gieterij.", en: "Use your admin username and password. Default: admin / gieterij." } },
    { id: 2, title: { nl: "2. Stops beheren", en: "2. Manage stops" }, body: { nl: "Voeg, bewerk of verwijder stops.", en: "Add, edit or remove stops." } },
  ],
  manualUser: [
    { id: 1, title: { nl: "1. Welkom", en: "1. Welcome" }, body: { nl: "Welkom bij De Gieterij! Deze app leidt je zelfstandig rond.", en: "Welcome to De Gieterij! This app takes you through a self-guided tour." } },
    { id: 2, title: { nl: "2. QR-code scannen", en: "2. Scan a QR code" }, body: { nl: "Richt je camera op een QR-code bij een stopplaats.", en: "Point your camera at a QR code at a stop." } },
  ],
};

export async function loadSettings(): Promise<AdminSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export async function saveSettings(s: AdminSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

import { API_URL } from "./api";

export async function loadStops() {
  try {
    const data = await getAllStops(); // Call the new API

    return data.map((item: any) => ({
      // item.id is 6 (the Stop ID) -> perfectly matches what StopDetail needs!
      id: item.id, 
      
      // item.qrCode.code is "hoi" -> matches what the QR scanner searches for!
      qrCode: item.qrCode?.code ?? "", 
      
      // Keep your UI titles clean
      titleNl: item.titleNl ?? "Stop",
      titleEn: item.titleEn ?? "Stop",
      title: {
        nl: item.titleNl ?? "Stop",
        en: item.titleEn ?? "Stop",
      },

      // Map position, needed so a QR scan can move the user's location dot
      positionX: item.positionX ?? null,
      positionY: item.positionY ?? null,
    }));
  } catch (err) {
    console.log("loadStops error:", err);
    return [];
  }
}

export async function saveStops(stops: unknown[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STOPS_KEY, JSON.stringify(stops));
  } catch {}
}

export function addHistory(
  s: AdminSettings,
  actor: string,
  action: string,
  target: string,
): AdminSettings {
  const now = Date.now();
  const entry: HistoryEntry = { id: now, timestamp: now, actor, action, target };
  return { ...s, history: [entry, ...s.history].slice(0, 200) };
}

export interface PronunciationRule {
  id: number;
  word: string;
  pronunciationText: string;
  language: string;
}

export async function loadPronunciationRules(): Promise<PronunciationRule[]> {
  try {
    const data = await getPronunciationRules();
    return Array.isArray(data) ? (data as PronunciationRule[]) : [];
  } catch (error) {
    console.error("Failed to load pronunciation rules:", error);
    return [];
  }
}

