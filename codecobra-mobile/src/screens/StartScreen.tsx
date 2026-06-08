import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { Language } from "../types";
import { Gender } from "../types";
import { useAppContext } from "../context/AppContext";

const PRIMARY = "#E30613";
const SECONDARY = "#0066B3";

type Props = NativeStackScreenProps<RootStackParamList, "Start">;

export function StartScreen({ navigation }: Props) {
  const { settings, setSettings } = useAppContext();
  const [language, setLanguage] = useState<Language | null>(null);
  const [voice, setVoice] = useState<Gender | null>(null);

  const confirm = () => {
    if (!language || !voice) return;
    setSettings({ ...settings, voiceGender: voice });
    navigation.replace("Scanner", { language });
  };

  const bg = settings.homeBackground || null;

  const content = (
    <ScrollView contentContainerStyle={styles.scroll} bounces={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>De Gieterij</Text>
        <Text style={styles.headerSub}>ROC van Twente</Text>
      </View>

      <View style={styles.body}>
        {/* Language selection */}
        <Text style={styles.sectionTitle}>
          Kies je taal · Choose your language
        </Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.card, language === "nl" && styles.cardActiveRed]}
            onPress={() => setLanguage("nl")}
            activeOpacity={0.8}
          >
            <Text style={styles.cardText}>🇳🇱 Nederlands</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.card, language === "en" && styles.cardActiveBlue]}
            onPress={() => setLanguage("en")}
            activeOpacity={0.8}
          >
            <Text style={styles.cardText}>🇬🇧 English</Text>
          </TouchableOpacity>
        </View>

        {/* Voice selection */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
          {language === "en" ? "Choose a voice" : "Kies een stem"}
        </Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.card, voice === "female" && styles.cardActiveBlue]}
            onPress={() => setVoice("female")}
            activeOpacity={0.8}
          >
            <Text style={styles.cardText}>
              👩 {language === "en" ? "Female voice" : "Vrouwenstem"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.card, voice === "male" && styles.cardActiveBlue]}
            onPress={() => setVoice("male")}
            activeOpacity={0.8}
          >
            <Text style={styles.cardText}>
              👨 {language === "en" ? "Male voice" : "Mannenstem"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Start button */}
        <TouchableOpacity
          style={[styles.startBtn, (!language || !voice) && styles.startBtnDisabled]}
          onPress={confirm}
          disabled={!language || !voice}
          activeOpacity={0.85}
        >
          <Text style={styles.startBtnText}>
            {language === "en" ? "Start tour →" : "Start rondleiding →"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  if (bg) {
    return (
      <SafeAreaView style={styles.safe}>
        <ImageBackground source={{ uri: bg }} style={styles.bgImage} blurRadius={2}>
          <View style={styles.bgOverlay}>{content}</View>
        </ImageBackground>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  bgImage: { flex: 1 },
  bgOverlay: { flex: 1, backgroundColor: "rgba(255,255,255,0.88)" },
  scroll: { flexGrow: 1 },
  header: {
    backgroundColor: PRIMARY,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  headerTitle: { fontSize: 36, color: "#fff", fontWeight: "700" },
  headerSub: { fontSize: 18, color: "rgba(255,255,255,0.9)", marginTop: 4 },
  body: { padding: 20, flex: 1 },
  sectionTitle: {
    fontSize: 20,
    textAlign: "center",
    marginBottom: 12,
    color: "#111",
  },
  row: { flexDirection: "row", gap: 12 },
  card: {
    flex: 1,
    paddingVertical: 24,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: "#e5e7eb",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  cardActiveRed: { borderColor: PRIMARY, backgroundColor: "#fff5f5" },
  cardActiveBlue: { borderColor: SECONDARY, backgroundColor: "#eff6ff" },
  cardText: { fontSize: 18, textAlign: "center" },
  startBtn: {
    marginTop: 28,
    backgroundColor: PRIMARY,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  startBtnDisabled: { backgroundColor: "#d1d5db" },
  startBtnText: { color: "#fff", fontSize: 20, fontWeight: "700" },
});
