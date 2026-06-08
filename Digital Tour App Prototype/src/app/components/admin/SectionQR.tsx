import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Download, RefreshCw, Link2, Plus } from "lucide-react";
import { Language, Stop } from "../../types";
import { createTourStop, saveTourStop } from "../../../services/api";

interface Props {
  language: Language;
  stops: Stop[];
  onUpdateStops: (stops: Stop[]) => void;
  log: (action: string, target: string) => void;
}

export function SectionQR({
  language,
  stops,
  onUpdateStops,
  log,
}: Props) {
  const [linkToStopId, setLinkToStopId] = useState<number | "">(
    "",
  );
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [customText, setCustomText] = useState("");
  const [customDataUrl, setCustomDataUrl] = useState<
    string | null
  >(null);
  const customRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const out: Record<string, string> = {};
      for (const stop of stops) {
        if (!stop.qrCode) continue;
        try {
          out[stop.qrCode] = await QRCode.toDataURL(
            stop.qrCode,
            { width: 220, margin: 1 },
          );
        } catch {}
      }
      if (!cancelled) setUrls(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [stops]);

  const generateCustom = async () => {
    if (!customText.trim()) return;
    try {
      const url = await QRCode.toDataURL(customText, {
        width: 260,
        margin: 1,
      });
      setCustomDataUrl(url);
    } catch {}
  };

  const download = (dataUrl: string, filename: string) => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.click();
  };

  const linkToStop = async () => {
    const code = customText.trim();
    if (!code || linkToStopId === "") return;
    if (
      stops.some(
        (s) => s.qrCode === code && s.id !== linkToStopId,
      )
    ) {
      alert(
        language === "nl"
          ? "Deze QR-code is al aan een andere stop gekoppeld."
          : "This QR code is already linked to another stop.",
      );
      return;
    }
    const target = stops.find((s) => s.id === linkToStopId);

    try {
      const updatedStop = await saveTourStop(linkToStopId, {
        ...target!,
        qrCode: code,
      });
      onUpdateStops(
        stops.map((s) => (s.id === updatedStop.id ? updatedStop : s)),
      );
      log("link-qr-to-stop", `${code} → #${linkToStopId}`);
      alert(
        language === "nl"
          ? `QR-code "${code}" gekoppeld aan "${target?.title.nl ?? "#" + linkToStopId}".`
          : `QR code "${code}" linked to "${target?.title.en ?? "#" + linkToStopId}".`,
      );
    } catch (error) {
      console.error("Failed to link QR to stop", error);
      alert(
        language === "nl"
          ? "Koppelen van de QR-code is mislukt."
          : "Linking the QR code failed.",
      );
    }
  };

  const createStopFromCode = async () => {
    const code = customText.trim();
    if (!code) return;
    if (stops.some((s) => s.qrCode === code)) {
      alert(
        language === "nl"
          ? "Deze QR-code bestaat al."
          : "This QR code already exists.",
      );
      return;
    }
    const newStop: Stop = {
      id: 0,
      qrCode: code,
      location: { nl: "", en: "" },
      title: {
        nl:
          language === "nl"
            ? `Nieuwe stop (${code})`
            : `New stop (${code})`,
        en: `New stop (${code})`,
      },
      description: { nl: "", en: "" },
      estimatedDuration: 3,
    };
    try {
      const createdStop = await createTourStop(newStop);
      onUpdateStops([...stops, createdStop]);
      log("create-stop-from-qr", code);
      alert(
        language === "nl"
          ? `Nieuwe stop aangemaakt met QR-code "${code}". Bewerk hem bij "Stops beheren".`
          : `New stop created with QR code "${code}". Edit it under "Manage stops".`,
      );
    } catch (error) {
      console.error("Failed to create stop from QR", error);
      alert(
        language === "nl"
          ? "Aanmaken van de stop is mislukt."
          : "Creating the stop failed.",
      );
    }
  };

  return (
    <div>
      <h2 className="text-2xl mb-2">
        {language === "nl"
          ? "QR codes koppelen en aanmaken"
          : "Link & generate QR codes"}
      </h2>
      <p className="text-gray-600 mb-4">
        {language === "nl"
          ? "Elke stop krijgt automatisch een QR-code op basis van zijn code. Download en print om aan de muur te plakken."
          : "Each stop gets a QR code based on its code. Download and print to place on the wall."}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {stops.map((stop) => (
          <div
            key={stop.id}
            className="border-2 border-gray-200 rounded-xl p-3 text-center"
          >
            <div className="bg-white rounded-lg p-2 mb-2">
              {urls[stop.qrCode] ? (
                <img
                  src={urls[stop.qrCode]}
                  alt={stop.qrCode}
                  className="w-full"
                />
              ) : (
                <div className="aspect-square flex items-center justify-center text-gray-400 text-sm">
                  {language === "nl" ? "Geen code" : "No code"}
                </div>
              )}
            </div>
            <p className="text-sm text-gray-700 mb-1">
              {stop.title[language]}
            </p>
            <p className="text-xs text-gray-500 mb-2 font-mono">
              {stop.qrCode}
            </p>
            {urls[stop.qrCode] && (
              <button
                onClick={() =>
                  download(
                    urls[stop.qrCode],
                    `qr-${stop.qrCode}.png`,
                  )
                }
                className="w-full bg-[#0066B3] text-white text-sm py-1.5 rounded-lg hover:opacity-90 flex items-center justify-center gap-1"
              >
                <Download className="w-4 h-4" />
                {language === "nl" ? "Download" : "Download"}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="border-2 border-gray-200 rounded-xl p-4 bg-gray-50">
        <h3 className="text-lg mb-3 flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-[#0066B3]" />
          {language === "nl"
            ? "Eigen QR code aanmaken"
            : "Generate custom QR code"}
        </h3>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder={
              language === "nl"
                ? "URL of code…"
                : "URL or code…"
            }
            className="flex-1 px-3 py-2 rounded-lg border-2 border-gray-300"
          />
          <button
            onClick={generateCustom}
            className="bg-[#0066B3] text-white px-4 py-2 rounded-lg hover:opacity-90"
          >
            {language === "nl" ? "Genereer" : "Generate"}
          </button>
        </div>
        {customDataUrl && (
          <div className="flex flex-col items-center gap-3">
            <img
              src={customDataUrl}
              alt="custom qr"
              className="w-48 h-48"
            />
            <button
              onClick={() =>
                download(customDataUrl, `qr-${customText}.png`)
              }
              className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              {language === "nl"
                ? "Download PNG"
                : "Download PNG"}
            </button>

            <div className="w-full border-t-2 border-gray-200 pt-3 mt-1 space-y-3">
              <p className="text-sm text-gray-700">
                {language === "nl"
                  ? "Voeg deze QR-code toe:"
                  : "Add this QR code:"}
              </p>

              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={linkToStopId}
                  onChange={(e) =>
                    setLinkToStopId(
                      e.target.value === ""
                        ? ""
                        : Number(e.target.value),
                    )
                  }
                  className="flex-1 px-3 py-2 rounded-lg border-2 border-gray-300"
                >
                  <option value="">
                    {language === "nl"
                      ? "— Kies een bestaande stop —"
                      : "— Pick an existing stop —"}
                  </option>
                  {stops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title[language] || `#${s.id}`}{" "}
                      {s.qrCode ? `(${s.qrCode})` : ""}
                    </option>
                  ))}
                </select>
                <button
                  onClick={linkToStop}
                  disabled={linkToStopId === ""}
                  className="bg-[#0066B3] text-white px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-1"
                >
                  <Link2 className="w-4 h-4" />
                  {language === "nl"
                    ? "Koppel aan stop"
                    : "Link to stop"}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-500">
                  {language === "nl" ? "of" : "or"}
                </span>
                <span className="flex-1 h-px bg-gray-200" />
              </div>

              <button
                onClick={createStopFromCode}
                className="w-full bg-[#E30613] text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4" />
                {language === "nl"
                  ? "Maak nieuwe stop aan met deze QR"
                  : "Create new stop with this QR"}
              </button>
            </div>
          </div>
        )}
        <canvas ref={customRef} className="hidden" />
      </div>
    </div>
  );
}