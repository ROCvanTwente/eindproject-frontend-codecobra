import React, { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  SafeAreaView,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../../App";
import { useAppContext } from "../context/AppContext";
import { Stop } from "../types";
import { Language } from "../types";

const PRIMARY = "#E30613";
const SECONDARY = "#0066B3";

type Props = NativeStackScreenProps<RootStackParamList, "RouteOverview">;

export function RouteOverviewScreen({ navigation, route }: Props) {
  const { stops } = useAppContext();
  const language: Language = route.params.language;

  const totalDuration = useMemo(
    () => stops.reduce((sum, s) => sum + s.estimatedDuration, 0),
    [stops],
  );

  const renderStop = ({ item, index }: { item: Stop; index: number }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.push("StopDetail", { stopId: item.id, language })}
      activeOpacity={0.85}
    >
      <View style={styles.cardStripe} />
      <View style={styles.cardRow}>
        <View style={styles.cardIndex}>
          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.7)" />
          <Text style={styles.cardIndexText}>{index + 1}</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title[language]}
          </Text>
          <View style={styles.cardLocationRow}>
            <Ionicons name="location-outline" size={14} color={SECONDARY} />
            <Text style={styles.cardLocation} numberOfLines={1}>
              {item.location[language]}
            </Text>
          </View>
          <Text style={styles.cardDesc} numberOfLines={2}>
            {item.description[language]}
          </Text>
          {item.estimatedDuration > 0 && (
            <View style={styles.cardDurationRow}>
              <Ionicons name="time-outline" size={14} color="#9ca3af" />
              <Text style={styles.cardDuration}>
                {item.estimatedDuration} {language === "nl" ? "min." : "min."}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>
            {language === "nl" ? "Route-overzicht" : "Route overview"}
          </Text>
          <Text style={styles.headerSub}>
            {language === "nl"
              ? `${stops.length} stopplaatsen · De Gieterij`
              : `${stops.length} stops · De Gieterij`}
          </Text>
        </View>
      </View>

      <FlatList
        data={stops}
        keyExtractor={(s) => String(s.id)}
        renderItem={renderStop}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.introCard}>
            <View style={styles.introIcon}>
              <Ionicons name="location" size={24} color="#fff" />
            </View>
            <Text style={styles.introText}>
              {language === "nl"
                ? "Tik op een stop om de informatie te bekijken."
                : "Tap a stop to view the information."}
            </Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.endCard}>
            <Text style={styles.endCardText}>
              {language === "nl"
                ? `✓ Totale rondleiding: ~${totalDuration} minuten`
                : `✓ Total tour: ~${totalDuration} minutes`}
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />
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
  list: { padding: 16, paddingTop: 12 },
  introCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: `${SECONDARY}33`,
    gap: 12,
  },
  introIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: SECONDARY,
    alignItems: "center",
    justifyContent: "center",
  },
  introText: { flex: 1, fontSize: 16, color: "#374151", lineHeight: 22 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#f3f4f6",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardStripe: { height: 5, backgroundColor: PRIMARY },
  cardRow: { flexDirection: "row" },
  cardIndex: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  cardIndexText: { color: "#fff", fontWeight: "700", fontSize: 26 },
  cardContent: { flex: 1, padding: 14 },
  cardTitle: { fontSize: 20, fontWeight: "600", color: "#111", marginBottom: 4 },
  cardLocationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 },
  cardLocation: { fontSize: 15, color: SECONDARY, flex: 1 },
  cardDesc: { fontSize: 14, color: "#6b7280", lineHeight: 20, marginBottom: 6 },
  cardDurationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardDuration: { fontSize: 13, color: "#9ca3af" },
  endCard: {
    marginTop: 16,
    backgroundColor: "#f0fdf4",
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: "#86efac",
    alignItems: "center",
  },
  endCardText: { fontSize: 18, color: "#166534" },
});
