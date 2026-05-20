import { Language } from "../../types";
import { AdminSettings, SpeedKey } from "../../data/settings";

interface Props {
  language: Language;
  settings: AdminSettings;
  onChange: (
    patch: Partial<AdminSettings>,
    log?: { action: string; target: string },
  ) => void;
}

const LABELS: Record<
  SpeedKey,
  { nl: string; en: string; desc: { nl: string; en: string } }
> = {
  slow: {
    nl: "Langzaam",
    en: "Slow",
    desc: {
      nl: "50% langzamer — ideaal voor 60+",
      en: "50% slower — ideal for 60+",
    },
  },
  normal: {
    nl: "Normaal",
    en: "Normal",
    desc: {
      nl: "Standaard leesritme",
      en: "Default reading pace",
    },
  },
  fast: {
    nl: "Snel",
    en: "Fast",
    desc: { nl: "35% sneller", en: "35% faster" },
  },
};

export function SectionTextSpeed({
  language,
  settings,
  onChange,
}: Props) {
  return (
    <div>
      <h2 className="text-2xl mb-2">
        {language === "nl" ? "Tekst snelheid" : "Text speed"}
      </h2>
      <p className="text-gray-600 mb-4">
        {language === "nl"
          ? "Bepaal hoe snel de tekst automatisch scrollt en voorgelezen wordt."
          : "Set how fast the text auto-scrolls and is read aloud."}
      </p>
      <div className="space-y-3">
        {(Object.keys(LABELS) as SpeedKey[]).map((key) => {
          const active = settings.textSpeed === key;
          return (
            <button
              key={key}
              onClick={() =>
                onChange(
                  { textSpeed: key },
                  { action: "update-text-speed", target: key },
                )
              }
              className={`w-full text-left border-2 rounded-xl p-4 transition-colors ${
                active
                  ? "border-[#0066B3] bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-lg">
                  {LABELS[key][language]}
                </span>
                {active && (
                  <span className="text-[#0066B3] text-sm">
                    ✓ {language === "nl" ? "Actief" : "Active"}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">
                {LABELS[key].desc[language]}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}