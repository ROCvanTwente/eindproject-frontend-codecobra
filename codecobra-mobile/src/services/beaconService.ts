import { BleManager, Device, State } from "react-native-ble-plx";
import { Platform, PermissionsAndroid } from "react-native";
import {
  BeaconConfig,
  BEACONS,
  PATH_LOSS_EXPONENT,
  RSSI_WINDOW_SIZE,
  BEACON_STALE_THRESHOLD_MS,
} from "../config/beacons";

// ── Types ──────────────────────────────────────────────────────────────

export interface BeaconReading {
  beacon: BeaconConfig;
  rssi: number;
  distance: number;
  timestamp: number;
}

export interface EstimatedPosition {
  x: number;
  y: number;
  accuracy: number;
  beaconsUsed: number;
  nearestBeaconId: string;
}

type PositionCallback = (pos: EstimatedPosition) => void;

// ── RSSI → distance ───────────────────────────────────────────────────

function rssiToDistance(rssi: number, txPower: number): number {
  if (rssi === 0) return Infinity;
  const ratio = (txPower - rssi) / (10 * PATH_LOSS_EXPONENT);
  return Math.pow(10, ratio);
}

// ── Pure JS/TS Base64 → HEX Helper (Zonder atob) ──────────────────────

/**
 * Converteert een Base64 string rechtstreeks naar een Hex-string.
 * Dit vervangt 'atob' en werkt 100% veilig binnen React Native (Hermes engine).
 */
function base64ToHex(base64: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }

  let bufferLength = base64.length * 0.75;
  if (base64[base64.length - 1] === "=") {
    bufferLength--;
    if (base64[base64.length - 2] === "=") {
      bufferLength--;
    }
  }

  let p = 0;
  let hexResult = "";

  for (let i = 0; i < base64.length; i += 4) {
    const encoded1 = lookup[base64.charCodeAt(i)];
    const encoded2 = lookup[base64.charCodeAt(i + 1)];
    const encoded3 = lookup[base64.charCodeAt(i + 2)];
    const encoded4 = lookup[base64.charCodeAt(i + 3)];

    const bytes1 = (encoded1 << 2) | (encoded2 >> 4);
    const bytes2 = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    const bytes3 = ((encoded3 & 3) << 6) | (encoded4 & 63);

    if (p < bufferLength) {
      hexResult += bytes1.toString(16).padStart(2, "0");
      p++;
    }
    if (p < bufferLength) {
      hexResult += bytes2.toString(16).padStart(2, "0");
      p++;
    }
    if (p < bufferLength) {
      hexResult += bytes3.toString(16).padStart(2, "0");
      p++;
    }
  }

  return hexResult.toUpperCase();
}

// ── Sliding-window RSSI smoother ──────────────────────────────────────

class RssiSmoother {
  private windows = new Map<string, number[]>();

  push(beaconId: string, rssi: number): number {
    let buf = this.windows.get(beaconId);
    if (!buf) {
      buf = [];
      this.windows.set(beaconId, buf);
    }
    buf.push(rssi);
    if (buf.length > RSSI_WINDOW_SIZE) buf.shift();
    return buf.reduce((a, b) => a + b, 0) / buf.length;
  }

  clear() {
    this.windows.clear();
  }
}

// ── Trilateration (weighted centroid) ─────────────────────────────────

function trilaterate(readings: BeaconReading[]): EstimatedPosition {
  if (readings.length === 0) {
    return { x: 0, y: 0, accuracy: Infinity, beaconsUsed: 0, nearestBeaconId: "" };
  }

  const sorted = [...readings].sort((a, b) => a.distance - b.distance);
  if (sorted.length === 1) {
    const r = sorted[0];
    return {
      x: r.beacon.mapX,
      y: r.beacon.mapY,
      accuracy: r.distance,
      beaconsUsed: 1,
      nearestBeaconId: r.beacon.id,
    };
  }

  let totalWeight = 0;
  let wx = 0;
  let wy = 0;

  const used = sorted.slice(0, 3);
  for (const r of used) {
    const d = Math.max(r.distance, 0.1);
    const w = 1 / (d * d);
    wx += r.beacon.mapX * w;
    wy += r.beacon.mapY * w;
    totalWeight += w;
  }

  return {
    x: wx / totalWeight,
    y: wy / totalWeight,
    accuracy: sorted[0].distance,
    beaconsUsed: used.length,
    nearestBeaconId: sorted[0].beacon.id,
  };
}

// ── Beacon service singleton ──────────────────────────────────────────

const loggedIds = new Set<string>();

class BeaconService {
  private manager: BleManager | null = null;
  private scanning = false;
  private smoother = new RssiSmoother();
  private latestReadings = new Map<string, BeaconReading>();
  private listeners: PositionCallback[] = [];
  private updateTimer = null as ReturnType<typeof setInterval> | null;

  /**
   * Matcht apparaten op basis van de Service Data (UUID FDA5).
   */
  private matchBeacon(device: Device): BeaconConfig | null {
    if (!device.serviceData) return null;

    // Zoek naar de key in de serviceData map die "FDA5" bevat
    const fda5Key = Object.keys(device.serviceData).find((key) =>
      key.toUpperCase().includes("FDA5")
    );

    if (!fda5Key) return null;

    const base64Data = device.serviceData[fda5Key];
    if (!base64Data) return null;

    // Zet de rauwe bytes om naar de HEX string via onze nieuwe standalone helper
    const hexData = base64ToHex(base64Data); // Bijv: "6427114CB9C300006C3B27"

    // Doorloop jullie BEACONS configuratie array
    for (const beacon of BEACONS) {
      const targetSuffix = beacon.macSuffix.toUpperCase();

      // Controleer of de binnengekomen service data eindigt op jullie macSuffix
      if (hexData.endsWith(targetSuffix)) {
        if (!loggedIds.has(beacon.id)) {
          console.log(
            `[Beacon] ✓ MATCH GEVONDEN! ${beacon.id} | Hex=${hexData} | RSSI=${device.rssi}`
          );
          loggedIds.add(beacon.id);
        }
        return beacon;
      }
    }

    return null;
  }

  // ── Public API ────────────────────────────────────────────────────

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === "android") {
      const apiLevel = Platform.Version;
      if (typeof apiLevel === "number" && apiLevel >= 31) {
        const results = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        return Object.values(results).every(
          (v) => v === PermissionsAndroid.RESULTS.GRANTED
        );
      } else {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return result === PermissionsAndroid.RESULTS.GRANTED;
      }
    }
    return true;
  }

  async startScanning(): Promise<void> {
    if (this.scanning) return;
    if (!this.manager) {
      this.manager = new BleManager();
    }

    const state = await this.manager.state();
    if (state !== State.PoweredOn) {
      console.warn("[BeaconService] Bluetooth not powered on:", state);
      return;
    }

    console.log("[BeaconService] Starting BLE scan (matching on FDA5 Service Data)...");
    this.scanning = true;
    this.smoother.clear();
    this.latestReadings.clear();
    loggedIds.clear();

    // We scannen specifiek op de Service UUID fda5 om ruis te filteren
    this.manager.startDeviceScan(
      ["0000fda5-0000-1000-8000-00805f9b34fb", "fda5"],
      { allowDuplicates: true },
      (error, device) => {
        if (error) {
          if (error.message.includes("cancelled") || error.message.includes("Cancelled")) return;
          console.warn("[BeaconService] Scan error:", error.message);
          return;
        }
        if (!device || device.rssi == null) return;

        const beacon = this.matchBeacon(device);
        if (!beacon) return;

        const smoothedRssi = this.smoother.push(beacon.id, device.rssi);
        const distance = rssiToDistance(smoothedRssi, beacon.txPower);

        this.latestReadings.set(beacon.id, {
          beacon,
          rssi: smoothedRssi,
          distance,
          timestamp: Date.now(),
        });
      }
    );

    this.updateTimer = setInterval(() => this.computePosition(), 500);
  }

  stopScanning(): void {
    this.scanning = false;
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    try {
      this.manager?.stopDeviceScan();
    } catch (_e) {}
  }

  onPosition(cb: PositionCallback): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  isScanning(): boolean {
    return this.scanning;
  }

  destroy(): void {
    this.stopScanning();
    this.manager?.destroy();
    this.manager = null;
  }

  // ── Internal ──────────────────────────────────────────────────────

  private computePosition(): void {
    const now = Date.now();
    const fresh: BeaconReading[] = [];
    for (const [id, reading] of this.latestReadings) {
      if (now - reading.timestamp > BEACON_STALE_THRESHOLD_MS) {
        this.latestReadings.delete(id);
      } else {
        fresh.push(reading);
      }
    }

    if (fresh.length === 0) return;

    const pos = trilaterate(fresh);
    if (pos.x === 0 && pos.y === 0) return;

    for (const cb of this.listeners) {
      cb(pos);
    }
  }
}

export const beaconService = new BeaconService();
