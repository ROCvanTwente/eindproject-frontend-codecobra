import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { Language } from "../../types";
import { AdminSettings } from "../../data/settings";

interface Props {
  language: Language;
  settings: AdminSettings;
  onChange: (
    patch: Partial<AdminSettings>,
    log?: { action: string; target: string },
  ) => void;
}

const DEFAULTS = { primary: "#E30613", secondary: "#0066B3" };

export function SectionTheme({
  language,
  settings,
  onChange,
}: Props) {
  const { theme } = settings;

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--primary",
      theme.primary,
    );
    document.documentElement.style.setProperty(
      "--secondary",
      theme.secondary,
    );
  }, [theme]);

  const set = (patch: Partial<typeof theme>) =>
    onChange(
      { theme: { ...theme, ...patch } },
      { action: "update-theme", target: JSON.stringify(patch) },
    );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl">
          {language === "nl"
            ? "Kleuren aanpassen"
            : "Customize colors"}
        </h2>
        <button
          onClick={() =>
            onChange(
              { theme: DEFAULTS },
              { action: "reset-theme", target: "default" },
            )
          }
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <RotateCcw className="w-4 h-4" />
          {language === "nl" ? "Herstel" : "Reset"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(["primary", "secondary"] as const).map((key) => (
          <label key={key} className="flex flex-col gap-2">
            <span className="text-sm text-gray-700">
              {key === "primary"
                ? language === "nl"
                  ? "Primaire kleur (rood)"
                  : "Primary color (red)"
                : language === "nl"
                  ? "Secundaire kleur (blauw)"
                  : "Secondary color (blue)"}
            </span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={theme[key]}
                onChange={(e) =>
                  set({ [key]: e.target.value } as any)
                }
                className="w-14 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={theme[key]}
                onChange={(e) =>
                  set({ [key]: e.target.value } as any)
                }
                className="flex-1 px-3 py-2 rounded-lg border-2 border-gray-300 text-base font-mono"
              />
            </div>
          </label>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <div
          className="flex-1 h-12 rounded-lg flex items-center justify-center text-white"
          style={{ backgroundColor: theme.primary }}
        >
          Primary
        </div>
        <div
          className="flex-1 h-12 rounded-lg flex items-center justify-center text-white"
          style={{ backgroundColor: theme.secondary }}
        >
          Secondary
        </div>
      </div>
    </div>
  );
}