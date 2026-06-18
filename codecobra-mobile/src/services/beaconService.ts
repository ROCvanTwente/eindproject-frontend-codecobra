import BleManager from "react-native-ble-manager";
import { Platform, PermissionsAndroid, NativeEventEmitter, NativeModules } from "react-native";
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

// ── Raw Byte Array → HEX Helper ───────────────────────────────────────

/**
 * Zet de rauwe byte array uit BleManager advertising data direct om naar een HEX string.
 * Veilig en snel zonder externe dependencies.
 */
function bytesToHex(bytes: number[]): string {
  if (!bytes) return "";
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    let b = bytes[i] & 0xff;
    let h = b.toString(16);
    if (h.length === 1) hex += "0";
    hex += h;
  }
  return hex.toUpperCase();
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

const loggedIds = new Set<string>();
const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

class BeaconService {
  private scanning = false;
  private smoother = new RssiSmoother();
  private latestReadings = new Map<string, BeaconReading>();
  private listeners: PositionCallback[] = [];
  private updateTimer = null as ReturnType<typeof setInterval> | null;
  private discoverListener: any = null;

  constructor() {
    // Start de native Bluetooth manager bij het initialiseren
    BleManager.start({ showAlert: true })
      .then(() => console.log("[BeaconService] Native BleManager succesvol gestart."))
      .catch((err) => console.error("[BeaconService] Fout bij starten BleManager:", err));
  }

  /**
   * Ontleedt het binnenkomende apparaat. Haalt de service data op en matcht met BEACONS config.
   */
  private handleDiscoveredDevice(device: any) {
    if (!device || device.rssi == null) return;

    // Haal de advertising data op. Verschilt per platform in deze library.
    const advertising = device.advertising;
    if (!advertising || !advertising.serviceData) return;

    // Zoek naar service data gekoppeld aan FDA5
    // In react-native-ble-manager zit dit vaak in een map onder de key "fda5" of "0000fda5..."
    const fda5Key = Object.keys(advertising.serviceData).find((key) =>
      key.toUpperCase().includes("FDA5")
    );

    if (!fda5Key) return;

    const rawData = advertising.serviceData[fda5Key];
    if (!rawData || !rawData.bytes) return;

    // Zet de bytes om naar de bekende Hex string (bijv: "6427114CB9C300006C3B27")
    const hexData = bytesToHex(rawData.bytes);

    // Zoek naar match in onze configuratie
    for (const beacon of BEACONS) {
      const targetSuffix = beacon.macSuffix.toUpperCase();
      if (hexData.endsWith(targetSuffix)) {
        if (!loggedIds.has(beacon.id)) {
          console.log(`[Beacon] ✓ BEACON MATCH! ${beacon.id} | RSSI=${device.rssi} | Hex=${hexData}`);
          loggedIds.add(beacon.id);
        }

        const smoothedRssi = this.smoother.push(beacon.id, device.rssi);
        const distance = rssiToDistance(smoothedRssi, beacon.txPower);

        this.latestReadings.set(beacon.id, {
          beacon,
          rssi: smoothedRssi,
          distance,
          timestamp: Date.now(),
        });
        break;
      }
    }
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
        return Object.values(results).every((v) => v === PermissionsAndroid.RESULTS.GRANTED);
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

    // Forceer Android om Bluetooth fysiek in te schakelen (voorkomt radiostilte!)
    if (Platform.OS === "android") {
      try {
        await BleManager.enableBluetooth();
      } catch (e) {
        console.warn("[BeaconService] Gebruiker weigerde Bluetooth aan te zetten via pop-up.");
        return;
      }
    }

    console.log("[BeaconService] Scannen via Native Events gestart...");
    this.scanning = true;
    this.smoother.clear();
    this.latestReadings.clear();
    loggedIds.clear();

    // Registreer de native event listener. Dit vangt ELK bluetooth-pakket direct op
    this.discoverListener = bleManagerEmitter.addListener(
      "BleManagerDiscoverPeripheral",
      (device) => this.handleDiscoveredDevice(device)
    );

    // Start de hardware scan. 0 = oneindig scannen, true = sta duplicaten toe (essentieel voor live RSSI updates!)
    // We scannen op de service UUID fda5 om batterij te besparen en ruis uit te sluiten
    BleManager.scan(["0000fda5-0000-1000-8000-00805f9b34fb", "fda5"], 0, true)
      .then(() => console.log("[BeaconService] Hardware scan-opdracht succesvol verstuurd."))
      .catch((err) => console.error("[BeaconService] Hardware scan mislukt:", err));

    this.updateTimer = setInterval(() => this.computePosition(), 500);
  }

  stopScanning(): void {
    this.scanning = false;
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    if (this.discoverListener) {
      this.discoverListener.remove();
      this.discoverListener = null;
    }
    BleManager.stopScan()
      .then(() => console.log("[BeaconService] Hardware scan gestopt."))
      .catch((_e) => {});
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
