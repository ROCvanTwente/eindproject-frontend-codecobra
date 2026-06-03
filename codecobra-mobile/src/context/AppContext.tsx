import React, { createContext, useContext, useEffect, useState } from "react";
import { Stop } from "../types";
import { loadStops, saveStops } from "../data/settings";

interface AppContextValue {
  stops: Stop[];
  setStops: (stops: Stop[]) => void;
  isLoading: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [stops, setStopsState] = useState<Stop[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const setStops = (s: Stop[]) => {
    setStopsState(s);
    saveStops(s);
  };


  return (
    <AppContext.Provider value={{ stops, setStops, isLoading }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used inside AppProvider");
  return ctx;
}
