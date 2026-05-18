import { useEffect, useState } from "react";
import { AdminSettings, loadSettings } from "./data/settings";
import { Language, Stop } from "./types";

const STOPS_KEY = "gieterij-stops-v2";
const loadStops = (): Stop[] => {
  if (typeof window === "undefined") return [];
  try {
    window.localStorage.removeItem("gieterij-stops");
  } catch {}
  try {
    const raw = window.localStorage.getItem(STOPS_KEY);
    if (!raw) return [];
    const parsed: Stop[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
};
const saveStops = (stops: Stop[]) => {
  try {
    window.localStorage.setItem(
      STOPS_KEY,
      JSON.stringify(stops),
    );
  } catch {}
};
import { StopDetail } from "./components/StopDetail";
import { QRScanner } from "./components/QRScanner";
import { FloorPlan } from "./components/FloorPlan";
import { RouteOverview } from "./components/RouteOverview";
import { AdminPanel } from "./components/AdminPanel";
import { StartScreen } from "./components/StartScreen";

type View =
  | "start"
  | "scanner"
  | "detail"
  | "map"
  | "floorplan"
  | "admin";

export default function App() {
  const [language, setLanguage] = useState<Language>("nl");
  const [selectedStop, setSelectedStop] = useState<Stop | null>(
    null,
  );
  const [currentView, setCurrentView] = useState<View>("start");
  // Track where to return to when leaving a stop detail
  const [returnView, setReturnView] = useState<View>("scanner");
  // Editable stops data
  const [stops, setStops] = useState<Stop[]>(() => loadStops());
  const [settings, setSettings] = useState<AdminSettings>(() =>
    loadSettings(),
  );

  useEffect(() => {
    saveStops(stops);
  }, [stops]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--primary",
      settings.theme.primary,
    );
    document.documentElement.style.setProperty(
      "--secondary",
      settings.theme.secondary,
    );
  }, [settings.theme.primary, settings.theme.secondary]);

  // Re-read settings whenever we return from admin so visitor screens see updates.
  useEffect(() => {
    if (currentView !== "admin") setSettings(loadSettings());
  }, [currentView]);

  const toggleLanguage = () =>
    setLanguage((prev) => (prev === "nl" ? "en" : "nl"));

  /** Called when a QR code is scanned from the scanner screen. */
  const handleQRScan = (qrCode: string) => {
    const stop = stops.find((s) => s.qrCode === qrCode);
    if (stop) {
      setReturnView("scanner");
      setSelectedStop(stop);
      setCurrentView("detail");
      window.scrollTo({ top: 0 });
    }
  };

  /** Called when a stop is tapped in the route overview. */
  const handleSelectStop = (stop: Stop) => {
    setReturnView("map");
    setSelectedStop(stop);
    setCurrentView("detail");
    window.scrollTo({ top: 0 });
  };

  /** Back button in StopDetail — goes to wherever we came from. */
  const handleBackFromDetail = () => {
    setSelectedStop(null);
    setCurrentView(returnView);
    window.scrollTo({ top: 0 });
  };

  const handleShowMap = () => setCurrentView("map");
  const handleShowFloorPlan = () => setCurrentView("floorplan");
  const handleShowAdmin = () => setCurrentView("admin");
  const handleBackToScanner = () => {
    setCurrentView("scanner");
    setSelectedStop(null);
  };

  // ── Views ──────────────────────────────────────────────────────────────────

  if (currentView === "start") {
    return (
      <StartScreen
        backgroundImage={settings.homeBackground}
        onStart={(lang) => {
          setLanguage(lang);
          setCurrentView("scanner");
        }}
      />
    );
  }

  if (currentView === "scanner") {
    return (
      <QRScanner
        language={language}
        stops={stops}
        backgroundImage={settings.homeBackground}
        onScan={handleQRScan}
        onShowMap={handleShowMap}
        onShowFloorPlan={handleShowFloorPlan}
        onShowAdmin={handleShowAdmin}
        onToggleLanguage={toggleLanguage}
      />
    );
  }

  if (currentView === "detail" && selectedStop) {
    const stopIndex = stops.findIndex(
      (s) => s.id === selectedStop.id,
    );
    const isLastStop = stopIndex === stops.length - 1;
    return (
      <StopDetail
        stop={selectedStop}
        language={language}
        onBackToScanner={handleBackFromDetail}
        currentStopNumber={stopIndex + 1}
        totalStops={stops.length}
        isLastStop={isLastStop}
      />
    );
  }

  if (currentView === "map") {
    return (
      <RouteOverview
        language={language}
        stops={stops}
        onBack={handleBackToScanner}
        onSelectStop={handleSelectStop}
      />
    );
  }

  if (currentView === "floorplan") {
    return (
      <FloorPlan
        language={language}
        stops={stops}
        onBack={handleBackToScanner}
      />
    );
  }

  if (currentView === "admin") {
    return (
      <AdminPanel
        stops={stops}
        language={language}
        onUpdateStops={setStops}
        onBack={handleBackToScanner}
      />
    );
  }

  // Fallback
  return null;
}