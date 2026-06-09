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
import { Language, Stop, Gender } from "../types";
import { getStopById } from "../data/api";

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

  const [stop, setStop] = useState<Stop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const stopIndex = stops.findIndex((s) => s.id === stopId);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speed, setSpeed] = useState<SpeedKey>(settings.textSpeed || "normal");
  const scrollRef = useRef<ScrollView>(null);

  const setupTts = useCallback(async () => {
    try {
      await Tts.getInitStatus();

      // Zoek naar de beste stemmen op het toestel
      const voices = await Tts.voices();
      const targetLang = language === "nl" ? "nl-NL" : "en-US";

      // Filter op taal en zoek naar 'premium', 'neural' of 'enhanced' (deze klinken menselijk)
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
      // Iets lagere pitch maakt het vaak natuurlijker
      await Tts.setDucking(true);
    } catch (e) {
      console.error("TTS Setup error:", e);
    }
  }, [language]);

  useEffect(() => {
    setupTts();

    // Define handlers for clean removal
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

  useEffect(() => {
    async function fetchStopData() {
      try {
        setLoading(true);
        const data = await getStopById(stopId);
        setStop(data);
        setError(false);
      } catch (err) {
        console.error("Error fetching stop:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchStopData();
  }, [stopId]);

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

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: "center", alignItems: "center", backgroundColor: "#111827" }]}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </SafeAreaView>
    );
  }

  if (error || !stop) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ padding: 20, alignItems: 'center' }}>
          <Text style={{ fontSize: 18, marginBottom: 20 }}>
            {language === "nl" ? "Stop niet gevonden." : "Stop not found."}
          </Text>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>{language === "nl" ? "Terug" : "Back"}</Text>
          </TouchableOpacity>
        </View>
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