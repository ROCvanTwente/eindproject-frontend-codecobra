import { useRef } from "react";
import { Upload, Trash2 } from "lucide-react";
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

export function SectionBackground({
  language,
  settings,
  onChange,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      onChange(
        { homeBackground: String(reader.result) },
        { action: "set-home-background", target: file.name },
      );
    };
    reader.readAsDataURL(file);
  };

  const clear = () => {
    onChange(
      { homeBackground: "" },
      { action: "clear-home-background", target: "home" },
    );
  };

  return (
    <div>
      <h2 className="text-2xl mb-2">
        {language === "nl"
          ? "Achtergrond beginscherm"
          : "Home background"}
      </h2>
      <p className="text-gray-600 mb-5">
        {language === "nl"
          ? "Kies een afbeelding die als achtergrond verschijnt op het beginscherm en het QR-scherm."
          : "Pick an image to use as background on the start and QR screens."}
      </p>

      {settings.homeBackground ? (
        <div className="mb-4 border-2 border-gray-200 rounded-xl overflow-hidden">
          <img
            src={settings.homeBackground}
            alt="home background preview"
            className="w-full h-48 object-cover"
          />
        </div>
      ) : (
        <div className="mb-4 border-2 border-dashed border-gray-300 rounded-xl h-32 flex items-center justify-center text-gray-500">
          {language === "nl"
            ? "Geen afbeelding gekozen"
            : "No image selected"}
        </div>
      )}

      <div className="space-y-3">
        <label className="block">
          <span className="text-sm text-gray-700">
            {language === "nl" ? "Afbeelding-URL" : "Image URL"}
          </span>
          <input
            type="url"
            placeholder="https://..."
            value={
              settings.homeBackground.startsWith("data:")
                ? ""
                : settings.homeBackground
            }
            onChange={(e) =>
              onChange(
                { homeBackground: e.target.value },
                {
                  action: "set-home-background",
                  target: "url",
                },
              )
            }
            className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 mt-1 focus:border-[#0066B3] outline-none"
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            className="bg-[#0066B3] text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            {language === "nl"
              ? "Upload afbeelding"
              : "Upload image"}
          </button>
          {settings.homeBackground && (
            <button
              onClick={clear}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {language === "nl" ? "Verwijderen" : "Remove"}
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </div>
      </div>
    </div>
  );
}