import { useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import {
  beaconService,
  EstimatedPosition,
} from "../services/beaconService";
import { calibrateBeaconPositions } from "../config/beacons";
import { Stop } from "../types";

export interface BeaconTrackingState {
  position: { x: number; y: number } | null;
  accuracy: number;
  beaconsInRange: number;
  nearestBeaconId: string | null;
  isTracking: boolean;
  error: string | null;
}

export function useBeaconTracking(
  stops: Stop[],
  enabled: boolean = true,
): BeaconTrackingState {
  const [state, setState] = useState<BeaconTrackingState>({\n    position: null,
    accuracy: Infinity,
    beaconsInRange: 0,
    nearestBeaconId: null,
    isTracking: false,
    error: null,
  });

  const calibrated = useRef(false);

  // Calibrate beacon map positions whenever stops change.
  useEffect(() => {
    if (stops.length > 0 && !calibrated.current) {
      calibrateBeaconPositions(stops);
      calibrated.current = true;
    }
  }, [stops]);

  useEffect(() => {
    if (!enabled) {
      beaconService.stopScanning();
      setState((s) => ({ ...s, isTracking: false }));
      return;
    }

    let unsubPosition: (() => void) | null = null;

    const start = async () => {
      const granted = await beaconService.requestPermissions();
      if (!granted) {
        setState((s) => ({
          ...s,
          error: "Bluetooth-permissies zijn niet verleend.",
          isTracking: false,
        }));
        return;
      }

      unsubPosition = beaconService.onPosition((pos: EstimatedPosition) => {
        setState({
          position: { x: pos.x, y: pos.y },
          accuracy: pos.accuracy,
          beaconsInRange: pos.beaconsUsed,
          nearestBeaconId: pos.nearestBeaconId,
          isTracking: true,
          error: null,
        });
      });

      await beaconService.startScanning();
      setState((s) => ({ ...s, isTracking: true }));
    };

    start();

    // Pause scanning when the app goes to background.
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === "active" && enabled) {
        beaconService.startScanning();
      } else if (nextState !== "active") {
        beaconService.stopScanning();
      }
    };

    const appStateSub = AppState.addEventListener("change", handleAppState);

    return () => {
      if (unsubPosition) unsubPosition();
      beaconService.stopScanning();
      appStateSub.remove();
    };
  }, [enabled, stops]);

  return state;
}
