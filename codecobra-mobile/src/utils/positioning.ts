import { UserPosition } from "../context/AppContext";
import { ParsedBeacon } from "../types/ble";
import { BEACON_LAYOUT } from "../types/positioning";

function estimateDistance(rssi: number, txPower: number): number {
    const N = 3.0;
    return Math.pow(10, (txPower - rssi) / (10 * N));
}

export function calculateWeightedPosition(scannedBeacons: ParsedBeacon[]): UserPosition | null {
    let totalWeight = 0;
    let weightedX = 0;
    let weightedY = 0;
    let activeBeaconsCount = 0;

    for (const beacon of scannedBeacons) {
        const layout = BEACON_LAYOUT[beacon.minor];
        if (!layout) continue;

        const distance = estimateDistance(beacon.rssi, beacon.txPower);

        // Prevent division by zero
        const safeDistance = Math.max(distance, 0.1);

        const weight = 1 / Math.pow(safeDistance, 2);

        weightedX += layout.x * weight;
        weightedY += layout.y * weight;
        totalWeight += weight;
        activeBeaconsCount++;
    }

    // Require two beacons minimal for a valid position estimate
    if (activeBeaconsCount < 2 || totalWeight === 0) {
        return null;
    }

    return {
        x: weightedX / totalWeight,
        y: weightedY / totalWeight
    };
}
