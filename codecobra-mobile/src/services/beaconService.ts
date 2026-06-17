import { BleManager, Device, State } from "react-native-ble-plx";
import { Platform, PermissionsAndroid } from "react-native";
import {
  BeaconConfig,
  BEACONS,
  BEACON_SERVICE_UUID,
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

// ── Base64 → hex bytes ────────────────────────────────────────────────

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const B64_LOOKUP = new Uint8Array(128);
for (let i = 0; i < B64.length; i++) B64_LOOKUP[B64.charCodeAt(i)] = i;

function base64ToBytes(b64: string): number[] {
  const bytes: number[] = [];
  let buf = 0;
  let bits = 0;
  for (const ch of b64) {
    if (ch === "=") break;
    const code = ch.charCodeAt(0);
    if (code >= 128) continue;
    const val = B64_LOOKUP[code];
    buf = (buf << 6) | val;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buf >> bits) & 0xff);
    }
  }
  return bytes;
}

function bytesToHex(bytes: number[]): string {
  return bytes.map((b) => b.toString(16).padStart(2, "0").toUpperCase()).join("");
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

// All possible UUID key formats react-native-ble-plx might use for FDA5.
const FDA5_KEYS = [
  BEACON_SERVICE_UUID.toLowerCase(),
  BEACON_SERVICE_UUID.toUpperCase(),
  `0000${BEACON_SERVICE_UUID.toLowerCase()}-0000-1000-8000-00805f9b34fb`,
  `0000${BEACON_SERVICE_UUID.toUpperCase()}-0000-1000-8000-00805F9B34FB`,
];

class BeaconService {
  private manager: BleManager | null = null;
  private scanning = false;
  private smoother = new RssiSmoother();
  private latestReadings = new Map<string, BeaconReading>();
  private listeners: PositionCallback[] = [];
  private updateTimer: ReturnType<typeof setInterval> | null = null;

  private matchBeacon(device: Device): BeaconConfig | null {
    // 1. Check serviceData for FDA5 UUID key.
    const sd = device.serviceData;
    if (sd) {
      for (const key of Object.keys(sd)) {
        const isMatch = FDA5_KEYS.some(
          (k) => key === k || key.toLowerCase() === k.toLowerCase(),
        );
        if (!isMatch) continue;

        const b64 = sd[key];
        if (!b64) continue;

        const bytes = base64ToBytes(b64);
        const hex = bytesToHex(bytes);

        console.log(`[Beacon] FDA5 data: ${hex} from ${device.name || device.id}`);

        for (const beacon of BEACONS) {
          if (hex.endsWith(beacon.serviceDataSuffix)) {
            return beacon;
          }
        }
      }
    }

    // 2. Check manufacturerData as fallback (some firmwares put it there).
    if (device.manufacturerData) {
      const bytes = base64ToBytes(device.manufacturerData);
      const hex = bytesToHex(bytes);
      for (const beacon of BEACONS) {
        if (hex.endsWith(beacon.serviceDataSuffix)) {
          return beacon;
        }
      }
    }

    // 3. If none of the above matched, try matching on any serviceData value.
    if (sd) {
      for (const key of Object.keys(sd)) {
        const b64 = sd[key];
        if (!b64) continue;
        const bytes = base64ToBytes(b64);
        const hex = bytesToHex(bytes);
        for (const beacon of BEACONS) {
          if (hex.endsWith(beacon.serviceDataSuffix)) {
            console.log(`[Beacon] Matched ${beacon.id} via serviceData key "${key}": ${hex}`);
            return beacon;
          }
        }
      }
    }

    return null;
  }

  // ── Public API ────────────────────────────────────────────────────

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === "android") {
      const apiLevel = Platform.Version;
      if (apiLevel >= 31) {
        const results = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        return Object.values(results).every(
          (v) => v === PermissionsAndroid.RESULTS.GRANTED,
        );
      } else {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
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

    console.log("[BeaconService] Starting BLE scan...");
    this.scanning = true;
    this.smoother.clear();
    this.latestReadings.clear();

    // Scan for all devices (null UUID array) — we match on service data content.
    // allowDuplicates: true so we keep getting RSSI updates.
    this.manager.startDeviceScan(null, { allowDuplicates: true }, (error, device) => {
      if (error) {
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
    });

    this.updateTimer = setInterval(() => this.computePosition(), 500);
  }

  stopScanning(): void {
    if (this.manager && this.scanning) {
      this.manager.stopDeviceScan();
    }
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    this.scanning = false;
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
