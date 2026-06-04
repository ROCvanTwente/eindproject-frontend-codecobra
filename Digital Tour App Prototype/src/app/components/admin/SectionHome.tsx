import { BarChart3, Battery } from "lucide-react";
import { Language, SectionKey } from "../../types";
import { AdminSettings } from "../../data/settings";

interface Props {
  language: Language;
  settings: AdminSettings;
  onNavigate: (section: SectionKey) => void;
  sectionMeta: Array<{
    key: SectionKey;
    icon: any;
    nl: string;
    en: string;
    disabled?: boolean;
  }>;
  isAdminUser: boolean;
}

export function SectionHome({
  language,
  settings,
  onNavigate,
  sectionMeta,
  isAdminUser,
}: Props) {
  const lowBatteries = settings.beaconBatteries.filter(
    (b) => b.batteryPct <= settings.batteryThresholdPct,
  );

  const dashboardItems = (() => {
    const base = sectionMeta
      .filter((item) => item.key !== "home")
      .filter((item) => !(item.key === "accounts" && !isAdminUser));

    if (base.some((item) => item.key === "stats")) {
      return base;
    }

    return [
      ...base,
      {
        key: "stats" as SectionKey,
        icon: BarChart3,
        nl: "Statistieken",
        en: "Statistics",
      },
    ];
  })();

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">
        {language === "nl"
          ? "Welkom bij het Beheersysteem"
          : "Welcome to the Admin Panel"}
      </h2>
      <p className="text-gray-600 mb-6">
        {language === "nl"
          ? "Selecteer een sectie om te beginnen."
          : "Select a section to get started."}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {dashboardItems.map((item) => {
            return (
              <div
                key={item.key}
                className="bg-white p-4 rounded-lg shadow-md flex flex-col items-center justify-center transition-shadow cursor-pointer hover:shadow-lg"
                onClick={() => {
                  onNavigate(item.key);
                }}
              >
                <item.icon className="h-8 w-8 text-gray-600 mb-2" />
                <span className="text-center text-sm font-medium text-gray-700">
                  {item[language]}
                </span>
              </div>
            );
          })}
      </div>
    </div>
  );
}
