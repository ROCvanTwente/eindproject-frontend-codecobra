import { useRef } from "react";
import {
  ArrowLeft,
  ChevronRight,
  MapPin,
  Clock,
} from "lucide-react";
import { Language, Stop } from "../types";
import { TriangleDecoration } from "./TriangleDecoration";

interface RouteOverviewProps {
  language: Language;
  stops: Stop[];
  onBack: () => void;
  onSelectStop: (stop: Stop) => void;
}

export function RouteOverview({
  language,
  stops,
  onBack,
  onSelectStop,
}: RouteOverviewProps) {
  const listRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ── Fixed header ── */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-primary shadow-lg">
        <TriangleDecoration
          position="top-right"
          color="blue"
          size="medium"
        />
        <div className="relative z-10 max-w-2xl mx-auto px-4 pt-4 pb-5 flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex-shrink-0 bg-white/20 hover:bg-white/30 text-white p-3 rounded-xl transition-colors border border-white/30"
            aria-label={language === "nl" ? "Terug" : "Back"}
          >
            <ArrowLeft className="w-7 h-7" />
          </button>
          <div className="min-w-0">
            <h1 className="text-3xl text-white leading-tight">
              {language === "nl"
                ? "Route-overzicht"
                : "Route overview"}
            </h1>
            <p className="text-lg text-white/80">
              {language === "nl"
                ? `${stops.length} stopplaatsen • De Gieterij`
                : `${stops.length} stops • De Gieterij`}
            </p>
          </div>
        </div>
      </div>

      {/* ── Scrollable content (offset for fixed header) ── */}
      <div
        className="pt-28 pb-8 px-4 max-w-2xl mx-auto w-full"
        ref={listRef}
      >
        {/* Intro card */}
        <div className="bg-white rounded-2xl p-5 mb-5 border-2 border-[#0066B3]/20 shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-[#0066B3] flex items-center justify-center flex-shrink-0">
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <p className="text-xl text-gray-700 leading-snug">
            {language === "nl"
              ? "Tik op een stop om de informatie te bekijken of volg de QR-codes door het gebouw."
              : "Tap a stop to view the information, or follow the QR codes through the building."}
          </p>
        </div>

        {/* Stop cards */}
        <div className="space-y-4">
          {stops.map((stop, index) => (
            <button
              key={stop.id}
              onClick={() => onSelectStop(stop)}
              className="w-full text-left bg-white rounded-2xl shadow-md border-2 border-gray-100 hover:border-[#0066B3]/40 active:scale-[0.98] transition-all overflow-hidden group"
            >
              {/* Colored top stripe */}
              <div className="h-1.5 bg-primary w-full" />

              <div className="flex items-stretch">
                {/* Number column with arrow */}
                <div className="bg-primary flex items-center justify-center gap-2 px-3 flex-shrink-0">
                  <ChevronRight className="w-4 h-4 text-white/70" />
                  <span className="text-4xl text-white font-bold">
                    {index + 1}
                  </span>
                </div>

                {/* Text content */}
                <div className="flex-1 px-5 py-4 min-w-0">
                  <h2 className="text-2xl leading-tight text-gray-900 mb-1 truncate">
                    {stop.title[language]}
                  </h2>
                  <p className="text-lg text-[#0066B3] mb-2 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">
                      {stop.location[language]}
                    </span>
                  </p>
                  <p className="text-base text-gray-500 line-clamp-2 leading-snug">
                    {stop.description[language]}
                  </p>
                  {stop.estimatedDuration && (
                    <p className="mt-2 text-sm text-gray-400 flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {stop.estimatedDuration}{" "}
                      {language === "nl" ? "min." : "min."}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* End note */}
        <div className="mt-6 bg-green-50 rounded-2xl p-5 border-2 border-green-200 text-center">
          <p className="text-xl text-green-800">
            {language === "nl"
              ? `✓ Totale rondleiding: ~${stops.reduce((sum, s) => sum + s.estimatedDuration, 0)} minuten`
              : `✓ Total tour: ~${stops.reduce((sum, s) => sum + s.estimatedDuration, 0)} minutes`}
          </p>
        </div>
      </div>
    </div>
  );
}