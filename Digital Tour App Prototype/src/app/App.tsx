import { useEffect, useState } from "react";
import { AdminSettings, loadSettings, saveSettings } from "./data/settings";
import { Language, Stop, UserSession } from "./types";
import { AdminPanel } from "./components/AdminPanel";
import { LoginScreen } from "./components/LoginScreen";
import { RegisterScreen } from "./components/RegisterScreen";
import { useLocation, useNavigate } from "react-router-dom";
import { getAllTourStops, mapTourStopResponse } from "../services/api";

type View = "login" | "register" | "admin";

export default function App() {
  const [language, setLanguage] = useState<Language>("nl");
  const [view, setView] = useState<View>("login");
  const [stops, setStops] = useState<Stop[]>([]);
  const [settings, setSettings] = useState<AdminSettings>(() =>
    loadSettings(),
  );
  const navigate = useNavigate();
  const location = useLocation();

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
    let cancelled = false;

    (async () => {
      try {
        const response = await getAllTourStops();
        if (cancelled) return;
        setStops(Array.isArray(response) ? response.map(mapTourStopResponse) : []);
      } catch {
        if (!cancelled) {
          setStops([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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

  useEffect(() => {
    if (location.pathname === "/register") {
      setView("register");
      return;
    }

    if (location.pathname === "/admin") {
      setView("admin");
      return;
    }

    setView("login");
  }, [location.pathname]);

  const goToLogin = () => {
    setView("login");
    navigate("/login", { replace: true });
  };

  const goToRegister = () => {
    setView("register");
    navigate("/register", { replace: true });
  };

  const goToAdmin = (session: UserSession) => {
    handleUpdateSettings({ currentSession: session });
    setView("admin");
    navigate("/admin", { replace: true });
  };

  // ── Views ──────────────────────────────────────────────────────────────────

  if (view === "login") {
    return (
      <LoginScreen
        settings={settings}
        onLogin={(session: UserSession) => {
          goToAdmin(session);
        }}
        onBack={() => {
          /* No-op: there's no start/visitor view in this build */
        }}
      />
    );
  }

  if (view === "register") {
    return (
      <RegisterScreen
        settings={settings}
        onRegister={(session: UserSession) => {
          goToAdmin(session);
        }}
        onBack={goToLogin}
      />
    );
  }

  if (view === "admin") {
    if (!settings.currentSession) {
      return (
        <LoginScreen
          settings={settings}
          onLogin={(session: UserSession) => {
            goToAdmin(session);
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
        onBack={goToLogin}
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
        goToAdmin(session);
      }}
      onBack={() => {
        /* No-op */
      }}
    />
  );
}