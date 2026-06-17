// Beacon configuration for indoor positioning.
// Physical beacons: C300006 Beacon 1–5
// Identified by the last 3 bytes of their BLE service data.
//
// 5 beacons cover 9 stops. Beacons are placed at strategic positions so every
// stop is within range of at least 2 beacons for trilateration.
// Placement strategy: beacons at stops 1, 3, 5, 7, 9 — this means every stop
// is at most 1 stop away from a beacon, and adjacent beacons overlap in range.

export interface BeaconConfig {
  id: string;
  name: string;
  /** Last 3 bytes of the FDA5 service data (hex, uppercase). e.g. "6C3AB5" */
  serviceDataSuffix: string;
  /** Position on the 1531×704 map where this beacon is physically mounted. */
  mapX: number;
  mapY: number;
  /** Dijkstra node ID for pathfinding integration. */
  nodeId: string;
  /** Which stop(s) this beacon is placed at (by stop ID). */
  nearStopIds: number[];
  /** RSSI at 1 meter (calibrated per beacon; default -59 dBm). */
  txPower: number;
}

// The 16-bit service UUID the beacons advertise on.
export const BEACON_SERVICE_UUID = "FDA5";

// Map positions will be set to match the stop positions from the API.
// These defaults assume the beacons are placed at stops 1, 3, 5, 7, 9.
// Update mapX/mapY once the actual physical placement is confirmed.
export const BEACONS: BeaconConfig[] = [
  {
    id: "beacon-1",
    name: "C300006 Beacon 1",
    serviceDataSuffix: "6C3AB5",
    mapX: 0,
    mapY: 0,
    nodeId: "beacon_stop1",
    nearStopIds: [1, 2],
    txPower: -59,
  },
  {
    id: "beacon-2",
    name: "C300006 Beacon 2",
    serviceDataSuffix: "6C3AB6",
    mapX: 0,
    mapY: 0,
    nodeId: "beacon_stop3",
    nearStopIds: [3, 4],
    txPower: -59,
  },
  {
    id: "beacon-3",
    name: "C300006 Beacon 3",
    serviceDataSuffix: "6C3B27",
    mapX: 0,
    mapY: 0,
    nodeId: "beacon_stop5",
    nearStopIds: [5, 6],
    txPower: -59,
  },
  {
    id: "beacon-4",
    name: "C300006 Beacon 4",
    serviceDataSuffix: "6C3B32",
    mapX: 0,
    mapY: 0,
    nodeId: "beacon_stop7",
    nearStopIds: [7, 8],
    txPower: -59,
  },
  {
    id: "beacon-5",
    name: "C300006 Beacon 5",
    serviceDataSuffix: "6C3ADC",
    mapX: 0,
    mapY: 0,
    nodeId: "beacon_stop9",
    nearStopIds: [9],
    txPower: -59,
  },
];

// Path-loss exponent for RSSI→distance conversion.
// Typical indoor value: 2.0 (open space) to 3.5 (cluttered/walls).
// Tune based on the Gieterij environment.
export const PATH_LOSS_EXPONENT = 2.5;

// Scanning interval in milliseconds. Lower = more responsive but more battery.
export const SCAN_INTERVAL_MS = 1000;

// Number of RSSI readings to average for smoothing (sliding window).
export const RSSI_WINDOW_SIZE = 5;

// Maximum age of a beacon reading (ms) before it's considered stale.
export const BEACON_STALE_THRESHOLD_MS = 5000;

// Minimum number of beacons required for position estimation.
// 1 = nearest beacon (snap to beacon position)
// 2 = linear interpolation between 2 beacons
// 3 = full trilateration
export const MIN_BEACONS_FOR_POSITION = 1;

/** Assigns beacon map positions based on loaded stop data. */
export function calibrateBeaconPositions(
  stops: { id: number; positionX?: number; positionY?: number }[],
) {
  const stopMap = new Map(stops.map((s) => [s.id, s]));

  for (const beacon of BEACONS) {
    const primaryStopId = beacon.nearStopIds[0];
    const stop = stopMap.get(primaryStopId);
    if (stop?.positionX != null && stop?.positionY != null) {
      beacon.mapX = stop.positionX;
      beacon.mapY = stop.positionY;
    }
  }
}
