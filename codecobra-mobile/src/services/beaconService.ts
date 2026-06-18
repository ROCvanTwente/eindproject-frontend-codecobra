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
  private updateTimer: ReturnType<typeof setInterval> | null = null;

  // Match by MAC address suffix.
  // On Android, device.id is the MAC (e.g. "C3:00:00:6C:3A:B5").
  // We strip colons and check if it ends with our macSuffix.
  private matchBeacon(device: Device): BeaconConfig | null {
    const mac = (device.id || "").replace(/:/g, "").toUpperCase();

    for (const beacon of BEACONS) {
      if (mac.endsWith(beacon.macSuffix)) {
        if (!loggedIds.has(beacon.id)) {
          console.log(`[Beacon] ✓ Matched ${beacon.id} | MAC=${device.id} | RSSI=${device.rssi}`);
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

    console.log("[BeaconService] Starting BLE scan (matching on MAC suffix)...");
    this.scanning = true;
    this.smoother.clear();
    this.latestReadings.clear();
    loggedIds.clear();

    this.manager.startDeviceScan(null, { allowDuplicates: true }, (error, device) => {
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
    });

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
