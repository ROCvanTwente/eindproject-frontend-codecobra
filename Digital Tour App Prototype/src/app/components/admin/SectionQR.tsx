import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Download, RefreshCw, Link2, Plus } from "lucide-react";
import { Language, Stop } from "../../types";

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
        if (!stop.qrCode.id) continue;
        try {
          out[stop.qrCode.id] = await QRCode.toDataURL(
            stop.qrCode.id,
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

  const linkToStop = () => {
    const code = customText.trim();
    if (!code || linkToStopId === "") return;
    if (
      stops.some(
        (s) => s.qrCode.code === code && s.id !== linkToStopId,
      )
    ) {
      alert(
        language === "nl"
          ? "Deze QR-code is al aan een andere stop gekoppeld."
          : "This QR code is already linked to another stop.",
      );
      return;
    }
    onUpdateStops(
      stops.map((s) =>
        s.id === linkToStopId ? { ...s, qrCode: { ...s.qrCode, code } } : s,
      ),
    );
    log("link-qr-to-stop", `${code} → #${linkToStopId}`);
    const target = stops.find((s) => s.id === linkToStopId);
    alert(
      language === "nl"
        ? `QR-code "${code}" gekoppeld aan "${target?.titleNl ?? "#" + linkToStopId}".`
        : `QR code "${code}" linked to "${target?.titleEn ?? "#" + linkToStopId}".`,
    );
  };

  const createStopFromCode = () => {
    const code = customText.trim();
    if (!code) return;
    if (stops.some((s) => s.qrCode?.code === code)) {
      alert(
        language === "nl"
          ? "Deze QR-code bestaat al."
          : "This QR code already exists.",
      );
      return;
    }
    const newId = Math.max(0, ...stops.map((s) => s.id)) + 1;
    const newStop: Stop = {
      id: newId,
      qrCode: { id: newId, code, name: `QR Code ${newId}`, createdAt: new Date().toISOString(), statistics: [] },
      locationNl: "",
      locationEn: "",
      titleNl:
        language === "nl"
          ? `Nieuwe stop (${code})`
          : `New stop (${code})`,
      titleEn: `New stop (${code})`,
      descriptionNl: "",
      descriptionEn: "",
      estimatedDuration: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      order: stops.length,
    };
    onUpdateStops([...stops, newStop]);
    log("create-stop-from-qr", code);
    alert(
      language === "nl"
        ? `Nieuwe stop aangemaakt met QR-code "${code}". Bewerk hem bij "Stops beheren".`
        : `New stop created with QR code "${code}". Edit it under "Manage stops".`,
    );
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
              {urls[stop.qrCode.id] ? (
                <img
                  src={urls[stop.qrCode.id]}
                  alt={stop.qrCode?.code}
                  className="w-full"
                />
              ) : (
                <div className="aspect-square flex items-center justify-center text-gray-400 text-sm">
                  {language === "nl" ? "Geen code" : "No code"}
                </div>
              )}
            </div>
            <p className="text-sm text-gray-700 mb-1">
              {language === "nl" ? stop.titleNl : stop.titleEn}
            </p>
            <p className="text-xs text-gray-500 mb-2 font-mono">
              {stop.qrCode?.id}
            </p>
            {urls[stop.qrCode.id] && (
              <button
                onClick={() =>
                  download(
                    urls[stop.qrCode.id],
                    `qr-${stop.qrCode.id}.png`,
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
                      {s.titleNl || s.titleEn || `#${s.id}`}{" "}
                      {s.qrCode?.id ? `(${s.qrCode.id})` : ""}
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