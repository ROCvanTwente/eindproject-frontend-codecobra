import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  Image,
  SafeAreaView,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import { WebView } from "react-native-webview";
import { RootStackParamList } from "../../App";
import { useAppContext } from "../context/AppContext";
import { Language } from "../types";

const PRIMARY = "#E30613";
const SECONDARY = "#0066B3";
const { height: SCREEN_H } = Dimensions.get("window");

type SpeedKey = "slow" | "normal" | "fast";
const SPEED_PRESETS: Record<SpeedKey, { rate: number; nl: string; en: string }> = {
  slow: { rate: 0.75, nl: "Langzaam", en: "Slow" },
  normal: { rate: 0.9, nl: "Normaal", en: "Normal" },
  fast: { rate: 1.1, nl: "Snel", en: "Fast" },
};

type Props = NativeStackScreenProps<RootStackParamList, "StopDetail">;

function isYouTube(url: string) {
  return /youtube\.com|youtu\.be/.test(url);
}
function isVimeo(url: string) {
  return /vimeo\.com/.test(url);
}
function getEmbedUrl(url: string) {
  if (isYouTube(url)) {
    const match = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=0` : url;
  }
  if (isVimeo(url)) {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match ? `https://player.vimeo.com/video/${match[1]}` : url;
  }
  return url;
}

export function StopDetailScreen({ navigation, route }: Props) {
  const { stops, settings } = useAppContext();
  const { stopId, language: initialLang } = route.params;
  const language: Language = initialLang;

  const stop = stops.find((s) => s.id === stopId);
  const stopIndex = stops.findIndex((s) => s.id === stopId);
  const isLastStop = stopIndex === stops.length - 1;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speed, setSpeed] = useState<SpeedKey>(settings.textSpeed || "normal");
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const handleTTS = useCallback(async () => {
    if (isSpeaking) {
      await Speech.stop();
      setIsSpeaking(false);
      return;
    }
    if (!stop) return;
    const text = `${stop.title[language]}. ${stop.description[language]}`;
    setIsSpeaking(true);
    Speech.speak(text, {
      language: language === "nl" ? "nl-NL" : "en-US",
      rate: SPEED_PRESETS[speed].rate,
      onDone: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
    });
  }, [isSpeaking, stop, language, speed]);

  const handleBack = () => {
    Speech.stop();
    navigation.goBack();
  };

  if (!stop) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={{ padding: 20, fontSize: 18 }}>Stop niet gevonden.</Text>
      </SafeAreaView>
    );
  }

  const renderMedia = () => {
    if (!stop.media) {
      return (
        <View style={styles.noMedia}>
          <Text style={styles.noMediaText}>
            {language === "nl" ? "Geen media beschikbaar" : "No media available"}
          </Text>
        </View>
      );
    }
    if (stop.media.type === "image") {
      return <Image source={{ uri: stop.media.url }} style={styles.mediaImage} resizeMode="cover" />;
    }
    if (stop.media.type === "video") {
      return (
        <WebView
          style={styles.mediaImage}
          source={{ uri: getEmbedUrl(stop.media.url) }}
          allowsFullscreenVideo
          javaScriptEnabled
        />
      );
    }
    if (stop.media.type === "audio") {
      return (
        <View style={styles.noMedia}>
          <Ionicons name="musical-notes-outline" size={64} color="#9ca3af" />
          <Text style={styles.noMediaText}>{stop.media.url}</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
      {/* Media section — top half */}
      <View style={styles.mediaSection}>
        {renderMedia()}

        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="arrow-back" size={22} color={PRIMARY} />
          <Text style={styles.backBtnText}>{language === "nl" ? "Terug" : "Back"}</Text>
        </TouchableOpacity>

        {/* Stop counter badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {stopIndex + 1} / {stops.length}
          </Text>
        </View>
      </View>

      {/* Text section — dark bottom */}
      <View style={styles.textSection}>
        {/* Speed selector */}
        <View style={styles.speedRow}>
          <Ionicons name="speedometer-outline" size={18} color="rgba(255,255,255,0.7)" />
          {(Object.keys(SPEED_PRESETS) as SpeedKey[]).map((key) => (
            <TouchableOpacity
              key={key}
              style={[styles.speedBtn, speed === key && styles.speedBtnActive]}
              onPress={() => setSpeed(key)}
            >
              <Text style={[styles.speedBtnText, speed === key && styles.speedBtnTextActive]}>
                {SPEED_PRESETS[key][language]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView ref={scrollRef} style={styles.textScroll} contentContainerStyle={styles.textContent}>
          <Text style={styles.stopTitle}>{stop.title[language]}</Text>
          <Text style={styles.stopDescription}>{stop.description[language]}</Text>

          {isLastStop ? (
            <View style={styles.endCard}>
              <Text style={styles.endCardTitle}>
                {language === "nl" ? "✓ Rondleiding voltooid" : "✓ Tour completed"}
              </Text>
              <Text style={styles.endCardText}>
                {language === "nl"
                  ? "Bedankt voor je bezoek aan De Gieterij!"
                  : "Thank you for visiting De Gieterij!"}
              </Text>
            </View>
          ) : (
            <View style={styles.nextCard}>
              <Text style={styles.nextCardText}>
                {language === "nl"
                  ? "Ga terug en scan de volgende QR-code"
                  : "Go back and scan the next QR code"}
              </Text>
            </View>
          )}
          <View style={{ height: 80 }} />
        </ScrollView>

        {/* TTS button */}
        <TouchableOpacity
          style={[styles.fab, styles.fabLeft, isSpeaking && styles.fabActive]}
          onPress={handleTTS}
        >
          <Ionicons
            name={isSpeaking ? "volume-mute" : "volume-high"}
            size={26}
            color={isSpeaking ? "#fff" : PRIMARY}
          />
        </TouchableOpacity>

        {/* Scroll to top/bottom button */}
        <TouchableOpacity
          style={[styles.fab, styles.fabRight]}
          onPress={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
        >
          <Ionicons name="play" size={26} color={PRIMARY} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, backgroundColor: "#000" },
  mediaSection: { height: SCREEN_H * 0.42, backgroundColor: "#000" },
  mediaImage: { width: "100%", height: "100%" },
  noMedia: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1f2937",
    gap: 12,
  },
  noMediaText: { color: "#9ca3af", fontSize: 18 },
  backBtn: {
    position: "absolute",
    top: 44,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: PRIMARY,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  backBtnText: { color: PRIMARY, fontWeight: "700", fontSize: 16 },
  badge: {
    position: "absolute",
    top: 44,
    right: 12,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: PRIMARY,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  badgeText: { color: PRIMARY, fontWeight: "700", fontSize: 16 },
  textSection: { flex: 1, backgroundColor: "#111827" },
  speedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  speedBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  speedBtnActive: { backgroundColor: "#fff" },
  speedBtnText: { color: "rgba(255,255,255,0.7)", fontSize: 14 },
  speedBtnTextActive: { color: PRIMARY },
  textScroll: { flex: 1 },
  textContent: { padding: 20, paddingTop: 16 },
  stopTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 16,
    textAlign: "center",
    lineHeight: 36,
  },
  stopDescription: {
    fontSize: 18,
    lineHeight: 28,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 24,
    textAlign: "center",
  },
  endCard: {
    backgroundColor: "rgba(34,197,94,0.15)",
    borderWidth: 3,
    borderColor: "#4ade80",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
  },
  endCardTitle: { fontSize: 22, fontWeight: "700", color: "#86efac", marginBottom: 8 },
  endCardText: { fontSize: 18, color: "#bbf7d0", textAlign: "center", lineHeight: 26 },
  nextCard: {
    backgroundColor: `${SECONDARY}33`,
    borderWidth: 3,
    borderColor: SECONDARY,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  nextCardText: { fontSize: 18, color: "#bfdbfe", textAlign: "center", lineHeight: 26 },
  fab: {
    position: "absolute",
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: PRIMARY,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabLeft: { left: 20 },
  fabRight: { right: 20 },
  fabActive: { backgroundColor: PRIMARY },
});
