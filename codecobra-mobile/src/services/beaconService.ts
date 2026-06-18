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

// ── Base64 → Hex Utilities ───────────────────────────────────────────

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

// ── Trilateration ─────────────────────────────────────────────────────

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

const loggedKeys = new Set<string>();

class BeaconService {
  private manager: BleManager | null = null;
  private scanning = false;
  private smoother = new RssiSmoother();
  private latestReadings = new Map<string, BeaconReading>();
  private listeners: PositionCallback[] = [];
  private updateTimer: ReturnType<typeof setInterval> | null = null;
  private dutyCycleTimer: ReturnType<typeof setTimeout> | null = null;

  private matchBeacon(device: Device): BeaconConfig | null {
    // Strategy 1: Check manufacturerData (iBeacon format).
    // iBeacon layout: 4C00 0215 [16-byte UUID] [2-byte Major] [2-byte Minor] [TX]
    // Our suffix = Major(2 bytes) + Minor low byte, e.g. "6C3AB5" = Major 0x6C3A, Minor 0x00B5
    if (device.manufacturerData) {
      try {
        const bytes = base64ToBytes(device.manufacturerData);
        const hex = bytesToHex(bytes);

        // Log any iBeacon for debugging (Apple prefix 4C000215).
        if (hex.startsWith("4C000215") && !loggedKeys.has(hex.slice(-12))) {
          const tail = hex.slice(-12);
          console.log(`[iBeacon] raw=${hex.slice(-12)} full_len=${bytes.length} name=${device.name || device.id}`);
          loggedKeys.add(tail);
        }

        for (const beacon of BEACONS) {
          if (hex.includes(beacon.serviceDataSuffix)) {
            if (!loggedKeys.has("match-" + beacon.id)) {
              console.log(`[Beacon] ✓ Matched ${beacon.id} via manufacturerData | suffix=${beacon.serviceDataSuffix}`);
              loggedKeys.add("match-" + beacon.id);
            }
            return beacon;
          }
        }
      } catch (_e) {}
    }

    // Strategy 2: Check serviceData (non-iBeacon / FDA5 format).
    const sd = device.serviceData;
    if (sd) {
      for (const key of Object.keys(sd)) {
        const b64 = sd[key];
        if (!b64) continue;
        const bytes = base64ToBytes(b64);
        const hex = bytesToHex(bytes);

        for (const beacon of BEACONS) {
          if (hex.includes(beacon.serviceDataSuffix)) {
            if (!loggedKeys.has("match-" + beacon.id)) {
              console.log(`[Beacon] ✓ Matched ${beacon.id} via serviceData key="${key}" | suffix=${beacon.serviceDataSuffix}`);
              loggedKeys.add("match-" + beacon.id);
            }
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
      console.warn("[BeaconService] Bluetooth is turned off:", state);
      return;
    }

    console.log("[BeaconService] Starting clean iBeacon processing tracking sequence...");
    this.scanning = true;
    this.smoother.clear();
    this.latestReadings.clear();
    loggedKeys.clear();

    this.runScanIteration();
    this.updateTimer = setInterval(() => this.computePosition(), 500);
  }

  // Safe intermittent scanning loop to bypass background system restrictions
  private runScanIteration(): void {
    if (!this.scanning || !this.manager) return;

    try {
      this.manager.stopDeviceScan();
    } catch (e) {}

    // Scan with an open filter (null) to extract the custom manufacturer payload fields
    this.manager.startDeviceScan(null, { allowDuplicates: true, scanMode: 2 }, (error, device) => {
      if (error) {
        // "cancelled" is expected when the duty cycle restarts the scan.
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
    });

    // Cycle the scan window every 4 seconds to clear native caches and avoid deny lists
    this.dutyCycleTimer = setTimeout(() => {
      if (this.scanning) this.runScanIteration();
    }, 4000);
  }

  stopScanning(): void {
    this.scanning = false;
    if (this.dutyCycleTimer) {
      clearTimeout(this.dutyCycleTimer);
      this.dutyCycleTimer = null;
    }
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    try {
      this.manager?.stopDeviceScan();
    } catch (e) {}
    console.log("[BeaconService] Scanner paused cleanly.");
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