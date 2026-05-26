import React, { createContext, useContext, useEffect, useState } from "react";
import { Stop } from "../types";
import { AdminSettings, DEFAULTS, loadSettings, loadStops, saveSettings, saveStops } from "../data/settings";

interface AppContextValue {
  stops: Stop[];
  setStops: (stops: Stop[]) => void;
  settings: AdminSettings;
  setSettings: (s: AdminSettings) => void;
  isLoading: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [stops, setStopsState] = useState<Stop[]>([]);
  const [settings, setSettingsState] = useState<AdminSettings>(DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);

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
    <AppContext.Provider value={{ stops, setStops, settings, setSettings, isLoading }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used inside AppProvider");
  return ctx;
}
