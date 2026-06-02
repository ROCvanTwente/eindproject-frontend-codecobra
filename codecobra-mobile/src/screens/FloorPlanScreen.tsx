import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Ionicons from "@react-native-vector-icons/ionicons";
// Fixed Import Line:
import Svg, { Circle, Text as SvgText, Rect, Line, Image as SvgImage } from "react-native-svg";
import { RootStackParamList } from "../../App";
import { useAppContext } from "../context/AppContext";
import { Language } from "../types";
import FloorPlanImage from "../imports/PlattegrondGieterijBeganegrondV2.0.png";

const PRIMARY = "#E30613";
const SECONDARY = "#0066B3";
const { width: SCREEN_W } = Dimensions.get("window");
const MAP_W = SCREEN_W - 32;
const MAP_H = MAP_W * (704 / 1531);

// Original map coordinate space: 1531 × 704
const scaleX = (x: number) => (x / 1531) * MAP_W;
const scaleY = (y: number) => (y / 704) * MAP_H;

type Props = NativeStackScreenProps<RootStackParamList, "FloorPlan">;

export function FloorPlanScreen({ navigation, route }: Props) {
  const { stops } = useAppContext();
  const language: Language = route.params.language;

  const positionedStops = stops.filter((s) => s.mapX !== undefined && s.mapY !== undefined);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>
            {language === "nl" ? "Plattegrond" : "Floor plan"}
          </Text>
          <Text style={styles.headerSub}>De Gieterij</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* SVG map */}
        <View style={styles.mapContainer}>
          <Svg width={MAP_W} height={MAP_H}>
            {/* Background Map Image */}
            <SvgImage
              href={FloorPlanImage}
              width={MAP_W}
              height={MAP_H}
              preserveAspectRatio="xMidYMid slice"
            />

            {/* Connecting lines between ordered stops */}
            {positionedStops.map((stop, i) => {
              const next = positionedStops[i + 1];
              if (!next) return null;
              return (
                <Line
                  key={`line-${stop.id}`}
                  x1={scaleX(stop.positionX!)}
                  y1={scaleY(stop.positionY!)}
                  x2={scaleX(next.positionX!)}
                  y2={scaleY(next.positionY!)}
                  stroke={SECONDARY}
                  strokeWidth={2}
                  strokeDasharray="6,4"
                  opacity={0.5}
                />
              );
            })}

            {/* Stop markers */}
            {positionedStops.map((stop, i) => {
              const cx = scaleX(stop.positionX!);
              const cy = scaleY(stop.positionY!);
              const stopNumber = stops.findIndex((s) => s.id === stop.id) + 1;
              return (
                <React.Fragment key={stop.id}>
                  <Circle cx={cx} cy={cy} r={14} fill={PRIMARY} />
                  <SvgText
                    x={cx}
                    y={cy + 5}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={12}
                    fontWeight="bold"
                  >
                    {stopNumber}
                  </SvgText>
                </React.Fragment>
              );
            })}
          </Svg>
        </View>

        {positionedStops.length === 0 && (
          <View style={styles.emptyBox}>
            <Ionicons name="map-outline" size={48} color="#9ca3af" />
            <Text style={styles.emptyText}>
              {language === "nl"
                ? "Geen stops met kaartpositie beschikbaar."
                : "No stops with map positions available."}
            </Text>
          </View>
        )}

        {/* Legend */}
        <Text style={styles.legendTitle}>
          {language === "nl" ? "Stops op de kaart" : "Stops on the map"}
        </Text>
        {positionedStops.map((stop) => {
          const stopNumber = stops.findIndex((s) => s.id === stop.id) + 1;
          return (
            <TouchableOpacity
              key={stop.id}
              style={styles.legendItem}
              onPress={() => navigation.push("StopDetail", { stopId: stop.id, language })}
            >
              <View style={styles.legendBadge}>
                <Text style={styles.legendBadgeText}>{stopNumber}</Text>
              </View>
              <Text style={styles.legendLabel} numberOfLines={1}>
                {stop.title[language]}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={SECONDARY} />
            </TouchableOpacity>
          );
        })}
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
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  backBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 26, color: "#fff", fontWeight: "700" },
  headerSub: { fontSize: 15, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  content: { padding: 16, paddingBottom: 40 },
  mapContainer: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#d1d5db",
  },
  emptyBox: {
    alignItems: "center",
    padding: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: "#9ca3af",
    textAlign: "center",
  },
  legendTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 12,
  },
  legendBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  legendBadgeText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  legendLabel: { flex: 1, fontSize: 16, color: "#111" },
});