import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminSettings, loadSettings, saveSettings } from "./data/settings";
import { Language, Stop, UserSession } from "./types";
import { AdminPanel } from "./components/AdminPanel";
import { LoginScreen } from "./components/LoginScreen";

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
    window.localStorage.setItem(STOPS_KEY, JSON.stringify(stops));
  } catch {}
};

type View = "login" | "admin";

export default function App() {
  const [language, setLanguage] = useState<Language>("nl");
  const [view, setView] = useState<View>("login");
  const [stops, setStops] = useState<Stop[]>(() => loadStops());
  const [settings, setSettings] = useState<AdminSettings>(() =>
    loadSettings(),
  );

  const handleUpdateSettings = (
    patch: Partial<AdminSettings>,
    logAction?: { action: string; target: string },
  ) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      // if (logAction) {
      //   const actor = prev.currentSession?.username ?? "anoniem";
      //   next = addHistory(next, actor, logAction.action, logAction.target);
      // }
      saveSettings(next);
      return next;
    });
  };

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
    if (view !== "admin") setSettings(loadSettings());
  }, [view]);

  // ── Views ──────────────────────────────────────────────────────────────────

  if (view === "login") {
    return (
      <LoginScreen
        settings={settings}
        onLogin={(session: UserSession) => {
          handleUpdateSettings({ currentSession: session });
          setView("admin");
        }}
        onBack={() => {
          /* No-op: there's no start/visitor view in this build */
        }}
      />
    );
  }

  if (view === "admin") {
    if (!settings.currentSession) {
      return (
        <LoginScreen
          settings={settings}
          onLogin={(session: UserSession) => {
            handleUpdateSettings({ currentSession: session });
            setView("admin");
          }}
          onBack={() => {
            /* No-op */
          }}
        />
      );
    }
    return (
      <AdminPanel
        stops={stops}
        language={language}
        onUpdateStops={setStops}
        onBack={() => setView("login")}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />
    );
  }

  // Fallback: show login
  return (
    <LoginScreen
      settings={settings}
      onLogin={(session: UserSession) => {
        handleUpdateSettings({ currentSession: session });
        setView("admin");
      }}
      onBack={() => {
        /* No-op */
      }}
    />
  );
}