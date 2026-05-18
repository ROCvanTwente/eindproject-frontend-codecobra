import { useState } from "react";
import { Language } from "../types";
import {
  VoiceGender,
  loadSettings,
  saveSettings,
} from "../data/settings";
import { TriangleDecoration } from "./TriangleDecoration";

interface Props {
  onStart: (language: Language, voice: VoiceGender) => void;
  backgroundImage?: string;
}

export function StartScreen({
  onStart,
  backgroundImage,
}: Props) {
  const [language, setLanguage] = useState<Language | null>(
    null,
  );
  const [voice, setVoice] = useState<VoiceGender | null>(null);

  const confirm = () => {
    if (!language || !voice) return;
    const s = loadSettings();
    saveSettings({ ...s, voiceGender: voice });
    onStart(language, voice);
  };

  const bgStyle = backgroundImage
    ? {
        backgroundImage: `linear-gradient(rgba(255,255,255,0.85), rgba(255,255,255,0.85)), url(${backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : undefined;

  return (
    <div
      className="min-h-screen bg-white flex flex-col"
      style={bgStyle}
    >
      <div className="bg-primary text-white p-5 sm:p-8 relative overflow-hidden">
        <TriangleDecoration
          position="top-right"
          color="blue"
          size="large"
        />
        <TriangleDecoration
          position="bottom-left"
          color="light-blue"
          size="medium"
        />
        <div className="max-w-3xl mx-auto relative z-10 text-center py-3 sm:py-6">
          <h1 className="text-3xl sm:text-5xl mb-1 sm:mb-3">
            De Gieterij
          </h1>
          <p className="text-base sm:text-xl opacity-90">
            ROC van Twente
          </p>
        </div>
      </div>

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-5 sm:py-8 flex flex-col gap-5 sm:gap-8">
        <section>
          <h2 className="text-lg sm:text-2xl mb-3 text-center">
            Kies je taal · Choose your language
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setLanguage("nl")}
              className={`py-4 sm:py-6 rounded-xl border-4 text-lg sm:text-2xl transition-colors ${
                language === "nl"
                  ? "border-[#E30613] bg-red-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              🇳🇱 Nederlands
            </button>
            <button
              onClick={() => setLanguage("en")}
              className={`py-4 sm:py-6 rounded-xl border-4 text-lg sm:text-2xl transition-colors ${
                language === "en"
                  ? "border-[#0066B3] bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              🇬🇧 English
            </button>
          </div>
        </section>

        <section>
          <h2 className="text-lg sm:text-2xl mb-3 text-center">
            {language === "en"
              ? "Choose a voice"
              : "Kies een stem"}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setVoice("female")}
              className={`py-4 sm:py-6 rounded-xl border-4 text-lg sm:text-2xl transition-colors ${
                voice === "female"
                  ? "border-[#0066B3] bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              👩{" "}
              {language === "en"
                ? "Female voice"
                : "Vrouwenstem"}
            </button>
            <button
              onClick={() => setVoice("male")}
              className={`py-4 sm:py-6 rounded-xl border-4 text-lg sm:text-2xl transition-colors ${
                voice === "male"
                  ? "border-[#0066B3] bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              👨{" "}
              {language === "en" ? "Male voice" : "Mannenstem"}
            </button>
          </div>
        </section>

        <button
          onClick={confirm}
          disabled={!language || !voice}
          className="bg-[#E30613] text-white py-4 sm:py-5 rounded-xl text-lg sm:text-2xl disabled:bg-gray-300 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          {language === "en"
            ? "Start tour →"
            : "Start rondleiding →"}
        </button>
      </div>
    </div>
  );
}