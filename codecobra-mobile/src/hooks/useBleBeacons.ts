import { useEffect, useState } from "react";
import { BlePeripheral, ParsedBeacon } from "../types/ble";
import { NativeEventEmitter, NativeModules, PermissionsAndroid, Platform } from "react-native";
import BleManager, { BleScanMode } from "react-native-ble-manager";
import { parseIBeacon } from "../utils/IBeaconParser";

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

const TARGET_UUID = 'TODO:BC01_UUID'

export function useBleBeacons() {
    const [closestBeacon, setClosestBeacon] = useState<ParsedBeacon | null>(null);
    const [beaconsMap, setBeaconsMap] = useState<Map<string, ParsedBeacon>>(new Map());

    const requestPermissions = async (): Promise<boolean> => {
        if (Platform.OS === "android") {
            if (Platform.Version >= 31) {
                const scanGranted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
                const connectGranted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
                const locationGranted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
                return (
                    scanGranted === PermissionsAndroid.RESULTS.GRANTED &&
                    connectGranted === PermissionsAndroid.RESULTS.GRANTED &&
                    locationGranted === PermissionsAndroid.RESULTS.GRANTED
                );
            } else {
                const locationGranted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
                return locationGranted === PermissionsAndroid.RESULTS.GRANTED;
            }
        }
        return true;
    }

    useEffect(() => {
        const initBle = async () => {
            const hasPermission = await requestPermissions();
            if (!hasPermission) {
                console.warn("Bluetooth/Location permissions denied");
            }

            await BleManager.start({ showAlert: false });

            await BleManager.scan({
                allowDuplicates: true,
                scanMode: BleScanMode.LowLatency,
                seconds: 0
            });
        };

        initBle();

        const handleDiscoverPeripheral = (peripheral: BlePeripheral) => {
            const bytes = peripheral.advertising.manufacturerData?.bytes;
            if (!bytes) return;

            const parsed = parseIBeacon(bytes, peripheral.rssi, peripheral.id);

            if (parsed && parsed.uuid === TARGET_UUID) {
                setBeaconsMap((prevMap) => {
                    const newMap = new Map(prevMap);
                    newMap.set(parsed.id, parsed);

                    return newMap;
                });
            }
        }

        const discoverListener = bleManagerEmitter.addListener(
            'BleManagerDiscoverPeripheral',
            handleDiscoverPeripheral
        );

        return () => {
            discoverListener.remove();
            BleManager.stopScan().catch((err) => console.log('Stop scan error:', err));
        }
    }, []);

    return { closestBeacon, activeBeacons: Array.from(beaconsMap.values()) };
}
