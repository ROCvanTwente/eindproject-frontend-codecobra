import { useEffect, useRef, useState } from "react";
import {
  Bluetooth,
  BluetoothConnected,
  BluetoothOff,
  X,
  Loader2,
} from "lucide-react";
import { Language } from "../types";

/**
 * Mapping of beacon device names (or name prefixes) to waypoint IDs on the
 * floor plan graph. In production you would configure real iBeacon UUID /
 * major / minor values here. For this prototype we match on the advertised
 * local name — e.g. a beacon named "Gieterij-1" resolves to waypoint "b1".
 */
const BEACON_NAME_MAP: Record<
  string,
  { wpId: string; nl: string; en: string }
> = {
  "Gieterij-1": {
    wpId: "b1",
    nl: "Stop 1 – Hoofdingang",
    en: "Stop 1 – Main entrance",
  },
  "Gieterij-2": {
    wpId: "b2",
    nl: "Stop 2 – Tentoonstelling",
    en: "Stop 2 – Exhibition",
  },
  "Gieterij-3": {
    wpId: "b3",
    nl: "Stop 3 – Balustrade links",
    en: "Stop 3 – Left balustrade",
  },
  "Gieterij-4": {
    wpId: "b4",
    nl: "Stop 4 – Balustrade rechts",
    en: "Stop 4 – Right balustrade",
  },
  "Gieterij-5": {
    wpId: "b5",
    nl: "Stop 5 – Overzichtspunt",
    en: "Stop 5 – Overview point",
  },
};

interface DetectedBeacon {
  name: string;
  wpId: string;
  rssi: number;
  lastSeen: number;
}

interface BluetoothBeaconProps {
  language: Language;
  onPositionChange: (wpId: string) => void;
}

export function BluetoothBeacon({
  language,
  onPositionChange,
}: BluetoothBeaconProps) {
  const [supported, setSupported] = useState<boolean>(false);
  const [scanning, setScanning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [beacons, setBeacons] = useState<
    Record<string, DetectedBeacon>
  >({});
  const [activeBeacon, setActiveBeacon] = useState<
    string | null
  >(null);
  const scanRef = useRef<any>(null);

  useEffect(() => {
    const nav: any =
      typeof navigator !== "undefined" ? navigator : null;
    setSupported(
      !!(
        nav?.bluetooth?.requestLEScan ||
        nav?.bluetooth?.requestDevice
      ),
    );
  }, []);

  // Re-evaluate nearest beacon whenever the map updates
  useEffect(() => {
    const entries = Object.values(beacons).filter(
      (b) => Date.now() - b.lastSeen < 8000,
    );
    if (entries.length === 0) return;
    entries.sort((a, b) => b.rssi - a.rssi); // higher RSSI = closer
    const nearest = entries[0];
    if (nearest.wpId !== activeBeacon) {
      setActiveBeacon(nearest.wpId);
      onPositionChange(nearest.wpId);
    }
  }, [beacons, activeBeacon, onPositionChange]);

  const stopScan = () => {
    try {
      scanRef.current?.stop?.();
    } catch {}
    scanRef.current = null;
    setScanning(false);
  };

  useEffect(() => () => stopScan(), []);

  const handleAdvertisement = (event: any) => {
    const name: string | undefined =
      event.device?.name || event.name;
    if (!name) return;
    const mapped = BEACON_NAME_MAP[name];
    if (!mapped) return;
    const rssi: number = event.rssi ?? -100;
    setBeacons((prev) => ({
      ...prev,
      [name]: {
        name,
        wpId: mapped.wpId,
        rssi,
        lastSeen: Date.now(),
      },
    }));
  };

  const startScan = async () => {
    setError(null);
    const nav: any = navigator as any;
    if (!nav?.bluetooth) {
      setError(
        language === "nl"
          ? "Web Bluetooth wordt niet ondersteund door deze browser."
          : "Web Bluetooth is not supported by this browser.",
      );
      return;
    }

    setScanning(true);

    // Preferred: passive LE scan (Chrome Android with experimental flag)
    if (typeof nav.bluetooth.requestLEScan === "function") {
      try {
        const scan = await nav.bluetooth.requestLEScan({
          acceptAllAdvertisements: true,
          keepRepeatedDevices: true,
        });
        scanRef.current = scan;
        nav.bluetooth.addEventListener(
          "advertisementreceived",
          handleAdvertisement,
        );
        return;
      } catch (e: any) {
        setError(e?.message ?? String(e));
        setScanning(false);
        return;
      }
    }

    // Fallback: one-shot device picker with watchAdvertisements()
    try {
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ["battery_service"],
      });
      if (device.watchAdvertisements) {
        device.addEventListener(
          "advertisementreceived",
          handleAdvertisement,
        );
        await device.watchAdvertisements();
        scanRef.current = {
          stop: () => {
            try {
              device.removeEventListener(
                "advertisementreceived",
                handleAdvertisement,
              );
            } catch {}
          },
        };
      } else {
        // Browser can only pair, not passively scan — treat the chosen device
        // as the active beacon if its name matches the map.
        const mapped = device.name
          ? BEACON_NAME_MAP[device.name]
          : null;
        if (mapped) {
          setBeacons({
            [device.name]: {
              name: device.name,
              wpId: mapped.wpId,
              rssi: -50,
              lastSeen: Date.now(),
            },
          });
        } else {
          setError(
            language === "nl"
              ? `Apparaat "${device.name ?? "?"}" is geen bekende Gieterij-beacon.`
              : `Device "${device.name ?? "?"}" is not a known Gieterij beacon.`,
          );
        }
        setScanning(false);
      }
    } catch (e: any) {
      if (e?.name !== "NotFoundError") {
        setError(e?.message ?? String(e));
      }
      setScanning(false);
    }
  };

  const detected = Object.values(beacons).sort(
    (a, b) => b.rssi - a.rssi,
  );

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {scanning ? (
            <BluetoothConnected className="w-5 h-5 text-[#0066B3]" />
          ) : supported ? (
            <Bluetooth className="w-5 h-5 text-gray-600" />
          ) : (
            <BluetoothOff className="w-5 h-5 text-gray-400" />
          )}
          <p className="text-base text-gray-700">
            {language === "nl"
              ? "Bluetooth beacons"
              : "Bluetooth beacons"}
          </p>
        </div>
        {scanning ? (
          <button
            onClick={stopScan}
            className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-xl text-sm transition-colors"
          >
            <X className="w-4 h-4" />
            {language === "nl" ? "Stop" : "Stop"}
          </button>
        ) : (
          <button
            onClick={startScan}
            disabled={!supported}
            className="flex items-center gap-1.5 bg-[#0066B3] hover:bg-[#005499] disabled:bg-gray-300 text-white px-3 py-1.5 rounded-xl text-sm transition-colors"
          >
            <Bluetooth className="w-4 h-4" />
            {language === "nl" ? "Verbind" : "Connect"}
          </button>
        )}
      </div>

      {!supported && (
        <p className="text-sm text-gray-500">
          {language === "nl"
            ? "Web Bluetooth is alleen beschikbaar in Chrome/Edge op een Android-telefoon of desktop."
            : "Web Bluetooth is only available in Chrome/Edge on Android phones or desktop."}
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}

      {scanning && detected.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
          <Loader2 className="w-4 h-4 animate-spin" />
          {language === "nl"
            ? "Zoeken naar beacons…"
            : "Searching for beacons…"}
        </div>
      )}

      {detected.length > 0 && (
        <ul className="mt-2 space-y-1">
          {detected.map((b) => {
            const info = BEACON_NAME_MAP[b.name];
            const isActive = b.wpId === activeBeacon;
            return (
              <li
                key={b.name}
                className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
                  isActive
                    ? "bg-blue-50 border-[#0066B3]"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <span className="text-sm text-gray-800">
                  {info ? info[language] : b.name}
                </span>
                <span className="text-xs text-gray-500 tabular-nums">
                  {b.rssi} dBm
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}