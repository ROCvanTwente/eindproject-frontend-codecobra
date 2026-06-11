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
import Svg, { Circle, Text as SvgText, Image as SvgImage, G } from "react-native-svg"; // Importeer G
import { RootStackParamList } from "../../App";
import { useAppContext } from "../context/AppContext";
import { Language } from "../types";
import FloorPlanImage from "../imports/PlattegrondGieterijBeganegrondV2.0.png";
import { getAllStops } from "../data/api";

const PRIMARY = "#E30613";
const SECONDARY = "#0066B3";

type Props = NativeStackScreenProps<RootStackParamList, "FloorPlan">;

export function FloorPlanScreen({ navigation, route }: Props) {
  const { stops: contextStops, currentStartStopId, receptionCoordinates } = useAppContext();
  const language: Language = route.params.language;

  const { width, height } = useWindowDimensions();

  const [stopsData, setStopsData] = useState(contextStops ?? []);
  const [loading, setLoading] = useState<boolean>(false);

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
    // Re-fetch stops if contextStops change (e.g., after initial load or app state reset)
  }, [contextStops]);

  const AVAILABLE_HEIGHT = height - 120;
  const MAP_W = AVAILABLE_HEIGHT; 
  const MAP_H = MAP_W * (704 / 1531);

  const scaleX = (x: number) => (x / 1531) * MAP_W;
  const scaleY = (y: number) => (y / 704) * MAP_H;

  const positionedStops = stopsData.filter((s) => s.positionX != null && s.positionY != null);

  // Functie om naar de PathfindingScreen te navigeren
  const handleStopPress = (targetStopId: string) => {
    // Bepaal het werkelijke start ID voor de route
    const actualStartId = currentStartStopId || 'reception_fixed'; // Gebruik receptie als fallback

    navigation.navigate("Pathfinding", {
      startStopId: actualStartId,
      endStopId: targetStopId,
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === "nl" ? "Plattegrond De Gieterij" : "Floor plan De Gieterij"}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.mapContainer, { width: MAP_H, height: MAP_W }]}>
          {loading ? (
            <ActivityIndicator size="large" color={PRIMARY} />
          ) : (
            <View style={[styles.rotatedWrapper, { width: MAP_W, height: MAP_H }]}>
              <Svg width={MAP_W} height={MAP_H}>
                <SvgImage
                  href={FloorPlanImage}
                  width={MAP_W}
                  height={MAP_H}
                  preserveAspectRatio="xMidYMid slice"
                />

                {/* Teken de vaste receptie coördinaten als een aanklikbaar punt */}
                {receptionCoordinates && (
                  <G onPress={() => handleStopPress('reception_fixed')}>
                    <Circle cx={scaleX(receptionCoordinates.x)} cy={scaleY(receptionCoordinates.y)} r={12} fill={currentStartStopId === 'reception_fixed' ? PRIMARY : SECONDARY} />
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
                      y={scaleY(receptionCoordinates.y) - 18} // Positie boven de cirkel
                      textAnchor="middle"
                      fill={currentStartStopId === 'reception_fixed' ? PRIMARY : SECONDARY} // Kleur afhankelijk van of het de start is
                      fontSize={12}
                      fontWeight="bold"
                    >
                      Receptie
                    </SvgText>
                  </G>
                )}

                {positionedStops.map((stop) => {
                  const cx = scaleX(stop.positionX!);
                  const cy = scaleY(stop.positionY!);
                  const stopNumber = stopsData.findIndex((s) => s.id === stop.id) + 1;
                  
                  // Bepaal de vulkleur: PRIMARY als het de huidige startstop is, anders SECONDARY
                  const fillColor = stop.id === currentStartStopId ? PRIMARY : SECONDARY;

                  return (
                    <G key={stop.id} onPress={() => handleStopPress(stop.id)}>
                      <Circle cx={cx} cy={cy} r={12} fill={fillColor} />
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
              </Svg>
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  backBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
    padding: 6,
  },
  headerTitle: { fontSize: 18, color: "#fff", fontWeight: "700" },
  content: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 10 
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
    transform: [{ rotate: '270deg' }],
  },
});
 