import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Ionicons from "@react-native-vector-icons/ionicons";
import Svg, { Circle, Text as SvgText, Image as SvgImage } from "react-native-svg";
import Orientation from 'react-native-orientation-locker';

import { RootStackParamList } from "../../App";
import { useAppContext } from "../context/AppContext";
import { Language } from "../types";
import FloorPlanImage from "../imports/PlattegrondGieterijBeganegrondV2.0.png";
import { getAllStops } from "../data/api";

const PRIMARY = "#E30613";
const SECONDARY = "#0066B3";

type Props = NativeStackScreenProps<RootStackParamList, "FloorPlan">;

export function FloorPlanScreen({ navigation, route }: Props) {
  const { stops: contextStops } = useAppContext();
  const language: Language = route.params.language;

  // useWindowDimensions automatically updates when the phone rotates
  const { width } = useWindowDimensions();

  const [stopsData, setStopsData] = useState(contextStops ?? []);
  const [loading, setLoading] = useState<boolean>(false);

  // 1. Handle Orientation Locking
  useEffect(() => {
    Orientation.lockToLandscape(); // Force horizontal

    return () => {
      Orientation.lockToPortrait(); // Back to vertical when leaving
    };
  }, []);

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

  // 2. Dynamic Map Scaling
  // In landscape, 'width' is the long side.
  const MAP_W = width - 40;
  const MAP_H = MAP_W * (704 / 1531);

  const scaleX = (x: number) => (x / 1531) * MAP_W;
  const scaleY = (y: number) => (y / 704) * MAP_H;

  const positionedStops = stopsData.filter((s) => s.positionX != null && s.positionY != null);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Reduced header height for landscape */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === "nl" ? "Plattegrond De Gieterij" : "Floor plan De Gieterij"}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.mapContainer}>
          {loading ? (
            <View style={{ width: MAP_W, height: MAP_H, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator size="large" color={PRIMARY} />
            </View>
          ) : (
            <Svg width={MAP_W} height={MAP_H}>
              <SvgImage
                href={FloorPlanImage}
                width={MAP_W}
                height={MAP_H}
                preserveAspectRatio="xMidYMid slice"
              />

              {/* BLUE DOTTED LINE SECTION REMOVED */}

              {positionedStops.map((stop) => {
                const cx = scaleX(stop.positionX!);
                const cy = scaleY(stop.positionY!);
                const stopNumber = stopsData.findIndex((s) => s.id === stop.id) + 1;
                return (
                  <React.Fragment key={stop.id}>
                    <Circle cx={cx} cy={cy} r={12} fill={PRIMARY} />
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
                  </React.Fragment>
                );
              })}
            </Svg>
          )}
        </View>

        {!loading && positionedStops.length === 0 && (
          <Text style={{ textAlign: "center", color: "#6b7280", marginTop: 12 }}>
            {language === "nl" ? "Geen stops met kaartpositie beschikbaar." : "No stops with map positions available."}
          </Text>
        )}

        {/* Legend */}
        <View style={styles.legendGrid}>
          {positionedStops.map((stop) => {
            const stopNumber = stopsData.findIndex((s) => s.id === stop.id) + 1;
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
                  {language === "nl" ? stop.titleNl : stop.titleEn}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
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
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 12,
  },
  backBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
    padding: 6,
  },
  headerTitle: { fontSize: 18, color: "#fff", fontWeight: "700" },
  content: { padding: 10 },
  mapContainer: {
    borderRadius: 12,
    overflow: "hidden",
    alignSelf: 'center',
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 15,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center'
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 8,
    width: '31%', // Show 3 items per row in landscape
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 8,
  },
  legendBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  legendBadgeText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  legendLabel: { flex: 1, fontSize: 12, color: "#111" },
});