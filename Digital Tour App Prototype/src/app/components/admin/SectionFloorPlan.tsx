import { useMemo } from "react";
import { MapPin, Ruler, TriangleAlert } from "lucide-react";
import { Language, Stop } from "../../types";

const plattegrondImg = new URL(
  "../../../imports/PlattegrondGieterijBeganegrondV2.0.png",
  import.meta.url,
).href;

const MAP_W = 1528;
const MAP_H = 704;

interface Props {
  language: Language;
  stops: Stop[];
  onEdit: (stop: Stop) => void;
  onCreate: () => void;
}

function scaleX(x: number) {
  return (x / MAP_W) * 100;
}

function scaleY(y: number) {
  return (y / MAP_H) * 100;
}

export function SectionFloorPlan({
  language,
  stops,
  onEdit,
  onCreate,
}: Props) {
  const positionedStops = useMemo(
    () =>
      stops
        .filter(
          (s) => typeof s.mapX === "number" && typeof s.mapY === "number",
        )
        .slice()
        .sort((a, b) => a.id - b.id),
    [stops],
  );

  const unpositionedStops = useMemo(
    () => stops.filter((s) => s.mapX == null || s.mapY == null),
    [stops],
  );

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold mb-1">
            {language === "nl" ? "Plattegrond" : "Floor plan"}
          </h2>
          <p className="text-gray-600 max-w-2xl">
            {language === "nl"
              ? "Hier zie je de fysieke locatie van alle stops op de kaart. Dit helpt admins en gebruikers om snel te begrijpen waar een stop zich bevindt."
              : "This shows the physical location of all stops on the map. It helps admins and users quickly understand where each stop is located."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-700 shadow-sm">
            <div className="text-xs uppercase tracking-wide opacity-70">
              {language === "nl" ? "Geplaatste stops" : "Placed stops"}
            </div>
            <div className="text-2xl font-bold">
              {positionedStops.length}/{stops.length}
            </div>
          </div>
          <button
            onClick={onCreate}
            className="bg-[#0066B3] text-white px-4 py-3 rounded-lg hover:opacity-90"
          >
            + {language === "nl" ? "Nieuwe stop" : "New stop"}
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex items-start gap-3">
        <div className="w-11 h-11 rounded-full bg-[#0066B3] text-white flex items-center justify-center flex-shrink-0">
          <MapPin className="w-5 h-5" />
        </div>
        <p className="text-gray-700 leading-relaxed">
          {language === "nl"
            ? "Klik op een marker of op een stop in de lijst om direct de stop te bewerken."
            : "Click a marker or a stop in the list to edit it directly."}
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)] gap-4 items-start">
        <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-700">
              <Ruler className="w-4 h-4" />
              <span className="font-medium">
                {language === "nl" ? "Plattegrond met markers" : "Floor plan with markers"}
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {MAP_W} × {MAP_H}
            </span>
          </div>

          <div className="relative w-full bg-gray-100">
            <img
              src={plattegrondImg}
              alt={language === "nl" ? "Plattegrond" : "Floor plan"}
              className="w-full h-auto block"
            />

            {positionedStops.map((stop, index) => {
              const x = typeof stop.mapX === "number" ? scaleX(stop.mapX) : 0;
              const y = typeof stop.mapY === "number" ? scaleY(stop.mapY) : 0;
              return (
                <button
                  key={stop.id}
                  type="button"
                  onClick={() => onEdit(stop)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group"
                  style={{ left: `${x}%`, top: `${y}%` }}
                  title={stop.title[language] || stop.title.nl || `#${stop.id}`}
                >
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-4 h-4 rounded-full bg-[#E30613]/20 animate-ping" />
                    <div className="relative w-3.5 h-3.5 rounded-full bg-[#E30613] text-white border border-white shadow-lg flex items-center justify-center text-[8px] group-hover:scale-110 transition-transform">
                      {index + 1}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 shadow-sm">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">
              {language === "nl" ? "Legenda" : "Legend"}
            </h3>
            <div className="flex items-center gap-3 text-gray-700">
              <div className="relative w-4 h-4 flex items-center justify-center">
                <div className="absolute w-4 h-4 rounded-full bg-[#E30613]/20 animate-ping" />
                <div className="relative w-3 h-3 rounded-full bg-[#E30613] border border-white" />
              </div>
              <span>
                {language === "nl" ? "Stop op de plattegrond" : "Stop on the floor plan"}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 shadow-sm">
            <h3 className="text-lg font-semibold mb-3 text-gray-900">
              {language === "nl" ? "Stops zonder positie" : "Stops without position"}
            </h3>
            {unpositionedStops.length === 0 ? (
              <p className="text-green-700 bg-green-50 border border-green-200 rounded-xl p-3">
                {language === "nl" ? "Alle stops hebben een positie." : "All stops have a position."}
              </p>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
                {unpositionedStops.map((stop) => (
                    <button
                      key={stop.id}
                      type="button"
                      onClick={() => onEdit(stop)}
                      className="w-full text-left flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50 hover:border-[#0066B3]"
                    >
                      <TriangleAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {stop.title[language] || stop.title.nl || `#${stop.id}`}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {language === "nl" ? "Geen positie ingesteld" : "No position set"}
                        </p>
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 shadow-sm">
            <h3 className="text-lg font-semibold mb-3 text-gray-900">
              {language === "nl" ? "Alle stops" : "All stops"}
            </h3>
            <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
              {stops.map((stop) => (
                <button
                  key={stop.id}
                  type="button"
                  onClick={() => onEdit(stop)}
                  className="w-full text-left p-3 rounded-xl border border-gray-200 hover:border-[#0066B3]"
                >
                  <p className="font-medium text-gray-900 truncate">
                    {stop.title[language] || stop.title.nl || `#${stop.id}`}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {stop.location[language] || stop.location.nl || "-"}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}