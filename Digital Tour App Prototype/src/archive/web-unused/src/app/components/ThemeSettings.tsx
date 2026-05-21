import { useEffect, useState } from "react";
import { Palette, RotateCcw } from "lucide-react";
import { Language } from "../types";

const THEME_STORAGE_KEY = "gieterij-theme-colors";
const DEFAULT_PRIMARY = "#E30613";
const DEFAULT_SECONDARY = "#0066B3";

interface ThemeColors {
  primary: string;
  secondary: string;
}

function loadTheme(): ThemeColors {
  if (typeof window === "undefined")
    return {
      primary: DEFAULT_PRIMARY,
      secondary: DEFAULT_SECONDARY,
    };
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        primary: parsed.primary || DEFAULT_PRIMARY,
        secondary: parsed.secondary || DEFAULT_SECONDARY,
      };
    }
  } catch {}
  return {
    primary: DEFAULT_PRIMARY,
    secondary: DEFAULT_SECONDARY,
  };
}

export function applyStoredTheme() {
  const { primary, secondary } = loadTheme();
  document.documentElement.style.setProperty(
    "--primary",
    primary,
  );
  document.documentElement.style.setProperty(
    "--secondary",
    secondary,
  );
}

interface ThemeSettingsProps {
  language: Language;
}

export function ThemeSettings({
  language,
}: ThemeSettingsProps) {
  const [colors, setColors] = useState<ThemeColors>(loadTheme);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--primary",
      colors.primary,
    );
    document.documentElement.style.setProperty(
      "--secondary",
      colors.secondary,
    );
    try {
      window.localStorage.setItem(
        THEME_STORAGE_KEY,
        JSON.stringify(colors),
      );
    } catch {}
  }, [colors]);

  const reset = () =>
    setColors({
      primary: DEFAULT_PRIMARY,
      secondary: DEFAULT_SECONDARY,
    });

  return (
    <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Palette className="w-6 h-6 text-[#0066B3]" />
          <h3 className="text-xl">
            {language === "nl"
              ? "Kleuren aanpassen"
              : "Customize colors"}
          </h3>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-800"
        >
          <RotateCcw className="w-4 h-4" />
          {language === "nl" ? "Herstel" : "Reset"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm text-gray-700">
            {language === "nl"
              ? "Primaire kleur (rood)"
              : "Primary color (red)"}
          </span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={colors.primary}
              onChange={(e) =>
                setColors((c) => ({
                  ...c,
                  primary: e.target.value,
                }))
              }
              className="w-14 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={colors.primary}
              onChange={(e) =>
                setColors((c) => ({
                  ...c,
                  primary: e.target.value,
                }))
              }
              className="flex-1 px-3 py-2 rounded-lg border-2 border-gray-300 text-base font-mono"
            />
          </div>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm text-gray-700">
            {language === "nl"
              ? "Secundaire kleur (blauw)"
              : "Secondary color (blue)"}
          </span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={colors.secondary}
              onChange={(e) =>
                setColors((c) => ({
                  ...c,
                  secondary: e.target.value,
                }))
              }
              className="w-14 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={colors.secondary}
              onChange={(e) =>
                setColors((c) => ({
                  ...c,
                  secondary: e.target.value,
                }))
              }
              className="flex-1 px-3 py-2 rounded-lg border-2 border-gray-300 text-base font-mono"
            />
          </div>
        </label>
      </div>

      <div className="mt-4 flex gap-2">
        <div
          className="flex-1 h-10 rounded-lg flex items-center justify-center text-white"
          style={{ backgroundColor: colors.primary }}
        >
          Primary
        </div>
        <div
          className="flex-1 h-10 rounded-lg flex items-center justify-center text-white"
          style={{ backgroundColor: colors.secondary }}
        >
          Secondary
        </div>
      </div>
    </div>
  );
}