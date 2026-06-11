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
import { RECEPTION_COORDINATES } from "../data/settings";

// Verwijder AppConfig interface
interface AppContextType {
  stops: Stop[];
  isLoading: boolean;
  // appConfig: AppConfig | null; // Verwijderd
  currentStartStopId: string | null;
  setCurrentStartStopId: (stopId: string | null) => void;
  receptionCoordinates: { x: number; y: number };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [stops, setStops] = useState<Stop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // const [appConfig, setAppConfig] = useState<AppConfig | null>(null); // Verwijderd
  const [currentStartStopId, setCurrentStartStopId] = useState<string | null>(
    null,
  );

  const receptionCoordinates = RECEPTION_COORDINATES;

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        const stopsData = await getAllStops();

        if (mounted) {
          setStops(stopsData);
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

  const value = useMemo(
    () => ({
      stops,
      isLoading,
      // appConfig, // Verwijderd
      currentStartStopId,
      setCurrentStartStopId,
      receptionCoordinates,
    }),
    [
      stops,
      isLoading,
      // appConfig, // Verwijderd
      currentStartStopId,
      setCurrentStartStopId,
      receptionCoordinates,
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