import { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, useColorScheme,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Colors } from "@/constants/colors";
import { Session } from "@/lib/types";
import NotesTab from "@/components/session/NotesTab";
import QuizTab from "@/components/session/QuizTab";
import CalendarTab from "@/components/session/CalendarTab";

type Tab = "notes" | "quiz" | "calendar";

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: "notes", label: "Notes", emoji: "📝" },
  { id: "quiz", label: "Quiz", emoji: "🧠" },
  { id: "calendar", label: "Schedule", emoji: "📅" },
];

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("notes");

  useEffect(() => {
    if (!user || !id) return;
    getDoc(doc(db, "users", user.uid, "sessions", id))
      .then((snap) => {
        if (!snap.exists()) { Alert.alert("Not found"); router.back(); return; }
        const d = snap.data();
        setSession({
          id: snap.id,
          title: d.title ?? "",
          format: d.format,
          notes: d.notes ?? "",
          transcript: d.transcript ?? "",
          createdAt: d.createdAt?.toDate?.() ?? new Date(),
        });
      })
      .catch(() => Alert.alert("Error loading session"))
      .finally(() => setLoading(false));
  }, [user, id]);

  const s = styles(c);

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (!session) return null;

  return (
    <View style={s.container}>
      <Stack.Screen options={{ title: session.title.split(" · ")[0] ?? "Notes" }} />

      {/* Tab bar */}
      <View style={[s.tabBar, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[s.tab, activeTab === tab.id && s.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={s.tabEmoji}>{tab.emoji}</Text>
            <Text
              style={[
                s.tabLabel,
                { color: activeTab === tab.id ? Colors.primary : c.subtext },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab content */}
      {activeTab === "notes" && <NotesTab session={session} />}
      {activeTab === "quiz" && <QuizTab session={session} />}
      {activeTab === "calendar" && <CalendarTab session={session} />}
    </View>
  );
}

const styles = (c: typeof Colors.light) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    centered: { flex: 1, alignItems: "center", justifyContent: "center" },
    tabBar: {
      flexDirection: "row",
      borderBottomWidth: 1,
    },
    tab: {
      flex: 1, alignItems: "center", paddingVertical: 10, gap: 2,
    },
    tabActive: {
      borderBottomWidth: 2,
      borderBottomColor: Colors.primary,
    },
    tabEmoji: { fontSize: 18 },
    tabLabel: { fontSize: 11, fontWeight: "600" },
  });
