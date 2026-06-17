import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Stop } from "../types";
import { AdminSettings, DEFAULTS, loadSettings, loadStops, saveSettings, saveStops } from "../data/settings";
import { useBeaconTracking, BeaconTrackingState } from "../hooks/useBeaconTracking";

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
  /** Beacon tracking state for live indoor positioning. */
  beaconTracking: BeaconTrackingState;
  /** Enable/disable beacon tracking. */
  beaconEnabled: boolean;
  setBeaconEnabled: (v: boolean) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [stops, setStopsState] = useState<Stop[]>([]);
  const [settings, setSettingsState] = useState<AdminSettings>(DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);
  const [userPosition, setUserPositionState] = useState<UserPosition>(RECEPTION_POSITION);
  const [beaconEnabled, setBeaconEnabled] = useState(true);

  const beaconTracking = useBeaconTracking(stops, beaconEnabled);

  // When beacon tracking produces a new position, update userPosition.
  const prevBeaconPos = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (!beaconTracking.position) return;
    const { x, y } = beaconTracking.position;
    const prev = prevBeaconPos.current;
    if (prev && prev.x === x && prev.y === y) return;
    prevBeaconPos.current = { x, y };
    setUserPositionState({ x, y });
  }, [beaconTracking.position]);

  // Allow manual overrides (e.g. QR scan) to still set position.
  const setUserPosition = (p: UserPosition) => {
    prevBeaconPos.current = { x: p.x, y: p.y };
    setUserPositionState(p);
  };

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
      value={{
        stops, setStops, settings, setSettings, isLoading,
        userPosition, setUserPosition,
        beaconTracking, beaconEnabled, setBeaconEnabled,
      }}
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
