import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
  Platform,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Camera, CameraType } from "react-native-camera-kit";
import Ionicons from "@react-native-vector-icons/ionicons";
import { check, openSettings, PERMISSIONS, request, RESULTS } from "react-native-permissions";
import { RootStackParamList } from "../../App";
import { useAppContext } from "../context/AppContext";
import { Language } from "../types";

const PRIMARY = "#E30613";
const SECONDARY = "#0066B3";

type Props = NativeStackScreenProps<RootStackParamList, "Scanner">;

export function QRScannerScreen({ navigation, route }: Props) {
  const { stops } = useAppContext();
  const [language, setLanguage] = useState<Language>(route.params.language);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);

  const cameraPermission =
    Platform.OS === "ios" ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA;

  const toggleLanguage = () =>
    setLanguage((prev) => (prev === "nl" ? "en" : "nl"));

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    const stop = stops.find((s) => s.qrCode === data);
    if (stop) {
      setScanning(false);
      navigation.push("StopDetail", { stopId: stop.id, language });
    } else {
      Alert.alert(
        language === "nl" ? "Onbekende QR-code" : "Unknown QR code",
        language === "nl"
          ? "Deze QR-code is niet gekoppeld aan een stop."
          : "This QR code is not linked to a stop.",
        [{ text: "OK", onPress: () => setScanned(false) }],
      );
    }
  };

  const ensureCameraPermission = async () => {
    const status = await check(cameraPermission);

    if (status === RESULTS.GRANTED || status === RESULTS.LIMITED) {
      return true;
    }

    if (status === RESULTS.BLOCKED) {
      Alert.alert(
        language === "nl" ? "Camera vereist" : "Camera required",
        language === "nl"
          ? "Geef cameratoegang in de instellingen."
          : "Please enable camera access in settings.",
        [
          { text: language === "nl" ? "Annuleren" : "Cancel", style: "cancel" },
          {
            text: language === "nl" ? "Instellingen" : "Settings",
            onPress: () => {
              void openSettings();
            },
          },
        ],
      );
      return false;
    }

    if (status === RESULTS.UNAVAILABLE) {
      Alert.alert(
        language === "nl" ? "Camera niet beschikbaar" : "Camera unavailable",
        language === "nl"
          ? "Deze camera is niet beschikbaar op dit apparaat."
          : "This camera is not available on this device.",
      );
      return false;
    }

    const nextStatus = await request(cameraPermission);

    if (nextStatus === RESULTS.GRANTED || nextStatus === RESULTS.LIMITED) {
      return true;
    }

    Alert.alert(
      language === "nl" ? "Camera vereist" : "Camera required",
      language === "nl"
        ? "Geef cameratoegang in de instellingen."
        : "Please enable camera access in settings.",
    );
    return false;
  };

  const openCamera = async () => {
    const hasPermission = await ensureCameraPermission();
    if (!hasPermission) {
      return;
    }
    setScanned(false);
    setScanning(true);
  };

  if (scanning) {
    return (
      <View style={styles.cameraContainer}>
        <Camera
          style={StyleSheet.absoluteFill}
          cameraType={CameraType.Back}
          scanBarcode
          allowedBarcodeTypes={["qr"]}
          onReadCode={
            scanned
              ? undefined
              : ({ nativeEvent }) => handleBarCodeScanned({ data: nativeEvent.codeStringValue })
          }
          onError={() => {
            setScanning(false);
            Alert.alert(
              language === "nl" ? "Camera fout" : "Camera error",
              language === "nl"
                ? "De camera kon niet worden gestart."
                : "The camera could not be started.",
            );
          }}
        />
        {/* Overlay frame */}
        <View style={styles.cameraOverlay}>
          <View style={styles.scanFrame} />
          <Text style={styles.scanHint}>
            {language === "nl"
              ? "Richt op een QR-code"
              : "Aim at a QR code"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.closeCamera}
          onPress={() => setScanning(false)}
        >
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Language toggle */}
      <TouchableOpacity style={styles.langBtn} onPress={toggleLanguage}>
        <Text style={styles.langBtnText}>
          {language === "nl" ? "English" : "Nederlands"}
        </Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>De Gieterij</Text>
        <Text style={styles.headerSub}>
          {language === "nl" ? "Digitale rondleiding" : "Digital tour"}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Scan button */}
        <TouchableOpacity style={styles.scanBtn} onPress={openCamera} activeOpacity={0.85}>
          <Ionicons name="qr-code-outline" size={80} color={PRIMARY} />
          <Text style={styles.scanBtnLabel}>
            {language === "nl" ? "Scan QR-code" : "Scan QR code"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.orLabel}>
          {language === "nl" ? "— of kies een stop —" : "— or choose a stop —"}
        </Text>

        {/* Stops list */}
        <View style={styles.stopList}>
          {stops.length === 0 ? (
            <Text style={styles.emptyText}>
              {language === "nl" ? "Geen stops beschikbaar." : "No stops available."}
            </Text>
          ) : (
            stops.map((stop, index) => (
              <TouchableOpacity
                key={stop.id}
                style={styles.stopItem}
                onPress={() => navigation.push("StopDetail", { stopId: stop.id, language })}
                activeOpacity={0.8}
              >
                <View style={styles.stopIndex}>
                  <Text style={styles.stopIndexText}>{index + 1}</Text>
                </View>
                <Text style={styles.stopTitle} numberOfLines={1}>
                  {language === "nl" ? stop.titleNl : stop.titleEn || stop.qrCodeId}
                </Text>
                <Ionicons name="chevron-forward" size={20} color={SECONDARY} />
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Footer nav */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.footerBtn}
          onPress={() => navigation.push("FloorPlan", { language })}
        >
          <Ionicons name="map-outline" size={28} color={SECONDARY} />
          <Text style={styles.footerBtnText}>
            {language === "nl" ? "Plattegrond" : "Floor plan"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.footerBtn}
          onPress={() => navigation.push("RouteOverview", { language })}
        >
          <Ionicons name="list-outline" size={28} color={SECONDARY} />
          <Text style={styles.footerBtnText}>
            {language === "nl" ? "Route" : "Route"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.footerBtn}
          onPress={() => navigation.push("Admin")}
        >
          <Ionicons name="settings-outline" size={28} color={PRIMARY} />
          <Text style={styles.footerBtnText}>
            {language === "nl" ? "Beheer" : "Admin"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  langBtn: {
    position: "absolute",
    top: 50,
    right: 16,
    zIndex: 50,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: SECONDARY,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  langBtnText: { color: SECONDARY, fontWeight: "600", fontSize: 15 },
  header: {
    backgroundColor: PRIMARY,
    paddingTop: 52,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 30, color: "#fff", fontWeight: "700" },
  headerSub: { fontSize: 18, color: "rgba(255,255,255,0.9)", marginTop: 4 },
  scroll: { padding: 20, paddingBottom: 40 },
  scanBtn: {
    backgroundColor: "#fff5f5",
    borderWidth: 3,
    borderColor: "#fca5a5",
    borderRadius: 24,
    alignItems: "center",
    paddingVertical: 32,
    marginBottom: 20,
  },
  scanBtnLabel: { marginTop: 12, fontSize: 22, fontWeight: "700", color: PRIMARY },
  orLabel: { textAlign: "center", color: "#6b7280", fontSize: 16, marginBottom: 16 },
  stopList: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "rgba(0,102,179,0.15)",
    overflow: "hidden",
  },
  emptyText: {
    textAlign: "center",
    color: "#9ca3af",
    padding: 20,
    fontSize: 16,
  },
  stopItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    gap: 12,
  },
  stopIndex: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  stopIndexText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  stopTitle: { flex: 1, fontSize: 17, color: "#111" },
  footer: {
    flexDirection: "row",
    backgroundColor: SECONDARY,
    paddingVertical: 12,
    paddingBottom: 24,
  },
  footerBtn: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff",
    marginHorizontal: 6,
    paddingVertical: 14,
    borderRadius: 14,
  },
  footerBtnText: { fontSize: 13, fontWeight: "600", color: "#374151", textAlign: "center" },
  // Camera
  cameraContainer: { flex: 1, backgroundColor: "#000" },
  cameraOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  scanFrame: {
    width: 240,
    height: 240,
    borderWidth: 3,
    borderColor: "#fff",
    borderRadius: 16,
  },
  scanHint: { color: "#fff", fontSize: 18, fontWeight: "600" },
  closeCamera: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 24,
    padding: 10,
  },
});
