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
  Alert,
  ActivityIndicator,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Ionicons from "@react-native-vector-icons/ionicons";
import { WebView } from "react-native-webview";
import Sound from "react-native-sound";
import RNFS from "react-native-fs";

import { RootStackParamList } from "../../App";
import { useAppContext } from "../context/AppContext";
import { Language, Stop, Gender } from "../types";
import { getStopById } from "../data/api";

// --- CONFIGURATIE ---
const ELEVEN_LABS_API_KEY = "JOUW_ELEVENLABS_API_KEY"; // Vul hier je key in
const VOICE_IDS = {
  nl: {
    female: "94W4cf0CMSgymY1uoRiX",
    male: "dLPO5AsXc3FZDbTh1IKa",
  },
  en: {
    female: "qSeXEcewz7tA0Q0qk9fH",
    male: "IRHApOXLvnW57QJPQH2P",
  },
};

const PRIMARY = "#E30613";
const SECONDARY = "#0066B3";
const { height: SCREEN_H } = Dimensions.get("window");

type SpeedKey = "slow" | "normal" | "fast";
const SPEED_PRESETS: Record<SpeedKey, { rate: number; nl: string; en: string }> = {
  slow: { rate: 0.4, nl: "Langzaam", en: "Slow" },
  normal: { rate: 0.55, nl: "Normaal", en: "Normal" },
  fast: { rate: 0.7, nl: "Snel", en: "Fast" },
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
  const gender: Gender = settings.voiceGender || "female";

  const [stop, setStop] = useState<Stop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const stopIndex = stops.findIndex((s) => s.id === stopId);
  const isLastStop = stopIndex === stops.length - 1;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [speed, setSpeed] = useState<SpeedKey>(settings.textSpeed || "normal");
  const scrollRef = useRef<ScrollView>(null);
  const soundRef = useRef<Sound | null>(null);

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

  // Cleanup: stop audio bij verlaten scherm
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.stop();
        soundRef.current.release();
      }
    };
  }, []);

  const handleTTS = useCallback(async () => {
    if (isSpeaking) {
      soundRef.current?.stop(() => {
        setIsSpeaking(false);
      });
      return;
    }

    if (!stop) return;

    // Bepaal welke tekst en welke voiceID
    const text = language === "nl" 
      ? `${stop.titleNl}. ${stop.descriptionNl}` 
      : `${stop.titleEn}. ${stop.descriptionEn}`;
    
    const voiceId = VOICE_IDS[language][gender];
    
    // Unieke bestandsnaam voor caching (gebaseerd op stop, taal en gender)
    const fileName = `tts_${stop.id}_${language}_${gender}.mp3`;
    const path = `${RNFS.CachesDirectoryPath}/${fileName}`;

    try {
      const fileExists = await RNFS.exists(path);

      if (!fileExists) {
        setIsDownloading(true);
        const response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "xi-api-key": ELEVEN_LABS_API_KEY,
            },
            body: JSON.stringify({
              text: text,
              model_id: "eleven_multilingual_v2",
              voice_settings: { stability: 0.5, similarity_boost: 0.75 },
            }),
          }
        );

        if (!response.ok) throw new Error("ElevenLabs API error");

        const blob = await response.blob();
        const base64data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(",")[1];
            resolve(base64);
          };
        });

        await RNFS.writeFile(path, base64data, "base64");
        setIsDownloading(false);
      }

      // Afspelen
      const sound = new Sound(path, "", (error) => {
        if (error) {
          setIsSpeaking(false);
          return;
        }
        soundRef.current = sound;
        // ElevenLabs heeft vaste snelheid in MP3, maar we kunnen de afspeelsnelheid forceren:
        const playSpeed = speed === "slow" ? 0.85 : speed === "fast" ? 1.15 : 1.0;
        sound.setSpeed(playSpeed);
        
        setIsSpeaking(true);
        sound.play((success) => {
          setIsSpeaking(false);
          sound.release();
        });
      });

    } catch (err) {
      console.error(err);
      setIsDownloading(false);
      setIsSpeaking(false);
      Alert.alert(
        language === "nl" ? "Fout" : "Error",
        language === "nl" ? "Kon audio niet laden." : "Could not load audio."
      );
    }
  }, [isSpeaking, stop, language, gender, speed]);

  const handleBack = () => {
    if (soundRef.current) {
        soundRef.current.stop();
    }
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
          style={[styles.fab, styles.fabLeft, (isSpeaking || isDownloading) && styles.fabActive]}
          onPress={handleTTS}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons
              name={isSpeaking ? "volume-mute" : "volume-high"}
              size={26}
              color={isSpeaking ? "#fff" : PRIMARY}
            />
          )}
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
