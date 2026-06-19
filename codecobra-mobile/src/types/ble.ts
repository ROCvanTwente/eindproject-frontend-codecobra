export interface ParsedBeacon {
    uuid: string;
    major: number;
    minor: number;
    txPower: number;
    rssi: number;
    id: string;
}

export interface BlePeripheral {
    id: string;
    name?: string;
    rssi: number;
    advertising: {
        manufacturerData?: {
            bytes: number[];
            data: string;
        },
        serviceUUIDs?: string[];
        txPowerLevel?: number;
    }
}
