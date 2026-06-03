import { useEffect, useState } from "react";
import {
  ArrowLeft,
  MapPin,
  Volume2,
  LogIn,
  Users,
  QrCode,
  Compass,
  BarChart3,
  Images,
  History,
  BookOpen,
  BookUser,
  Battery,
  Home,
  Menu,
  X,
  Image as ImageIcon,
  Map,
} from "lucide-react";
import { Stop, Language, SectionKey } from "../types";
import { StopForm } from "./StopForm";
import {
  AdminSettings,
  addHistory,
} from "../data/settings";
import { AddTourStop, updateTourStop } from "../../services/api";

import { SectionHome } from "./admin/SectionHome";
import { SectionStops } from "./admin/SectionStops";
import { SectionTextSpeech } from "./admin/SectionTextSpeech";
import { SectionBackground } from "./admin/SectionBackground";
import { SectionAccounts } from "./admin/SectionAccounts";
import { SectionQR } from "./admin/SectionQR";
import { SectionFloorPlan } from "./admin/SectionFloorPlan";
import { SectionStats } from "./admin/SectionStats";
import { SectionMedia } from "./admin/SectionMedia";
import { SectionHistory } from "./admin/SectionHistory";
import { SectionManualAdmin } from "./admin/SectionManualAdmin";
import { SectionStart } from "./admin/SectionStart";
// Removed: SectionTheme, SectionScavenger, SectionManualUser, SectionBattery

interface AdminPanelProps {
  stops: Stop[];
  language: Language;
  onUpdateStops: (stops: Stop[]) => void;
  onBack: () => void;
  settings: AdminSettings;
  onUpdateSettings: (
    patch: Partial<AdminSettings>,
    logAction?: { action: string; target: string },
  ) => void;
}

export const SECTION_META: Array<{
  key: SectionKey;
  icon: any;
  nl: string;
  en: string;
  disabled?: boolean;
}> = [
  { key: "home", icon: Home, nl: "Overzicht", en: "Overview" },
  { key: "stops", icon: MapPin, nl: "Stops beheren", en: "Manage stops" },
  { key: "media", icon: Images, nl: "Foto's & video's", en: "Photos & videos" },
  { key: "qr", icon: QrCode, nl: "QR codes", en: "QR codes" },
  { key: "floorPlan", icon: Map, nl: "Plattegrond", en: "Floor plan" },
  // theme removed
  { key: "background", icon: ImageIcon, nl: "Achtergrond", en: "Background" },
  { key: "textSpeech", icon: Volume2, nl: "Tekst & spraak", en: "Text & speech" },
  { key: "start", icon: LogIn, nl: "Beginscherm", en: "Start screen" },
  { key: "scavenger", icon: Compass, nl: "Speurtocht", en: "Scavenger hunt", disabled: true },
  { key: "battery", icon: Battery, nl: "Beacon batterij", en: "Beacon battery", disabled: true },
  { key: "stats", icon: BarChart3, nl: "Statistieken", en: "Statistics" },
  { key: "history", icon: History, nl: "History", en: "History" },
  { key: "accounts", icon: Users, nl: "Beheer accounts", en: "Admin accounts" },
  { key: "manualAdmin", icon: BookUser, nl: "Handleiding beheer", en: "Admin manual" },
];

const VISIBLE_DASHBOARD_KEYS: SectionKey[] = ["home", "stops", "qr", "floorPlan", "accounts"];
const VISIBLE_SECTION_META = SECTION_META.filter((s) =>
  VISIBLE_DASHBOARD_KEYS.includes(s.key),
);

export function AdminPanel({
  stops,
  language,
  onUpdateStops,
  onBack,
  settings,
  onUpdateSettings,
}: AdminPanelProps) {
  const [section, setSection] = useState<SectionKey>("home");
  const [editingStop, setEditingStop] = useState<Stop | null>(
    null,
  );
  const [isCreating, setIsCreating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // ── Stop edit screen (kept from original flow) ─────────────────────────────
  if (editingStop || isCreating) {
    const handleSave = async (stop: Stop) => {
      const actor =
        settings.currentSession?.username ?? "admin";
      
      try {
        // Convert stop object to FormData for API
        const formData = new FormData();
        const qrCodeText =
          stop.qrCode?.code?.trim() ||
          (((stop as any).qrCodeId != null)
            ? String((stop as any).qrCodeId)
            : "");

        if (!qrCodeText) {
          alert(
            language === "nl"
              ? "QR-code ontbreekt voor deze stop."
              : "QR code is missing for this stop.",
          );
          return;
        }

        formData.append("qrCode", qrCodeText);
        formData.append("locationNl", stop.locationNl ?? "");
        formData.append("locationEn", stop.locationEn ?? "");
        formData.append("titleNl", stop.titleNl ?? "");
        formData.append("titleEn", stop.titleEn ?? "");
        formData.append("descriptionNl", stop.descriptionNl ?? "");
        formData.append("descriptionEn", stop.descriptionEn ?? "");

        const estimatedDurationValue = Number(stop.estimatedDuration);
        if (!Number.isFinite(estimatedDurationValue) || estimatedDurationValue <= 0) {
          alert(
            language === "nl"
              ? "Geschatte duur ontbreekt of is ongeldig."
              : "Estimated duration is missing or invalid.",
          );
          return;
        }
        formData.append("estimatedDuration", String(estimatedDurationValue));

        if (stop.positionX != null) formData.append("positionX", String(stop.positionX));
        if (stop.positionY != null) formData.append("positionY", String(stop.positionY));
        if (stop.mediaUrl) formData.append("mediaUrl", stop.mediaUrl);

        if (isCreating) {
          console.log("Creating new stop via API:", stop);
          const response = await AddTourStop(formData);
          console.log("Create response:", response);
          onUpdateSettings(
            {},
            {
              action: "create-stop",
              target: stop.titleNl || `#${stop.id}`,
            },
          );
        } else {
          console.log("Updating stop via API:", stop);
          const response = await updateTourStop(stop.id, formData);
          console.log("Update response:", response);
          onUpdateSettings(
            {},
            {
              action: "update-stop",
              target: stop.titleNl || `#${stop.id}`,
            },
          );
        }
      } catch (error) {
        console.error("Error saving stop:", error);
        alert(
          language === "nl"
            ? "Fout bij opslaan van stop"
            : "Error saving stop"
        );
      } finally {
        void actor;
        setEditingStop(null);
        setIsCreating(false);
      }
    };
    return (
      <StopForm
        stop={editingStop!}
        language={language}
        onSave={handleSave}
        onCancel={() => {
          setEditingStop(null);
          setIsCreating(false);
        }}
        isCreating={isCreating}
      />
    );
  }

  const handleLogout = () => {
    if (settings.currentSession) {
      onUpdateSettings(
        { currentSession: null },
        {
          action: "logout",
          target: settings.currentSession.username,
        },
      );
    }
    onBack();
  };

  const currentUserRole = settings.currentSession?.role;

  const isAdminUser =
    (currentUserRole ?? "").toLowerCase() === "admin";

  const renderSection = () => {
    switch (section) {
      case "home":
        return (
          <SectionHome
            language={language}
            settings={settings}
            onNavigate={setSection}
            sectionMeta={VISIBLE_SECTION_META}
            isAdminUser={isAdminUser}
          />
        );
      case "stops":
        return (
          <SectionStops
            language={language}
            onEdit={(s) => setEditingStop(s)}
            onCreate={() => {
              setEditingStop({
                id: 0,
                qrCode: { id: 0, code: "", name: "", createdAt: new Date().toISOString(), statistics: [] },
                locationNl: "",
                locationEn: "",
                titleNl: "",
                titleEn: "",
                descriptionNl: "",
                descriptionEn: "",
                estimatedDuration: 3,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                order: 0,
              });
              setIsCreating(true);
            }}
            log={(a, t) => onUpdateSettings({}, { action: a, target: t })}
            onStopsChange={onUpdateStops}
          />
        );
      case "background":
        return (
          <SectionBackground
            language={language}
            settings={settings}
            onChange={onUpdateSettings}
          />
        );
      case "textSpeech":
        return (
          <SectionTextSpeech
            language={language}
            settings={settings}
            onChange={onUpdateSettings}
          />
        );
      case "accounts":
        if (!isAdminUser) {
          return (
            <SectionHome
              language={language}
              settings={settings}
              onNavigate={setSection}
              sectionMeta={VISIBLE_SECTION_META}
              isAdminUser={isAdminUser}
            />
          );
        }
        return (
          <SectionAccounts
            language={language}
            settings={settings}
            onChange={onUpdateSettings}
          />
        );
      case "qr":
        return (
          <SectionQR
            language={language}
            stops={stops}
            onUpdateStops={onUpdateStops}
            log={(a, t) => onUpdateSettings({}, { action: a, target: t })}
          />
        );
      case "floorPlan":
        return (
          <SectionFloorPlan
            language={language}
            stops={stops}
          />
        );
      case "stats":
        return (
          <SectionStats
            language={language}
            settings={settings}
            stops={stops}
          />
        );
      case "media":
        return (
          <SectionMedia
            language={language}
            stops={stops}
            onUpdateStops={onUpdateStops}
          />
        );
      case "history":
        return (
          <SectionHistory
            language={language}
            settings={settings}
            onChange={onUpdateSettings}
          />
        );
      case "manualAdmin":
        return (
          <SectionManualAdmin
            language={language}
            settings={settings}
            onChange={onUpdateSettings}
          />
        );
      case "start":
        return (
          <SectionStart
            language={language}
            settings={settings}
            onChange={onUpdateSettings}
          />
        );
      /* Removed/disabled sections: theme, scavenger, manualUser, battery */
      default:
        return (
          <SectionHome
            language={language}
            settings={settings}
            onNavigate={setSection}
            sectionMeta={VISIBLE_SECTION_META}
            isAdminUser={isAdminUser}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#E30613] text-white px-3 py-3 sticky top-0 z-20 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden text-white hover:opacity-80 transition-opacity"
              aria-label={
                language === "nl" ? "Menu openen" : "Open menu"
              }
            >
              <Menu className="w-6 h-6" />
            </button>
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-white hover:opacity-80 transition-opacity"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-base hidden xs:inline">
                {language === "nl" ? "Terug" : "Back"}
              </span>
            </button>
          </div>
          <h1 className="text-base sm:text-xl truncate">
            {language === "nl" ? "Beheersysteem" : "Management"}
          </h1>
          <div className="flex items-center gap-2 text-sm">
            {settings.currentSession && (
              <span className="opacity-90 hidden md:inline">
                👤 {settings.currentSession.username}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded-md text-xs sm:text-sm"
            >
              {language === "nl" ? "Uitloggen" : "Log out"}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile hamburger menu overlay */}
      {menuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Mobile hamburger menu */}
      <nav
        className={`md:hidden fixed top-0 left-0 h-full w-72 bg-white shadow-xl z-40 transform transition-transform duration-300 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between bg-[#E30613] text-white px-4 py-3">
          <span className="text-lg">
            {language === "nl" ? "Menu" : "Menu"}
          </span>
          <button
            onClick={() => setMenuOpen(false)}
            className="text-white hover:opacity-80 transition-opacity"
            aria-label={
              language === "nl" ? "Menu sluiten" : "Close menu"
            }
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="overflow-y-auto h-[calc(100vh-60px)] p-2">
          {VISIBLE_SECTION_META.filter(
            (s) => !s.disabled && !(s.key === "accounts" && !isAdminUser)
          ).map((s) => {
            const Icon = s.icon;
            const active = section === s.key;
            return (
              <button
                key={s.key}
                onClick={() => {
                  setSection(s.key);
                  setMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors mb-1 ${
                  active
                    ? "bg-[#0066B3] text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{s[language]}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-3 p-3 md:p-4">
        {/* Desktop sidebar */}
        <aside className="hidden md:block md:w-64 md:flex-shrink-0">
          <nav className="bg-white rounded-xl border-2 border-gray-200 p-2 flex flex-col gap-1 md:sticky md:top-20">
            {VISIBLE_SECTION_META.filter(
              (s) => !s.disabled && !(s.key === "accounts" && !isAdminUser)
            ).map((s) => {
              const Icon = s.icon;
              const active = section === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => {
                    setSection(s.key);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                    active
                      ? "bg-[#0066B3] text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm truncate">
                    {s[language]}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 bg-white rounded-xl border-2 border-gray-200 p-3 sm:p-5">
          {renderSection()}
        </main>
      </div>
    </div>
  );
}

