import { Language } from "../../types";
import {
  AdminSettings,
  VoiceGender,
} from "../../data/settings";

interface Props {
  language: Language;
  settings: AdminSettings;
  onChange: (
    patch: Partial<AdminSettings>,
    log?: { action: string; target: string },
  ) => void;
}

export function SectionTTS({
  language,
  settings,
  onChange,
}: Props) {
  const preview = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(
      language === "nl"
        ? "Dit is een voorbeeld van de voorleesstem."
        : "This is a preview of the reading voice.",
    );
    utt.lang = language === "nl" ? "nl-NL" : "en-US";
    utt.rate = settings.ttsRate;
    const voices = window.speechSynthesis.getVoices();
    const want = settings.voiceGender;
    const match = voices.find(
      (v) =>
        v.lang.startsWith(language === "nl" ? "nl" : "en") &&
        (want === "female"
          ? /female|vrouw|zira|samantha|karen|kathleen/i
          : /male|man|daniel|alex|george/i
        ).test(v.name),
    );
    if (match) utt.voice = match;
    window.speechSynthesis.speak(utt);
  };

  return (
    <div>
      <h2 className="text-2xl mb-2">
        {language === "nl"
          ? "Tekst-naar-spraak"
          : "Text-to-speech"}
      </h2>
      <p className="text-gray-600 mb-4">
        {language === "nl"
          ? "Schakel voorlezen in of uit en kies een stem."
          : "Enable or disable reading aloud and pick a voice."}
      </p>

      <label className="flex items-center gap-3 mb-6 cursor-pointer">
        <input
          type="checkbox"
          checked={settings.ttsEnabled}
          onChange={(e) =>
            onChange(
              { ttsEnabled: e.target.checked },
              {
                action: "toggle-tts",
                target: e.target.checked ? "on" : "off",
              },
            )
          }
          className="w-5 h-5 accent-[#0066B3]"
        />
        <span className="text-base">
          {language === "nl"
            ? "Voorlezen beschikbaar in rondleiding"
            : "Reading aloud available in tour"}
        </span>
      </label>

      <div className="mb-6">
        <p className="text-sm text-gray-700 mb-2">
          {language === "nl" ? "Stem" : "Voice"}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {(["female", "male"] as VoiceGender[]).map((g) => {
            const active = settings.voiceGender === g;
            return (
              <button
                key={g}
                onClick={() =>
                  onChange(
                    { voiceGender: g },
                    { action: "set-voice", target: g },
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
                <span>
                  {g === "female"
                    ? language === "nl"
                      ? "Vrouwenstem"
                      : "Female voice"
                    : language === "nl"
                      ? "Mannenstem"
                      : "Male voice"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <label className="block mb-4">
        <span className="text-sm text-gray-700">
          {language === "nl"
            ? `Spreeksnelheid: ${settings.ttsRate.toFixed(2)}×`
            : `Speech rate: ${settings.ttsRate.toFixed(2)}×`}
        </span>
        <input
          type="range"
          min={0.5}
          max={1.5}
          step={0.05}
          value={settings.ttsRate}
          onChange={(e) =>
            onChange({ ttsRate: parseFloat(e.target.value) })
          }
          className="w-full mt-2 accent-[#0066B3]"
        />
      </label>

      <button
        onClick={preview}
        className="bg-[#0066B3] text-white px-4 py-2 rounded-lg hover:opacity-90"
      >
        🔊{" "}
        {language === "nl"
          ? "Beluister voorbeeld"
          : "Preview voice"}
      </button>
    </div>
  );
}