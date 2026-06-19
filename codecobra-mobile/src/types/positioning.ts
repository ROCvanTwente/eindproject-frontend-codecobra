export interface BeaconCoordinate {
    minor: number;
    x: number;
    y: number;
}

export interface UserPosition {
    x: number;
    y: number;
}

export const BEACON_LAYOUT: Record<number, BeaconCoordinate> = {
    1: { minor: 1, x: 0, y: 0 }, // Bottom-Left
    2: { minor: 2, x: 10, y: 0 }, // Bottom-Right
    3: { minor: 3, x: 0, y: 15 }, // Top-Left
    4: { minor: 4, x: 10, y: 15 }, // Top-Right
}
