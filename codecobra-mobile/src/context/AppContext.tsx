// src/context/AppContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from "react";
import { getAllStops } from "../data/api";
import { Stop } from "../types";
import { RECEPTION_COORDINATES, AdminSettings, DEFAULTS, loadSettings, saveSettings } from "../data/settings"; // Imported settings utilities

interface AppContextType {
  stops: Stop[];
  isLoading: boolean;
  currentStartStopId: string | null;
  setCurrentStartStopId: (stopId: string | null) => void;
  receptionCoordinates: { x: number; y: number };
  settings: AdminSettings; // Added
  setSettings: (settings: AdminSettings) => void; // Added
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [stops, setStops] = useState<Stop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStartStopId, setCurrentStartStopId] = useState<string | null>(null);
  
  // 1. Initialize settings with your defaults
  const [settings, setSettingsState] = useState<AdminSettings>(DEFAULTS);

  const receptionCoordinates = RECEPTION_COORDINATES;

  // 2. Create a setter that updates state AND saves it to AsyncStorage
  const setSettings = async (newSettings: AdminSettings) => {
    setSettingsState(newSettings);
    await saveSettings(newSettings);
  };

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        // Fetch both stops and saved settings in parallel
        const [stopsData, savedSettings] = await Promise.all([
          getAllStops(),
          loadSettings(),
        ]);

        if (mounted) {
          setStops(stopsData);
          setSettingsState(savedSettings); // Apply loaded settings
          setCurrentStartStopId('reception_fixed');
        }
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  // 3. Add settings and setSettings to the useMemo dependency array and value
  const value = useMemo(
    () => ({
      stops,
      isLoading,
      currentStartStopId,
      setCurrentStartStopId,
      receptionCoordinates,
      settings,
      setSettings,
    }),
    [
      stops,
      isLoading,
      currentStartStopId,
      setCurrentStartStopId,
      receptionCoordinates,
      settings, // Included
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}