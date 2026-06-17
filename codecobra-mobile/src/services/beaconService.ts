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
  accuracy: number; // metres — lower is better
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

  // Sort by distance (closest first).
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

  // Weighted centroid: weight = 1/distance² (inverse-square).
  let totalWeight = 0;
  let wx = 0;
  let wy = 0;

  // Use the 3 closest beacons at most.
  const used = sorted.slice(0, 3);

  for (const r of used) {
    const d = Math.max(r.distance, 0.1);
    const w = 1 / (d * d);
    wx += r.beacon.mapX * w;
    wy += r.beacon.mapY * w;
    totalWeight += w;
  }

  const x = wx / totalWeight;
  const y = wy / totalWeight;

  return {
    x,
    y,
    accuracy: sorted[0].distance,
    beaconsUsed: used.length,
    nearestBeaconId: sorted[0].beacon.id,
  };
}

// ── Beacon service singleton ──────────────────────────────────────────

class BeaconService {
  private manager: BleManager | null = null;
  private scanning = false;
  private smoother = new RssiSmoother();
  private latestReadings = new Map<string, BeaconReading>();
  private listeners: PositionCallback[] = [];
  private updateTimer: ReturnType<typeof setInterval> | null = null;

  // Match a scanned device to one of our beacons by checking if the
  // advertisement's service data ends with the beacon's hex suffix.
  private matchBeacon(device: Device): BeaconConfig | null {
    const serviceData = device.serviceData;
    if (serviceData) {
      for (const key of Object.keys(serviceData)) {
        const dataHex = serviceData[key];
        if (!dataHex) continue;
        // Service data is base64 encoded by react-native-ble-plx; decode to hex.
        const hex = base64ToHex(dataHex);
        for (const beacon of BEACONS) {
          if (hex.toUpperCase().endsWith(beacon.serviceDataSuffix.toUpperCase())) {
            return beacon;
          }
        }
      }
    }

    // Fallback: match on device name.
    const name = device.name || device.localName || "";
    for (const beacon of BEACONS) {
      if (name.includes(beacon.name)) return beacon;
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
    // iOS permissions are handled via Info.plist.
    return true;
  }

  async startScanning(): Promise<void> {
    if (this.scanning) return;

    if (!this.manager) {
      this.manager = new BleManager();
    }

    const state = await this.manager.state();
    if (state !== State.PoweredOn) {
      console.warn("[BeaconService] Bluetooth is not powered on:", state);
      return;
    }

    this.scanning = true;
    this.smoother.clear();
    this.latestReadings.clear();

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

    // Compute position at a regular interval instead of on every BLE callback.
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

    // Discard stale readings.
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

    // Only emit positions where the beacon has a valid map position.
    if (pos.x === 0 && pos.y === 0) return;

    for (const cb of this.listeners) {
      cb(pos);
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────

function base64ToHex(b64: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let bits = "";
  for (const c of b64) {
    if (c === "=") break;
    const idx = chars.indexOf(c);
    if (idx < 0) continue;
    bits += idx.toString(2).padStart(6, "0");
  }
  let hex = "";
  for (let i = 0; i + 4 <= bits.length; i += 4) {
    hex += parseInt(bits.substring(i, i + 4), 2).toString(16).toUpperCase();
  }
  return hex;
}

// Export a singleton.
export const beaconService = new BeaconService();
