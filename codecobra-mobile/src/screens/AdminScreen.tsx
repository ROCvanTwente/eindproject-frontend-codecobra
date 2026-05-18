import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  SafeAreaView,
  Switch,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../../App";
import { useAppContext } from "../context/AppContext";
import { Stop } from "../types";
import { addHistory } from "../data/settings";

const PRIMARY = "#E30613";
const SECONDARY = "#0066B3";

type Props = NativeStackScreenProps<RootStackParamList, "Admin">;
type AdminTab = "stops" | "theme" | "tts" | "accounts";

export function AdminScreen({ navigation }: Props) {
  const { stops, setStops, settings, setSettings } = useAppContext();
  const [loggedIn, setLoggedIn] = useState(!!settings.currentSession);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTab>("stops");

  const handleLogin = () => {
    const account = settings.accounts.find(
      (a) => a.username === username && a.password === password,
    );
    if (account) {
      setSettings({ ...settings, currentSession: { username: account.username, role: account.role } });
      setLoggedIn(true);
    } else {
      Alert.alert("Fout", "Onjuiste gebruikersnaam of wachtwoord.");
    }
  };

  const handleLogout = () => {
    setSettings({ ...settings, currentSession: null });
    setLoggedIn(false);
    navigation.goBack();
  };

  const deleteStop = (id: number) => {
    Alert.alert("Stop verwijderen?", "Deze actie kan niet ongedaan worden gemaakt.", [
      { text: "Annuleren", style: "cancel" },
      {
        text: "Verwijderen",
        style: "destructive",
        onPress: () => {
          const updated = stops.filter((s) => s.id !== id);
          setStops(updated);
          setSettings(addHistory(settings, settings.currentSession?.username ?? "?", "verwijderd", `stop #${id}`));
        },
      },
    ]);
  };

  if (!loggedIn) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loginContainer}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={PRIMARY} />
            <Text style={styles.backBtnText}>Terug</Text>
          </TouchableOpacity>
          <View style={styles.loginCard}>
            <Ionicons name="lock-closed-outline" size={48} color={PRIMARY} />
            <Text style={styles.loginTitle}>Beheerders-login</Text>
            <TextInput
              style={styles.input}
              placeholder="Gebruikersnaam"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Wachtwoord"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
              <Text style={styles.loginBtnText}>Inloggen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBack} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Beheer</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Uitloggen</Text>
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {(["stops", "theme", "tts", "accounts"] as AdminTab[]).map((tab) => {
          const labels: Record<AdminTab, string> = {
            stops: "Stops", theme: "Thema", tts: "Stem", accounts: "Accounts",
          };
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {labels[tab]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab content */}
      <ScrollView style={styles.tabContent} contentContainerStyle={{ paddingBottom: 40 }}>
        {activeTab === "stops" && (
          <StopsTab stops={stops} onDelete={deleteStop} />
        )}
        {activeTab === "theme" && (
          <ThemeTab settings={settings} setSettings={setSettings} />
        )}
        {activeTab === "tts" && (
          <TTSTab settings={settings} setSettings={setSettings} />
        )}
        {activeTab === "accounts" && (
          <AccountsTab settings={settings} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StopsTab({ stops, onDelete }: { stops: Stop[]; onDelete: (id: number) => void }) {
  return (
    <View style={styles.tabSection}>
      <Text style={styles.sectionTitle}>Tour stops ({stops.length})</Text>
      {stops.length === 0 && (
        <Text style={styles.emptyText}>Geen stops aangemaakt.</Text>
      )}
      {stops.map((stop, i) => (
        <View key={stop.id} style={styles.stopRow}>
          <View style={styles.stopRowLeft}>
            <View style={styles.stopRowBadge}>
              <Text style={styles.stopRowBadgeText}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stopRowTitle} numberOfLines={1}>{stop.title.nl || stop.qrCode}</Text>
              <Text style={styles.stopRowSub} numberOfLines={1}>QR: {stop.qrCode}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => onDelete(stop.id)}
          >
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      ))}
      <Text style={styles.hintText}>
        Gebruik het webbeheerpaneel om stops toe te voegen en te bewerken.
      </Text>
    </View>
  );
}

function ThemeTab({
  settings,
  setSettings,
}: {
  settings: ReturnType<typeof useAppContext>["settings"];
  setSettings: (s: typeof settings) => void;
}) {
  return (
    <View style={styles.tabSection}>
      <Text style={styles.sectionTitle}>Kleuren</Text>
      <View style={styles.colorRow}>
        <View style={[styles.colorSwatch, { backgroundColor: settings.theme.primary }]} />
        <Text style={styles.colorLabel}>Primair: {settings.theme.primary}</Text>
      </View>
      <View style={styles.colorRow}>
        <View style={[styles.colorSwatch, { backgroundColor: settings.theme.secondary }]} />
        <Text style={styles.colorLabel}>Secundair: {settings.theme.secondary}</Text>
      </View>
      <Text style={styles.hintText}>Kleurbewerking is beschikbaar in het webpaneel.</Text>
    </View>
  );
}

function TTSTab({
  settings,
  setSettings,
}: {
  settings: ReturnType<typeof useAppContext>["settings"];
  setSettings: (s: typeof settings) => void;
}) {
  return (
    <View style={styles.tabSection}>
      <Text style={styles.sectionTitle}>Tekst-naar-spraak</Text>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Voorlezen ingeschakeld</Text>
        <Switch
          value={settings.ttsEnabled}
          onValueChange={(v) => setSettings({ ...settings, ttsEnabled: v })}
          trackColor={{ true: PRIMARY }}
        />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Stem: {settings.voiceGender === "female" ? "Vrouw" : "Man"}</Text>
        <Switch
          value={settings.voiceGender === "male"}
          onValueChange={(v) => setSettings({ ...settings, voiceGender: v ? "male" : "female" })}
          trackColor={{ true: SECONDARY }}
        />
      </View>
      <Text style={styles.rowLabel}>Leessnelheid: {settings.textSpeed}</Text>
      <View style={styles.speedRow}>
        {(["slow", "normal", "fast"] as const).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.speedBtn, settings.textSpeed === s && styles.speedBtnActive]}
            onPress={() => setSettings({ ...settings, textSpeed: s })}
          >
            <Text style={[styles.speedBtnText, settings.textSpeed === s && styles.speedBtnTextActive]}>
              {s === "slow" ? "Langzaam" : s === "normal" ? "Normaal" : "Snel"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function AccountsTab({ settings }: { settings: ReturnType<typeof useAppContext>["settings"] }) {
  return (
    <View style={styles.tabSection}>
      <Text style={styles.sectionTitle}>Accounts ({settings.accounts.length})</Text>
      {settings.accounts.map((acc) => (
        <View key={acc.id} style={styles.accountRow}>
          <Ionicons name="person-circle-outline" size={32} color={SECONDARY} />
          <View style={{ flex: 1 }}>
            <Text style={styles.accountName}>{acc.username}</Text>
            <Text style={styles.accountRole}>{acc.role}</Text>
          </View>
        </View>
      ))}
      <Text style={styles.hintText}>Accountbeheer is beschikbaar in het webpaneel.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f9fafb" },
  // Login
  loginContainer: { flex: 1, padding: 20 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 32 },
  backBtnText: { color: PRIMARY, fontSize: 16, fontWeight: "600" },
  loginCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    gap: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  loginTitle: { fontSize: 24, fontWeight: "700", color: "#111" },
  input: {
    width: "100%",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#111",
  },
  loginBtn: {
    width: "100%",
    backgroundColor: PRIMARY,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  loginBtnText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  // Header
  header: {
    backgroundColor: PRIMARY,
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  headerBack: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    padding: 8,
  },
  headerTitle: { flex: 1, fontSize: 24, color: "#fff", fontWeight: "700" },
  logoutBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logoutText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  // Tabs
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: PRIMARY },
  tabText: { fontSize: 13, color: "#6b7280", fontWeight: "500" },
  tabTextActive: { color: PRIMARY, fontWeight: "700" },
  tabContent: { flex: 1 },
  tabSection: { padding: 16, gap: 12 },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: "#111", marginBottom: 4 },
  emptyText: { color: "#9ca3af", fontSize: 16, textAlign: "center", padding: 20 },
  hintText: {
    fontSize: 13,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
  // Stops tab
  stopRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 12,
  },
  stopRowLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  stopRowBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  stopRowBadgeText: { color: "#fff", fontWeight: "700" },
  stopRowTitle: { fontSize: 16, fontWeight: "600", color: "#111" },
  stopRowSub: { fontSize: 13, color: "#9ca3af" },
  deleteBtn: { padding: 8 },
  // Theme tab
  colorRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  colorSwatch: { width: 36, height: 36, borderRadius: 8 },
  colorLabel: { fontSize: 16, color: "#374151" },
  // TTS tab
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  switchLabel: { fontSize: 16, color: "#374151" },
  rowLabel: { fontSize: 16, color: "#374151", marginTop: 4 },
  speedRow: { flexDirection: "row", gap: 8 },
  speedBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  speedBtnActive: { borderColor: PRIMARY, backgroundColor: "#fff5f5" },
  speedBtnText: { fontSize: 15, color: "#6b7280" },
  speedBtnTextActive: { color: PRIMARY, fontWeight: "700" },
  // Accounts tab
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  accountName: { fontSize: 16, fontWeight: "600", color: "#111" },
  accountRole: { fontSize: 13, color: "#9ca3af" },
});
