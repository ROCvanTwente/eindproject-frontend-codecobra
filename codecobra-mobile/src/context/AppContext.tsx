import React, { createContext, useContext, useEffect, useState } from "react";
import { Stop } from "../types";
import { AdminSettings, DEFAULTS, loadSettings, loadStops, saveSettings, saveStops } from "../data/settings";

export interface UserPosition {
  x: number;
  y: number;
}

// Fixed starting point: the reception desk in map (1531x704) coordinates.
export const RECEPTION_POSITION: UserPosition = { x: 300, y: 450 };

interface AppContextValue {
  stops: Stop[];
  setStops: (stops: Stop[]) => void;
  settings: AdminSettings;
  setSettings: (s: AdminSettings) => void;
  isLoading: boolean;
  /** Current location of the user on the floor plan (map coords). */
  userPosition: UserPosition;
  setUserPosition: (p: UserPosition) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [stops, setStopsState] = useState<Stop[]>([]);
  const [settings, setSettingsState] = useState<AdminSettings>(DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);
  const [userPosition, setUserPosition] = useState<UserPosition>(RECEPTION_POSITION);

useEffect(() => {
  Promise.all([loadStops(), loadSettings()]).then(([s, cfg]) => {
    setStopsState(s as Stop[]);
    setSettingsState(cfg);
    setIsLoading(false);
  });
}, []);

  const setStops = (s: Stop[]) => {
    setStopsState(s);
    saveStops(s);
  };

  const setSettings = (s: AdminSettings) => {
    setSettingsState(s);
    saveSettings(s);
  };

  return (
    <AppContext.Provider
      value={{ stops, setStops, settings, setSettings, isLoading, userPosition, setUserPosition }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used inside AppProvider");
  return ctx;
}
