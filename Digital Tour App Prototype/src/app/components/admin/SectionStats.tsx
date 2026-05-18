import { Language, Stop } from "../../types";
import { AdminSettings } from "../../data/settings";

interface Props {
  language: Language;
  settings: AdminSettings;
  stops: Stop[];
}

export function SectionStats({
  language,
  settings,
  stops,
}: Props) {
  // Ensure we have a row for every stop, falling back to zeroes.
  const rows = stops.map((stop) => {
    const stat = settings.visitStats.find(
      (s) => s.stopId === stop.id,
    );
    return {
      stop,
      visits: stat?.visits ?? 0,
      totalDurationSec: stat?.totalDurationSec ?? 0,
    };
  });

  const totalVisits = rows.reduce((a, r) => a + r.visits, 0);
  const totalDuration = rows.reduce(
    (a, r) => a + r.totalDurationSec,
    0,
  );
  const maxVisits = Math.max(1, ...rows.map((r) => r.visits));

  return (
    <div>
      <h2 className="text-2xl mb-2">
        {language === "nl" ? "Statistieken" : "Statistics"}
      </h2>
      <p className="text-gray-600 mb-4">
        {language === "nl"
          ? "Overzicht van hoe vaak elke stop is bezocht (could-have)."
          : "Overview of how often each stop has been visited (could-have)."}
      </p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-blue-50 border-2 border-[#0066B3]/30 rounded-xl p-4">
          <p className="text-sm text-[#0066B3]">
            {language === "nl"
              ? "Totaal bezoeken"
              : "Total visits"}
          </p>
          <p className="text-3xl text-[#0066B3]">
            {totalVisits}
          </p>
        </div>
        <div className="bg-red-50 border-2 border-[#E30613]/30 rounded-xl p-4">
          <p className="text-sm text-[#E30613]">
            {language === "nl" ? "Totale tijd" : "Total time"}
          </p>
          <p className="text-3xl text-[#E30613]">
            {Math.round(totalDuration / 60)} min
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((r) => (
          <div
            key={r.stop.id}
            className="border-2 border-gray-200 rounded-xl p-3"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-base">
                {r.stop.title[language]}
              </span>
              <span className="text-sm text-gray-500">
                {r.visits}×
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0066B3]"
                style={{
                  width: `${(r.visits / maxVisits) * 100}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {totalVisits === 0 && (
        <p className="text-gray-500 text-center py-6 text-sm">
          {language === "nl"
            ? "Nog geen bezoekersdata. Statistieken verschijnen zodra bezoekers de rondleiding hebben gevolgd."
            : "No visitor data yet. Statistics will appear once visitors complete the tour."}
        </p>
      )}
    </div>
  );
}