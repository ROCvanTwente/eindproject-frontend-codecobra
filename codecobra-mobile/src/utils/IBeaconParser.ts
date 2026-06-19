import { ParsedBeacon } from "../types/ble";

export function parseIBeacon(bytes: number[], rssi: number, id: string): ParsedBeacon | null {
    if (!bytes || bytes.length < 25)
        return null;

    const isApple = bytes[0] === 0x4C && bytes[1] === 0x00;
    const isIBeacon = bytes[2] === 0x02 && bytes[3] === 0x15;

    if (!isApple || !isIBeacon)
        return null;

    const uuidBytes = bytes.slice(4, 20);
    const uuid = uuidBytes.map((byte) => byte
        .toString(16)
        .padStart(2, "0"))
        .join('')
        .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5')
        .toUpperCase();

    const major = (bytes[20] << 8) + bytes[21];
    const minor = (bytes[22] << 8) + bytes[23];

    let txPower = bytes[24];
    if (txPower > 127)
        txPower -= 256;

    return {
        uuid,
        major,
        minor,
        txPower,
        rssi,
        id,
    }
}
