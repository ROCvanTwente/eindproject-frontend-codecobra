import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  useWindowDimensions,
  Animated,
  Easing,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Ionicons from "@react-native-vector-icons/ionicons";
import Svg, {
  Circle,
  Text as SvgText,
  Image as SvgImage,
  Polyline,
} from "react-native-svg";

import { RootStackParamList } from "../../App";
import { useAppContext, RECEPTION_POSITION } from "../context/AppContext";
import { Language, Stop } from "../types";
import FloorPlanImage from "../imports/PlattegrondGieterijBeganegrondV2.0.png";
import { getAllStops } from "../data/api";
import { findPathOnMap } from "../services/pathfinding";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const PRIMARY = "#E30613";
const SECONDARY = "#0066B3";
const USER_BLUE = "#2563eb";
const RECEPTION_GREEN = "#22c55e";

type Props = NativeStackScreenProps<RootStackParamList, "FloorPlan">;

export function FloorPlanScreen({ navigation, route }: Props) {
  // userPosition is shared app state so a QR scan on the Scanner screen can
  // move the "you are here" dot (requirement #3). It defaults to reception.
  const { stops: contextStops, userPosition, beaconTracking } = useAppContext();

  // Pulse animation for the "you are here" beacon dot.
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.8, duration: 1200, easing: Easing.out(Easing.ease), useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, easing: Easing.in(Easing.ease), useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);
  const language: Language = route.params.language;

  // 1. In portrait, width is the short side, height is the long side
  const { width, height } = useWindowDimensions();

  const [stopsData, setStopsData] = useState(contextStops ?? []);
  const [loading, setLoading] = useState<boolean>(false);

  // Selected destination + computed route (both in original 1531x704 coords).
  // The destination is either a stop or the reception point, so it is stored
  // as coordinates with an id used for highlighting the selected marker.
  type Destination = { x: number; y: number; id: number | "reception" };
  const [destination, setDestination] = useState<Destination | null>(null);
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [calculating, setCalculating] = useState(false);

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
    return () => { mounted = false; };
  }, []);

  // Recalculates the route whenever the destination or the start point (e.g.
  // after a QR scan) changes. findPathOnMap is synchronous and blocks the JS
  // thread for a few hundred ms, so defer it one tick: that lets React paint
  // the loading indicator first (ActivityIndicator animates on the native
  // thread, so it keeps spinning during the calculation).
  useEffect(() => {
    if (!destination) return;
    // Arrived (e.g. scanned the destination's QR code): clear the route.
    if (destination.x === userPosition.x && destination.y === userPosition.y) {
      setDestination(null);
      setRoutePoints([]);
      return;
    }
    setCalculating(true);
    const timer = setTimeout(() => {
      // Like the Pathfinding web prototype, search the unpadded grid: padding
      // can swallow narrow corridors and the reception start point.
      const path = findPathOnMap(
        [userPosition.x, userPosition.y],
        [destination.x, destination.y],
      );
      setRoutePoints(path);
      setCalculating(false);
    }, 50);
    return () => clearTimeout(timer);
  }, [userPosition, destination]);

  // 2. Dynamic Map Scaling (Using screen height to dictate the landscape map width)
  // Since the map is rotated 90 deg, its visual width will be limited by the screen's available height
  const AVAILABLE_HEIGHT = height - 120; // rough estimate leaving space for header
  const MAP_W = AVAILABLE_HEIGHT;
  const MAP_H = MAP_W * (704 / 1531);

  const scaleX = (x: number) => (x / 1531) * MAP_W;
  const scaleY = (y: number) => (y / 704) * MAP_H;

  const positionedStops = stopsData.filter((s) => s.positionX != null && s.positionY != null);

  // Click handler bound to an individual point. Because it lives on the
  // <Circle> element itself, only the predefined nodes are tappable — taps on
  // empty map area hit nothing and are ignored. The route calculation itself
  // is triggered by the effect above when `destination` changes.
  const handleStopPress = (stop: Stop) => {
    setDestination({ x: stop.positionX!, y: stop.positionY!, id: stop.id });
  };

  const handleReceptionPress = () => {
    setDestination({ ...RECEPTION_POSITION, id: "reception" });
  };

  const clearRoute = () => {
    setDestination(null);
    setRoutePoints([]);
    setCalculating(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header stays locked in normal portrait positioning */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === "nl" ? "Plattegrond De Gieterij" : "Floor plan De Gieterij"}
        </Text>
        {destination && (
          <TouchableOpacity style={styles.clearBtn} onPress={clearRoute}>
            <Text style={styles.clearBtnText}>
              {language === "nl" ? "Wissen" : "Clear"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.statusText}>
          {calculating
            ? language === "nl"
              ? "Route berekenen..."
              : "Calculating route..."
            : destination
              ? language === "nl"
                ? "Route weergegeven. Tik op een ander punt om opnieuw te plannen."
                : "Route shown. Tap another point to re-route."
              : language === "nl"
                ? "Tik op een punt om een route te plannen."
                : "Tap a point to plan a route."}
        </Text>

        {/* Beacon tracking status */}
        <View style={styles.beaconStatus}>
          <View style={[
            styles.beaconDot,
            { backgroundColor: beaconTracking.isTracking && beaconTracking.beaconsInRange > 0 ? "#22c55e" : "#9ca3af" },
          ]} />
          <Text style={styles.beaconStatusText}>
            {beaconTracking.isTracking
              ? beaconTracking.beaconsInRange > 0
                ? language === "nl"
                  ? `${beaconTracking.beaconsInRange} beacon${beaconTracking.beaconsInRange > 1 ? "s" : ""} in bereik`
                  : `${beaconTracking.beaconsInRange} beacon${beaconTracking.beaconsInRange > 1 ? "s" : ""} in range`
                : language === "nl"
                  ? "Beacons zoeken..."
                  : "Searching beacons..."
              : language === "nl"
                ? "Beacon tracking uit"
                : "Beacon tracking off"}
          </Text>
        </View>

        {/* Container handles centering the rotated element */}
        <View style={[styles.mapContainer, { width: MAP_H, height: MAP_W }]}>
          {loading ? (
            <ActivityIndicator size="large" color={PRIMARY} />
          ) : (
            // The actual map is styled with a 90-degree transformation
            <View style={[styles.rotatedWrapper, { width: MAP_W, height: MAP_H }]}>
              <Svg width={MAP_W} height={MAP_H}>
                <SvgImage
                  href={FloorPlanImage}
                  width={MAP_W}
                  height={MAP_H}
                  preserveAspectRatio="xMidYMid slice"
                />

                {/* Calculated route, drawn beneath the points/markers */}
                {routePoints.length > 0 && (
                  <Polyline
                    points={routePoints
                      .map(([x, y]) => `${scaleX(x)},${scaleY(y)}`)
                      .join(" ")}
                    stroke={USER_BLUE}
                    strokeWidth={4}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {positionedStops.map((stop) => {
                  const cx = scaleX(stop.positionX!);
                  const cy = scaleY(stop.positionY!);
                  const stopNumber = stopsData.findIndex((s) => s.id === stop.id) + 1;
                  const isDestination = destination?.id === stop.id;
                  // The stop the user is standing at (the blue dot) is not a
                  // valid destination, so it is not tappable.
                  const isCurrent =
                    stop.positionX === userPosition.x && stop.positionY === userPosition.y;
                  return (
                    <React.Fragment key={stop.id}>
                      {/* Larger transparent hit area for comfortable tapping */}
                      {!isCurrent && (
                        <Circle
                          cx={cx}
                          cy={cy}
                          r={20}
                          fill="transparent"
                          onPress={() => handleStopPress(stop)}
                        />
                      )}
                      <Circle
                        cx={cx}
                        cy={cy}
                        r={12}
                        fill={isDestination ? SECONDARY : PRIMARY}
                        onPress={isCurrent ? undefined : () => handleStopPress(stop)}
                      />
                      <SvgText
                        x={cx}
                        y={cy + 4}
                        textAnchor="middle"
                        fill="#fff"
                        fontSize={10}
                        fontWeight="bold"
                        // Counter the 270deg wrapper rotation so the number
                        // reads upright on screen
                        transform={`rotate(90, ${cx}, ${cy})`}
                      >
                        {stopNumber}
                      </SvgText>
                    </React.Fragment>
                  );
                })}

                {/* Once the user has moved away from reception (via a QR
                    scan), keep a green "R" marker at the reception spot */}
                {(userPosition.x !== RECEPTION_POSITION.x ||
                  userPosition.y !== RECEPTION_POSITION.y) && (
                  <>
                    {/* Reception is tappable like any stop: route back to it */}
                    <Circle
                      cx={scaleX(RECEPTION_POSITION.x)}
                      cy={scaleY(RECEPTION_POSITION.y)}
                      r={20}
                      fill="transparent"
                      onPress={handleReceptionPress}
                    />
                    <Circle
                      cx={scaleX(RECEPTION_POSITION.x)}
                      cy={scaleY(RECEPTION_POSITION.y)}
                      r={12}
                      fill={destination?.id === "reception" ? SECONDARY : RECEPTION_GREEN}
                      stroke="#fff"
                      strokeWidth={2}
                      onPress={handleReceptionPress}
                    />
                    <SvgText
                      x={scaleX(RECEPTION_POSITION.x)}
                      y={scaleY(RECEPTION_POSITION.y) + 4}
                      textAnchor="middle"
                      fill="#fff"
                      fontSize={11}
                      fontWeight="bold"
                      transform={`rotate(90, ${scaleX(RECEPTION_POSITION.x)}, ${scaleY(RECEPTION_POSITION.y)})`}
                    >
                      R
                    </SvgText>
                  </>
                )}

                {/* Pulsing accuracy ring around user position */}
                <AnimatedCircle
                  cx={scaleX(userPosition.x)}
                  cy={scaleY(userPosition.y)}
                  r={pulseAnim.interpolate({
                    inputRange: [1, 1.8],
                    outputRange: [12, 24],
                  })}
                  fill="rgba(37,99,235,0.15)"
                  stroke="rgba(37,99,235,0.3)"
                  strokeWidth={1}
                />
                {/* "You are here" — solid blue dot */}
                <Circle
                  cx={scaleX(userPosition.x)}
                  cy={scaleY(userPosition.y)}
                  r={10}
                  fill={USER_BLUE}
                  stroke="#fff"
                  strokeWidth={3}
                />
              </Svg>
            </View>
          )}

          {/* Route calculation overlay */}
          {calculating && (
            <View style={styles.calcOverlay}>
              <ActivityIndicator size="large" color={USER_BLUE} />
            </View>
          )}
        </View>

        {!loading && positionedStops.length === 0 && (
          <Text style={{ textAlign: "center", color: "#6b7280", marginTop: 12 }}>
            {language === "nl" ? "Geen stops met kaartpositie beschikbaar." : "No stops with map positions available."}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f9fafb" },
  header: {
    backgroundColor: PRIMARY,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12, // slightly increased for standard portrait header look
    paddingHorizontal: 16,
    gap: 12,
  },
  backBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
    padding: 6,
  },
  headerTitle: { fontSize: 18, color: "#fff", fontWeight: "700", flex: 1 },
  clearBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearBtnText: { color: "#fff", fontWeight: "600" },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10
  },
  statusText: {
    textAlign: "center",
    color: "#374151",
    fontSize: 14,
    marginBottom: 4,
  },
  beaconStatus: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    gap: 6,
  },
  beaconDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  beaconStatusText: {
    fontSize: 12,
    color: "#6b7280",
  },
  mapContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: "hidden",
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  rotatedWrapper: {
    // This flips the map layout on its side inside the wrapper box
    transform: [{ rotate: '270deg' }],
  },
  calcOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
});
