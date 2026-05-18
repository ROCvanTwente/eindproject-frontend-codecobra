import { QrCode, Map, MapPin, Settings } from "lucide-react";
import { Language, Stop } from "../types";
import { TriangleDecoration } from "./TriangleDecoration";

interface QRScannerProps {
  language: Language;
  stops: Stop[];
  onScan: (qrCode: string) => void;
  onShowMap: () => void;
  onShowFloorPlan?: () => void;
  onShowAdmin?: () => void;
  onToggleLanguage: () => void;
  backgroundImage?: string;
}

export function QRScanner({
  language,
  stops,
  onScan,
  onShowMap,
  onShowFloorPlan,
  onShowAdmin,
  onToggleLanguage,
  backgroundImage,
}: QRScannerProps) {
  const bgStyle = backgroundImage
    ? {
        backgroundImage: `linear-gradient(rgba(255,255,255,0.88), rgba(255,255,255,0.88)), url(${backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : undefined;
  const demoStops = stops.filter((s) => s.qrCode);

  return (
    <div
      className="min-h-screen bg-white flex flex-col"
      style={bgStyle}
    >
      <button
        onClick={onToggleLanguage}
        className="fixed top-3 right-3 bg-white text-[#0066B3] px-4 py-2 rounded-xl text-base sm:text-xl hover:bg-gray-100 transition-colors shadow-lg z-50 border-2 border-[#0066B3]"
        aria-label={
          language === "nl"
            ? "Schakel naar Engels"
            : "Switch to Dutch"
        }
      >
        {language === "nl" ? "English" : "Nederlands"}
      </button>

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
        <div className="max-w-3xl mx-auto relative z-10">
          <h1 className="text-3xl sm:text-4xl mb-2 sm:mb-4">
            De Gieterij
          </h1>
          <p className="text-lg sm:text-2xl">
            {language === "nl"
              ? "Digitale rondleiding"
              : "Digital tour"}
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-5 sm:py-8">
        <div className="w-full max-w-md">
          <div className="bg-primary/5 rounded-3xl p-6 sm:p-12 mb-5 sm:mb-8 border-4 border-primary/20 flex items-center justify-center">
            <QrCode className="w-32 h-32 sm:w-48 sm:h-48 text-primary" />
          </div>

          <h2 className="text-2xl sm:text-3xl text-center mb-4 sm:mb-6">
            {language === "nl"
              ? "Scan een QR-code bij een stopplaats"
              : "Scan a QR code at a stop"}
          </h2>

          <div className="bg-blue-50 rounded-2xl p-4 sm:p-6 border-2 border-[#0066B3]/30 mb-5 sm:mb-8 relative overflow-hidden">
            <TriangleDecoration
              position="top-right"
              color="light-blue"
              size="small"
            />
            <p className="text-base sm:text-xl text-blue-900 leading-relaxed relative z-10">
              {language === "nl"
                ? "Loop naar een stopplaats en scan de QR-code die daar hangt."
                : "Walk to a stop and scan the QR code posted there."}
            </p>
          </div>

          {/* Stops-lijst — kies een stop om direct naartoe te gaan */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-[#0066B3]/20 mb-6 shadow-sm">
            <p className="text-base sm:text-xl text-[#0066B3] mb-3 sm:mb-4 text-center font-medium">
              {language === "nl"
                ? "Kies een stop"
                : "Choose a stop"}
            </p>
            <div className="space-y-2 sm:space-y-3">
              {demoStops.length === 0 && (
                <p className="text-center text-gray-500 text-sm sm:text-base py-3">
                  {language === "nl"
                    ? "Geen stops beschikbaar."
                    : "No stops available."}
                </p>
              )}
              {demoStops.map((stop, index) => (
                <button
                  key={stop.id}
                  onClick={() => onScan(stop.qrCode)}
                  className="w-full bg-white hover:bg-blue-50 text-foreground px-4 sm:px-6 py-3 sm:py-4 rounded-xl border-2 border-gray-200 hover:border-[#0066B3]/50 transition-colors text-base sm:text-xl text-left"
                >
                  <span className="block truncate">
                    Stop {index + 1}:{" "}
                    {stop.title[language] || stop.qrCode}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer met plattegrond, route en admin knoppen */}
      <div className="bg-[#0066B3] mt-auto relative overflow-hidden">
        <TriangleDecoration
          position="top-left"
          color="red"
          size="medium"
        />
        <div className="max-w-3xl mx-auto p-3 sm:p-5 relative z-10">
          <div
            className={`grid gap-2 sm:gap-4 ${onShowFloorPlan && onShowAdmin ? "grid-cols-3" : "grid-cols-2"}`}
          >
            {onShowFloorPlan && (
              <button
                onClick={onShowFloorPlan}
                className="flex flex-col items-center justify-center gap-1 sm:gap-2 bg-white hover:bg-gray-100 text-foreground px-2 sm:px-4 py-3 sm:py-6 rounded-xl transition-colors shadow-md"
              >
                <MapPin className="w-6 h-6 sm:w-9 sm:h-9 text-[#0066B3]" />
                <span className="text-sm sm:text-xl font-medium text-center leading-tight">
                  {language === "nl"
                    ? "Plattegrond"
                    : "Floor plan"}
                </span>
              </button>
            )}
            <button
              onClick={onShowMap}
              className="flex flex-col items-center justify-center gap-1 sm:gap-2 bg-white hover:bg-gray-100 text-foreground px-2 sm:px-4 py-3 sm:py-6 rounded-xl transition-colors shadow-md"
            >
              <Map className="w-6 h-6 sm:w-9 sm:h-9 text-[#0066B3]" />
              <span className="text-sm sm:text-xl font-medium text-center leading-tight">
                {language === "nl"
                  ? "Route-overzicht"
                  : "Route overview"}
              </span>
            </button>
            {onShowAdmin && (
              <button
                onClick={onShowAdmin}
                className="flex flex-col items-center justify-center gap-1 sm:gap-2 bg-white hover:bg-gray-100 text-foreground px-2 sm:px-4 py-3 sm:py-6 rounded-xl transition-colors shadow-md"
              >
                <Settings className="w-6 h-6 sm:w-9 sm:h-9 text-[#E30613]" />
                <span className="text-sm sm:text-xl font-medium text-center leading-tight">
                  {language === "nl" ? "Beheer" : "Admin"}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}