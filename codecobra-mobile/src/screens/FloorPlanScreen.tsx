import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Ionicons from "@react-native-vector-icons/ionicons";
import Svg, {
  Circle,
  Text as SvgText,
  Image as SvgImage,
  G,
  Polyline,
} from "react-native-svg";
import { RootStackParamList } from "../../App";
import { useAppContext } from "../context/AppContext";
import { Language, Stop } from "../types";
import FloorPlanImage from "../imports/PlattegrondGieterijBeganegrondV2.0.png";
import { getAllStops } from "../data/api";
import { findPathOnMap } from "../services/pathfinding";

const PRIMARY = "#E30613";
const SECONDARY = "#0066B3";
const ROUTE_COLOR = "#3b82f6";

type Props = NativeStackScreenProps<RootStackParamList, "FloorPlan">;

export function FloorPlanScreen({ navigation, route }: Props) {
  const { stops: contextStops, currentStartStopId, receptionCoordinates } =
    useAppContext();
  const language: Language = route.params.language;
  const { height } = useWindowDimensions();

  const [stopsData, setStopsData] = useState(contextStops ?? []);
  const [loading, setLoading] = useState<boolean>(false);
  const [routePath, setRoutePath] = useState<[number, number][]>([]);
  const [destinationStopId, setDestinationStopId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getAllStops();
        if (mounted && Array.isArray(data)) setStopsData(data);
      } catch (error) {
        console.error("Error fetching stops:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
  }, [contextStops]);

  // Clear route when start position changes after a QR scan
  useEffect(() => {
    setRoutePath([]);
    setDestinationStopId(null);
  }, [currentStartStopId]);

  const AVAILABLE_HEIGHT = height - 160;
  const MAP_W = AVAILABLE_HEIGHT;
  const MAP_H = MAP_W * (704 / 1531);

  const scaleX = (x: number) => (x / 1531) * MAP_W;
  const scaleY = (y: number) => (y / 704) * MAP_H;

  // Resolve current start coordinates from context state
  const currentStartCoords = useMemo(() => {
    if (!currentStartStopId || currentStartStopId === "reception_fixed") {
      return receptionCoordinates;
    }
    const stop = stopsData.find(
      (s) => String(s.id) === String(currentStartStopId),
    );
    if (stop?.positionX != null && stop?.positionY != null) {
      return { x: stop.positionX, y: stop.positionY };
    }
    return receptionCoordinates;
  }, [currentStartStopId, stopsData, receptionCoordinates]);

  const positionedStops = stopsData.filter(
    (s) => s.positionX != null && s.positionY != null,
  );

  const handleStopPress = (stop: Stop) => {
    if (stop.positionX == null || stop.positionY == null) return;
    // Tapping the current start does nothing
    if (String(stop.id) === String(currentStartStopId)) return;

    const newDestId = String(stop.id);
    setDestinationStopId(newDestId);

    const start: [number, number] = [currentStartCoords.x, currentStartCoords.y];
    const end: [number, number] = [stop.positionX, stop.positionY];
    const path = findPathOnMap(start, end, { padding: 12 });
    setRoutePath(path);
  };

  const isAtReception =
    !currentStartStopId || currentStartStopId === "reception_fixed";

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === "nl"
            ? "Plattegrond De Gieterij"
            : "Floor plan De Gieterij"}
        </Text>
        {routePath.length > 0 && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => {
              setRoutePath([]);
              setDestinationStopId(null);
            }}
          >
            <Ionicons name="close-circle" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        <View style={[styles.mapContainer, { width: MAP_H, height: MAP_W }]}>
          {loading ? (
            <ActivityIndicator size="large" color={PRIMARY} />
          ) : (
            <View
              style={[styles.rotatedWrapper, { width: MAP_W, height: MAP_H }]}
            >
              <Svg width={MAP_W} height={MAP_H}>
                <SvgImage
                  href={FloorPlanImage}
                  width={MAP_W}
                  height={MAP_H}
                  preserveAspectRatio="xMidYMid slice"
                />

                {/* Route polyline */}
                {routePath.length > 0 && (
                  <Polyline
                    points={routePath
                      .map(([x, y]) => `${scaleX(x)},${scaleY(y)}`)
                      .join(" ")}
                    stroke={ROUTE_COLOR}
                    strokeWidth={4}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Stop markers */}
                {positionedStops.map((stop) => {
                  const cx = scaleX(stop.positionX!);
                  const cy = scaleY(stop.positionY!);
                  const stopNumber =
                    stopsData.findIndex((s) => s.id === stop.id) + 1;
                  const isDest = String(stop.id) === destinationStopId;
                  const isStart =
                    String(stop.id) === String(currentStartStopId);

                  return (
                    <G key={stop.id} onPress={() => handleStopPress(stop)}>
                      {/* Highlight ring for current start position */}
                      {isStart && (
                        <Circle
                          cx={cx}
                          cy={cy}
                          r={20}
                          fill="rgba(34,197,94,0.25)"
                        />
                      )}
                      <Circle
                        cx={cx}
                        cy={cy}
                        r={isDest ? 14 : 12}
                        fill={isDest ? PRIMARY : SECONDARY}
                      />
                      <SvgText
                        x={cx}
                        y={cy + 4}
                        textAnchor="middle"
                        fill="#fff"
                        fontSize={10}
                        fontWeight="bold"
                      >
                        {stopNumber}
                      </SvgText>
                    </G>
                  );
                })}

                {/* Reception dot — always blue, represents initial start point */}
                <Circle
                  cx={scaleX(receptionCoordinates.x)}
                  cy={scaleY(receptionCoordinates.y)}
                  r={isAtReception ? 16 : 12}
                  fill={SECONDARY}
                  opacity={isAtReception ? 1 : 0.7}
                />
                {isAtReception && (
                  <Circle
                    cx={scaleX(receptionCoordinates.x)}
                    cy={scaleY(receptionCoordinates.y)}
                    r={24}
                    fill="rgba(0,102,179,0.2)"
                  />
                )}
                <SvgText
                  x={scaleX(receptionCoordinates.x)}
                  y={scaleY(receptionCoordinates.y) + 4}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize={10}
                  fontWeight="bold"
                >
                  R
                </SvgText>
                <SvgText
                  x={scaleX(receptionCoordinates.x)}
                  y={scaleY(receptionCoordinates.y) - 20}
                  textAnchor="middle"
                  fill={SECONDARY}
                  fontSize={12}
                  fontWeight="bold"
                >
                  Receptie
                </SvgText>
              </Svg>
            </View>
          )}
        </View>

        {!loading && (
          <Text style={styles.hint}>
            {routePath.length > 0
              ? language === "nl"
                ? "Scan de QR-code bij de bestemming om de route te vernieuwen"
                : "Scan the QR code at the destination to update your position"
              : language === "nl"
                ? "Tik op een stop om de route te tonen"
                : "Tap a stop to show the route"}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f9fafb" },
  header: {
    backgroundColor: PRIMARY,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  backBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
    padding: 6,
  },
  clearBtn: {
    marginLeft: "auto",
  },
  headerTitle: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "700",
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
  },
  mapContainer: {
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: "#fff",
    borderRadius: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  rotatedWrapper: {
    transform: [{ rotate: "270deg" }],
  },
  hint: {
    marginTop: 12,
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    paddingHorizontal: 20,
  },
});
