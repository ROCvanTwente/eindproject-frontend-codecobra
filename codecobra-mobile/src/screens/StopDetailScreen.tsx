import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Image,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Ionicons from "@react-native-vector-icons/ionicons";
import { WebView } from "react-native-webview";
import Tts from "react-native-tts";

import { RootStackParamList } from "../../App";
import { useAppContext } from "../context/AppContext";
import { Language } from "../types";
import { getStopById } from "../data/api"; // Added API Import

const PRIMARY = "#E30613";
const SECONDARY = "#0066B3";
const { height: SCREEN_H } = Dimensions.get("window");

type SpeedKey = "slow" | "normal" | "fast";
const SPEED_PRESETS: Record<SpeedKey, { rate: number; nl: string; en: string }> = {
  slow: { rate: 0.35, nl: "Langzaam", en: "Slow" },
  normal: { rate: 0.5, nl: "Normaal", en: "Normal" },
  fast: { rate: 0.65, nl: "Snel", en: "Fast" },
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

  // Track the detailed stop data from API and a local loading state
  const [stop, setStop] = useState<any>(null);
  const [fetching, setFetching] = useState(true);

  const stopIndex = stops.findIndex((s) => s.id === stopId);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speed, setSpeed] = useState<SpeedKey>(settings.textSpeed || "normal");
  const scrollRef = useRef<ScrollView>(null);

  // 1. Fetch data from API on mount
  useEffect(() => {
    let isMounted = true;
    setFetching(true);

    getStopById(stopId)
      .then((data) => {
        if (isMounted) {
          setStop(data);
          setFetching(false);
        }
      })
      .catch((err) => {
        console.error("Error fetching stop details:", err);
        if (isMounted) setFetching(false);
      });

    return () => {
      isMounted = false;
    };
  }, [stopId]);

  const setupTts = useCallback(async () => {
    try {
      await Tts.getInitStatus();
      const voices = await Tts.voices();
      const targetLang = language === "nl" ? "nl-NL" : "en-US";

      const bestVoice = voices.find(v =>
        v.language.includes(targetLang) &&
        (v.name.toLowerCase().includes("premium") ||
          v.name.toLowerCase().includes("enhanced") ||
          v.name.toLowerCase().includes("neural"))
      ) || voices.find(v => v.language.includes(targetLang));

      if (bestVoice) {
        await Tts.setDefaultVoice(bestVoice.id);
      }

      await Tts.setDefaultLanguage(targetLang);
      await Tts.setDucking(true);
    } catch (e) {
      console.error("TTS Setup error:", e);
    }
  }, [language]);

  useEffect(() => {
    setupTts();

    const onStart = () => setIsSpeaking(true);
    const onFinish = () => setIsSpeaking(false);
    const onCancel = () => setIsSpeaking(false);

    const startSubscription = Tts.addEventListener("tts-start", onStart) as any;
    const finishSubscription = Tts.addEventListener("tts-finish", onFinish) as any;
    const cancelSubscription = Tts.addEventListener("tts-cancel", onCancel) as any;

    return () => {
      Tts.stop();
      startSubscription.remove();
      finishSubscription.remove();
      cancelSubscription.remove();
    };
  }, [setupTts]);

  const handleTTS = useCallback(async () => {
    if (isSpeaking) {
      Tts.stop();
      return;
    }

    if (!stop) return;

    const text = language === "nl"
      ? `${stop.titleNl}. ${stop.descriptionNl}`
      : `${stop.titleEn}. ${stop.descriptionEn}`;

    const ttsLang = language === "nl" ? "nl-NL" : "en-US";

    try {
      await Tts.setDefaultLanguage(ttsLang);
      await Tts.setDefaultRate(SPEED_PRESETS[speed].rate);
      Tts.speak(text);
    } catch (err) {
      console.error("TTS Error:", err);
    }
  }, [isSpeaking, stop, language, speed]);

  const handleBack = () => {
    Tts.stop();
    navigation.goBack();
  };

  const renderMedia = () => {
    // Note: If media mapping uses item.mediaUrl directly from API, check for that field
    const mediaUrl = stop.mediaUrl || stop.media?.url;
    
    if (!mediaUrl) {
      return (
        <View style={styles.noMedia}>
          <Text style={styles.noMediaText}>
            {language === "nl" ? "Geen media beschikbaar" : "No media available"}
          </Text>
        </View>
      );
    }

    // Determine type (defaulting to image or handling dynamically based on string values)
    const isVideo = isYouTube(mediaUrl) || isVimeo(mediaUrl);

    if (isVideo) {
      return (
        <WebView
          style={styles.mediaImage}
          source={{ uri: getEmbedUrl(mediaUrl) }}
          allowsFullscreenVideo
          javaScriptEnabled
        />
      );
    }

    return <Image source={{ uri: mediaUrl }} style={styles.mediaImage} resizeMode="cover" />;
  };

  // 2. Render Loading State while fetching API data
  if (fetching) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </SafeAreaView>
    );
  }

  // 3. Render Error State if API returns nothing or fails

  return (
    <View style={styles.container}>
      <View style={styles.mediaSection}>
        {renderMedia()}

        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="arrow-back" size={22} color={PRIMARY} />
          <Text style={styles.backBtnText}>{language === "nl" ? "Terug" : "Back"}</Text>
        </TouchableOpacity>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {stopIndex + 1} / {stops.length}
          </Text>
        </View>
      </View>

      <View style={styles.textSection}>
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
          <Text style={styles.stopTitle}>{language === "nl" ? stop.titleNl : stop.titleEn}</Text>
          <Text style={styles.stopDescription}>{language === "nl" ? stop.descriptionNl : stop.descriptionEn}</Text>

          <View style={styles.nextCard}>
            <Text style={styles.nextCardText}>
              {language === "nl"
                ? "Ga terug en scan de volgende QR-code"
                : "Go back and scan the next QR code"}
            </Text>
          </View>
          <View style={{ height: 80 }} />
        </ScrollView>

        <TouchableOpacity
          style={[styles.fab, styles.fabLeft, isSpeaking && styles.fabActive]}
          onPress={handleTTS}
        >
          <Ionicons
            name={isSpeaking ? "stop" : "volume-high"}
            size={26}
            color={isSpeaking ? "#fff" : PRIMARY}
          />
        </TouchableOpacity>

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
  center: { alignItems: "center", justifyContent: "center" },
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