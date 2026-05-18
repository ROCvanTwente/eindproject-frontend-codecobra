import {
  Battery,
  BatteryLow,
  BatteryWarning,
  AlertTriangle,
} from "lucide-react";
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

function BatteryIcon({ pct }: { pct: number }) {
  if (pct <= 15)
    return <BatteryLow className="w-6 h-6 text-red-600" />;
  if (pct <= 30)
    return (
      <BatteryWarning className="w-6 h-6 text-amber-600" />
    );
  return <Battery className="w-6 h-6 text-green-600" />;
}

export function SectionBattery({
  language,
  settings,
  onChange,
}: Props) {
  const low = settings.beaconBatteries.filter(
    (b) => b.batteryPct <= settings.batteryThresholdPct,
  );

  return (
    <div>
      <h2 className="text-2xl mb-2">
        {language === "nl"
          ? "Beacon batterij"
          : "Beacon battery"}
      </h2>
      <p className="text-gray-600 mb-4">
        {language === "nl"
          ? "Batterijstand per beacon met waarschuwing als deze onder de drempelwaarde zakt."
          : "Battery level per beacon with alert when below the threshold."}
      </p>

      {low.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 mb-4 flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-700">
              {language === "nl"
                ? `${low.length} beacon(s) hebben een bijna lege batterij en moeten vervangen worden:`
                : `${low.length} beacon(s) are running low on battery and should be replaced:`}
            </p>
            <ul className="list-disc list-inside text-red-700 text-sm mt-1">
              {low.map((b) => (
                <li key={b.beaconId}>
                  {b.name} — {b.batteryPct}%
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <label className="block mb-6">
        <span className="text-sm text-gray-700">
          {language === "nl"
            ? `Waarschuwingsdrempel: ${settings.batteryThresholdPct}%`
            : `Warning threshold: ${settings.batteryThresholdPct}%`}
        </span>
        <input
          type="range"
          min={5}
          max={50}
          step={5}
          value={settings.batteryThresholdPct}
          onChange={(e) =>
            onChange(
              { batteryThresholdPct: Number(e.target.value) },
              {
                action: "set-battery-threshold",
                target: e.target.value + "%",
              },
            )
          }
          className="w-full mt-2 accent-[#0066B3]"
        />
      </label>

      <div className="space-y-2">
        {settings.beaconBatteries.map((b) => {
          const isLow =
            b.batteryPct <= settings.batteryThresholdPct;
          return (
            <div
              key={b.beaconId}
              className={`flex items-center gap-3 border-2 rounded-xl p-3 ${
                isLow
                  ? "border-red-300 bg-red-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <BatteryIcon pct={b.batteryPct} />
              <div className="flex-1 min-w-0">
                <p className="text-base">{b.name}</p>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
                  <div
                    className={`h-full ${isLow ? "bg-red-500" : "bg-green-500"}`}
                    style={{ width: `${b.batteryPct}%` }}
                  />
                </div>
              </div>
              <span
                className={`text-sm tabular-nums ${isLow ? "text-red-700" : "text-gray-600"}`}
              >
                {b.batteryPct}%
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 mt-4">
        {language === "nl"
          ? "Batterijwaarden worden real-time bijgewerkt zodra beacons via Bluetooth rapporteren."
          : "Battery levels are updated in real time as beacons report via Bluetooth."}
      </p>
    </div>
  );
}