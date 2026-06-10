import { useEffect, useState } from "react";
import {
  addHistory,
  AdminSettings,
  loadSettings,
  saveSettings,
} from "./data/settings";
import { Language, Stop, UserSession } from "./types";
import { AdminPanel } from "./components/AdminPanel";
import { LoginScreen } from "./components/LoginScreen";
import { useLocation, useNavigate } from "react-router-dom";
import { getAllTourStops, mapTourStopResponse } from "../services/api";
import { flushPendingAuditLogs, logUserAction } from "../services/auditLogger";
import {
  clearSessionData,
  clearTokens,
  getCurrentUserInfo,
} from "../services/authApi";


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
      let next = { ...prev, ...patch };
      if (logAction) {
        const actor =
          patch.currentSession?.username ??
          prev.currentSession?.username ??
          "anoniem";
        next = addHistory(next, actor, logAction.action, logAction.target);
        void logUserAction({
          actor,
          action: logAction.action,
          target: logAction.target,
          metadata: {
            role: prev.currentSession?.role ?? patch.currentSession?.role ?? null,
          },
        });
      }
      saveSettings(next);
      return next;
    });
  };

  useEffect(() => {
    if (!settings.currentSession) return;
    void flushPendingAuditLogs();
  }, [settings.currentSession?.username]);

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
    let cancelled = false;

    (async () => {
      if (!settings.currentSession) return;
      const currentUser = await getCurrentUserInfo();
      if (cancelled) return;

      if (!currentUser) {
        clearTokens();
        clearSessionData();
        handleUpdateSettings({ currentSession: null });
        setView("login");
        navigate("/login", { replace: true });
        return;
      }

      const resolvedRole = currentUser?.isAdmin ? "Admin" : "Editor";
      if (settings.currentSession.role !== resolvedRole) {
        handleUpdateSettings({
          currentSession: {
            username: settings.currentSession.username,
            role: resolvedRole,
          },
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, settings.currentSession?.username]);

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

  const goToAdmin = (session: UserSession) => {
    handleUpdateSettings(
      { currentSession: session },
      { action: "login", target: session.username },
    );
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