import { useCallback, useEffect, useMemo, useState } from "react";
import { Language, Stop } from "../../types";
import { AdminSettings } from "../../data/settings";
import { getQRCodeStatistics } from "../../../services/api";

interface QRCodeStatsResponse {
  qrCodeId: number;
  scanCount: number;
  lastScannedAt?: string;
}

interface Props {
  language: Language;
  settings: AdminSettings;
  stops: Stop[];
}

export function SectionStats({
  language,
  settings: _settings,
  stops,
}: Props) {
  const [statsByQrId, setStatsByQrId] = useState<Record<number, QRCodeStatsResponse>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const qrIds = useMemo(
    () =>
      Array.from(
        new Set(
          stops
            .map((s) => Number(s.qrCode?.id))
            .filter((id) => Number.isFinite(id) && id > 0),
        ),
      ),
    [stops],
  );

  const loadStats = useCallback(
    async (showLoading: boolean) => {
      if (qrIds.length === 0) {
        setStatsByQrId({});
        setErrorMessage(null);
        return;
      }

      if (showLoading) {
        setIsLoading(true);
      }
      setErrorMessage(null);

      try {
        const entries = await Promise.all(
          qrIds.map(async (qrId) => {
            const stat = await getQRCodeStatistics(qrId);
            return [qrId, stat] as const;
          }),
        );

        const next: Record<number, QRCodeStatsResponse> = {};
        for (const [qrId, stat] of entries) {
          if (stat) {
            next[qrId] = stat;
          }
        }
        setStatsByQrId(next);
      } catch {
        setErrorMessage(
          language === "nl"
            ? "Statistieken konden niet worden geladen."
            : "Could not load statistics.",
        );
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [qrIds, language],
  );

  useEffect(() => {
    void loadStats(true);

    const intervalId = window.setInterval(() => {
      void loadStats(false);
    }, 5000);

    const onVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        void loadStats(false);
      }
    };

    document.addEventListener("visibilitychange", onVisibilityOrFocus);
    window.addEventListener("focus", onVisibilityOrFocus);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityOrFocus);
      window.removeEventListener("focus", onVisibilityOrFocus);
    };
  }, [loadStats]);

  const rows = stops.map((stop) => {
    const qrId = Number(stop.qrCode?.id);
    const stat = Number.isFinite(qrId) ? statsByQrId[qrId] : undefined;
    const visits = stat?.scanCount ?? 0;

    return {
      stop,
      visits,
      totalDurationSec: visits * Number(stop.estimatedDuration ?? 0) * 60,
      lastScannedAt: stat?.lastScannedAt ?? null,
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
          ? "Live overzicht van scans per stop uit de database."
          : "Live overview of scans per stop from the database."}
      </p>

      {errorMessage && (
        <div className="mb-4 rounded-xl border-2 border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

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
            {language === "nl" ? "Totale tijd (geschat)" : "Total time (estimated)"}
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
                {language === "nl"
                  ? r.stop.titleNl
                  : r.stop.titleEn}
              </span>
              <span className="text-sm text-gray-500">
                {r.visits}×
              </span>
            </div>

            <p className="text-xs text-gray-500 mb-2">
              {r.lastScannedAt
                ? language === "nl"
                  ? `Laatst gescand: ${new Date(r.lastScannedAt).toLocaleString("nl-NL")}`
                  : `Last scanned: ${new Date(r.lastScannedAt).toLocaleString("en-US")}`
                : language === "nl"
                  ? "Nog niet gescand"
                  : "Not scanned yet"}
            </p>

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
          {isLoading
            ? language === "nl"
              ? "Statistieken laden..."
              : "Loading statistics..."
            : language === "nl"
              ? "Nog geen scan-data gevonden in de database."
              : "No scan data found in the database yet."}
        </p>
      )}
    </div>
  );
}