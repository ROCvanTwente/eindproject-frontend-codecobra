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

export function SectionStart({
  language,
  settings,
  onChange,
}: Props) {
  return (
    <div>
      <h2 className="text-2xl mb-2">
        {language === "nl" ? "Beginscherm" : "Start screen"}
      </h2>
      <p className="text-gray-600 mb-6">
        {language === "nl"
          ? "Wat bezoekers zien als zij de app openen: taalkeuze (Nederlands/Engels) en stemkeuze (man/vrouw)."
          : "What visitors see when they open the app: language choice (Dutch/English) and voice (male/female)."}
      </p>

      <div className="border-2 border-gray-200 rounded-xl p-4 mb-4 bg-gray-50">
        <h3 className="text-lg mb-3">
          {language === "nl" ? "Voorvertoning" : "Preview"}
        </h3>
        <div className="bg-white rounded-xl p-6 text-center border-2 border-gray-100">
          <p className="text-2xl mb-4">
            {language === "nl"
              ? "Welkom bij De Gieterij"
              : "Welcome to De Gieterij"}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            {language === "nl"
              ? "Kies je taal"
              : "Choose your language"}
          </p>
          <div className="flex gap-2 justify-center mb-4">
            <button className="bg-[#E30613] text-white px-6 py-3 rounded-lg">
              🇳🇱 Nederlands
            </button>
            <button className="bg-[#0066B3] text-white px-6 py-3 rounded-lg">
              🇬🇧 English
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-2">
            {language === "nl" ? "Welke stem?" : "Which voice?"}
          </p>
          <div className="flex gap-2 justify-center">
            <button className="border-2 border-gray-300 px-4 py-2 rounded-lg">
              👩 {language === "nl" ? "Vrouw" : "Female"}
            </button>
            <button className="border-2 border-gray-300 px-4 py-2 rounded-lg">
              👨 {language === "nl" ? "Man" : "Male"}
            </button>
          </div>
        </div>
      </div>

      <div className="border-2 border-gray-200 rounded-xl p-4">
        <h3 className="text-lg mb-3">
          {language === "nl"
            ? "Standaard stem"
            : "Default voice"}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {(["female", "male"] as const).map((g) => {
            const active = settings.voiceGender === g;
            return (
              <button
                key={g}
                onClick={() =>
                  onChange(
                    { voiceGender: g },
                    { action: "set-default-voice", target: g },
                  )
                }
                className={`border-2 rounded-xl p-4 transition-colors ${
                  active
                    ? "border-[#0066B3] bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <span className="text-3xl block mb-1">
                  {g === "female" ? "👩" : "👨"}
                </span>
                {g === "female"
                  ? language === "nl"
                    ? "Vrouwenstem"
                    : "Female voice"
                  : language === "nl"
                    ? "Mannenstem"
                    : "Male voice"}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}