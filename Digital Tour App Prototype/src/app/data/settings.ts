/**
 * Central store for admin-configurable settings, persisted to localStorage.
 * All features accessed through the Beheer-systeem read/write via these helpers.
 */

export type SpeedKey = "slow" | "normal" | "fast";
export type VoiceGender = "female" | "male";

export interface AdminAccount {
  id: number;
  username: string;
  password: string; // prototype only — not hashed
  role: "Admin" | "Editor";
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

const DEFAULTS: AdminSettings = {
  textSpeed: "normal",
  ttsEnabled: true,
  ttsRate: 0.9,
  voiceGender: "female",
  theme: { primary: "#E30613", secondary: "#0066B3" },
  accounts: [
    {
      id: 1,
      username: "admin",
      password: "gieterij",
      role: "Admin",
      email: "admin@gieterij.nl",
    },
  ],
  currentSession: null,
  scavengerEnabled: false,
  scavengerQuestions: [],
  history: [],
  beaconBatteries: [
    {
      beaconId: "b1",
      name: "Gieterij-1",
      batteryPct: 82,
      lastSeen: Date.now(),
    },
    {
      beaconId: "b2",
      name: "Gieterij-2",
      batteryPct: 64,
      lastSeen: Date.now(),
    },
    {
      beaconId: "b3",
      name: "Gieterij-3",
      batteryPct: 18,
      lastSeen: Date.now(),
    },
    {
      beaconId: "b4",
      name: "Gieterij-4",
      batteryPct: 91,
      lastSeen: Date.now(),
    },
    {
      beaconId: "b5",
      name: "Gieterij-5",
      batteryPct: 45,
      lastSeen: Date.now(),
    },
  ],
  batteryThresholdPct: 20,
  visitStats: [],
  homeBackground: "",
  manualAdmin: [
    {
      id: 1,
      title: { nl: "1. Inloggen", en: "1. Sign in" },
      body: {
        nl: "Gebruik je beheerders-gebruikersnaam en wachtwoord. Standaard: admin / gieterij.",
        en: "Use your admin username and password. Default: admin / gieterij.",
      },
    },
    {
      id: 2,
      title: { nl: "2. Stops beheren", en: "2. Manage stops" },
      body: {
        nl: "Voeg, bewerk of verwijder stops. Koppel elke stop aan een QR-code en kies tekst/media.",
        en: "Add, edit or remove stops. Link each stop to a QR code and pick text/media.",
      },
    },
    {
      id: 3,
      title: {
        nl: "3. Foto's & video's",
        en: "3. Photos & videos",
      },
      body: {
        nl: "Koppel media via URL per stop. Type kan foto, video of audio zijn.",
        en: "Attach media per stop by URL. Type can be image, video or audio.",
      },
    },
    {
      id: 4,
      title: { nl: "4. QR codes", en: "4. QR codes" },
      body: {
        nl: "Download automatisch gegenereerde QR-codes per stop of maak een aangepaste code.",
        en: "Download auto-generated QR codes per stop or create a custom code.",
      },
    },
    {
      id: 5,
      title: {
        nl: "5. Kleuren & tekst",
        en: "5. Colours & text",
      },
      body: {
        nl: "Pas de huisstijlkleuren, leesritme en voorlees-stem aan.",
        en: "Adjust brand colours, reading pace and text-to-speech voice.",
      },
    },
    {
      id: 6,
      title: { nl: "6. Accounts", en: "6. Accounts" },
      body: {
        nl: "Maak extra beheer-accounts aan of verwijder ze.",
        en: "Create additional admin accounts or delete them.",
      },
    },
    {
      id: 7,
      title: {
        nl: "7. Beacon batterij",
        en: "7. Beacon battery",
      },
      body: {
        nl: "Controleer de batterijstatus van beacons en stel een waarschuwingsdrempel in.",
        en: "Check beacon battery status and set the warning threshold.",
      },
    },
    {
      id: 8,
      title: { nl: "8. History", en: "8. History" },
      body: {
        nl: "Alle acties worden gelogd voor traceerbaarheid.",
        en: "All actions are logged for auditability.",
      },
    },
  ],
  manualUser: [
    {
      id: 1,
      title: { nl: "1. Welkom", en: "1. Welcome" },
      body: {
        nl: "Welkom bij De Gieterij! Deze app leidt je zelfstandig rond met je telefoon.",
        en: "Welcome to De Gieterij! This app takes you through a self-guided tour on your phone.",
      },
    },
    {
      id: 2,
      title: {
        nl: "2. Taal en stem kiezen",
        en: "2. Choose language & voice",
      },
      body: {
        nl: "Op het beginscherm kies je Nederlands of Engels en een vrouwen- of mannenstem.",
        en: "On the start screen pick Dutch or English, and a female or male voice.",
      },
    },
    {
      id: 3,
      title: {
        nl: "3. QR-code scannen",
        en: "3. Scan a QR code",
      },
      body: {
        nl: "Richt je camera op een QR-code bij een stopplaats om de uitleg te starten.",
        en: "Point your camera at a QR code at a stop to start the explanation.",
      },
    },
    {
      id: 4,
      title: {
        nl: "4. Voorlezen of afspelen",
        en: "4. Read or play",
      },
      body: {
        nl: "Gebruik de luidspreker-knop links om voor te lezen, of de play-knop rechts om de tekst automatisch te laten scrollen.",
        en: "Use the speaker button on the left to hear the text, or the play button on the right to auto-scroll.",
      },
    },
    {
      id: 5,
      title: { nl: "5. Plattegrond", en: "5. Floor plan" },
      body: {
        nl: "Tik op de plattegrond-knop om te zien waar je bent en welke stops je nog kunt bezoeken.",
        en: "Tap the floor-plan button to see where you are and which stops you can still visit.",
      },
    },
    {
      id: 6,
      title: { nl: "6. Speurtocht", en: "6. Scavenger hunt" },
      body: {
        nl: "Beantwoord vragen per stop voor een extra leuke ervaring (indien ingeschakeld).",
        en: "Answer questions per stop for an extra fun experience (when enabled).",
      },
    },
  ],
};

export function loadSettings(): AdminSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function saveSettings(s: AdminSettings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

export function addHistory(
  s: AdminSettings,
  actor: string,
  action: string,
  target: string,
): AdminSettings {
  const now = Date.now();
  const entry: HistoryEntry = {
    id: now,
    timestamp: now,
    actor,
    action,
    target,
  };
  const history = [entry, ...s.history].slice(0, 200);
  return { ...s, history };
}