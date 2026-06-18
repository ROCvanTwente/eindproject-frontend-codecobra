// Beacon configuration for indoor positioning.
// Physical beacons: BC01 (all share the same name, Major 10001, Minor 19641).
// Uniquely identified by their MAC address suffix (last 3 bytes).
//
// 5 beacons cover 9 stops. Placement: stops 1, 3, 5, 7, 9.

export interface BeaconConfig {
  id: string;
  name: string;
  /** Last 3 bytes of the MAC address (uppercase, no separators). */
  macSuffix: string;
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

export const BEACONS: BeaconConfig[] = [
  {
    id: "beacon-1",
    name: "BC01",
    macSuffix: "6C3AB5",
    mapX: 0,
    mapY: 0,
    nodeId: "beacon_stop1",
    nearStopIds: [1, 2],
    txPower: -59,
  },
  {
    id: "beacon-2",
    name: "BC01",
    macSuffix: "6C3AB6",
    mapX: 0,
    mapY: 0,
    nodeId: "beacon_stop3",
    nearStopIds: [3, 4],
    txPower: -59,
  },
  {
    id: "beacon-3",
    name: "BC01",
    macSuffix: "6C3B27",
    mapX: 0,
    mapY: 0,
    nodeId: "beacon_stop5",
    nearStopIds: [5, 6],
    txPower: -59,
  },
  {
    id: "beacon-4",
    name: "BC01",
    macSuffix: "6C3B32",
    mapX: 0,
    mapY: 0,
    nodeId: "beacon_stop7",
    nearStopIds: [7, 8],
    txPower: -59,
  },
  {
    id: "beacon-5",
    name: "BC01",
    macSuffix: "6C3ADC",
    mapX: 0,
    mapY: 0,
    nodeId: "beacon_stop9",
    nearStopIds: [9],
    txPower: -59,
  },
];

export const PATH_LOSS_EXPONENT = 2.5;
export const RSSI_WINDOW_SIZE = 5;
export const BEACON_STALE_THRESHOLD_MS = 5000;

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
