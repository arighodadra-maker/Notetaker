import { useCallback, useEffect, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, Alert, useColorScheme, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { loadSessions, deleteSession } from "@/lib/sessions";
import { Session } from "@/lib/types";
import { Colors } from "@/constants/colors";

const FORMAT_EMOJI: Record<string, string> = {
  bullet: "📋",
  cornell: "📝",
  flashcards: "🃏",
  "study-guide": "📖",
  flowchart: "🔀",
  mindmap: "🧠",
  diagrams: "📊",
};

function SessionCard({
  session,
  onPress,
  onDelete,
  c,
}: {
  session: Session;
  onPress: () => void;
  onDelete: () => void;
  c: typeof Colors.light;
}) {
  const date = session.createdAt.toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });
  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardContent}>
        <Text style={styles.cardEmoji}>{FORMAT_EMOJI[session.format] ?? "📄"}</Text>
        <View style={styles.cardText}>
          <Text style={[styles.cardTitle, { color: c.text }]} numberOfLines={2}>{session.title}</Text>
          <Text style={[styles.cardDate, { color: c.subtext }]}>{date}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={(e) => { e.stopPropagation(); onDelete(); }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.deleteIcon}>🗑</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  const fetch = useCallback(async () => {
    if (!user) return;
    try {
      const data = await loadSessions(user.uid);
      setSessions(data);
    } catch {
      Alert.alert("Error", "Could not load sessions.");
    }
  }, [user]);

  useEffect(() => {
    fetch().finally(() => setLoading(false));
  }, [fetch]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetch();
    setRefreshing(false);
  };

  const handleDelete = (session: Session) => {
    Alert.alert("Delete session?", session.title, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          if (!user) return;
          await deleteSession(user.uid, session.id);
          setSessions((prev) => prev.filter((s) => s.id !== session.id));
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: c.text }]}>My Notes</Text>
          <Text style={[styles.headerSub, { color: c.subtext }]}>
            {sessions.length} session{sessions.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => router.push("/session/new")}
          >
            <Text style={styles.newBtnText}>+ New</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => signOut()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ fontSize: 22 }}>👤</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={Colors.primary} />
      ) : sessions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📚</Text>
          <Text style={[styles.emptyTitle, { color: c.text }]}>No notes yet</Text>
          <Text style={[styles.emptySub, { color: c.subtext }]}>
            Tap <Text style={{ color: Colors.primary }}>+ New</Text> to create your first session
          </Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => (
            <SessionCard
              session={item}
              c={c}
              onPress={() => router.push(`/session/${item.id}`)}
              onDelete={() => handleDelete(item)}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 22, fontWeight: "700" },
  headerSub: { fontSize: 12, marginTop: 2 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 14 },
  newBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  newBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  loader: { marginTop: 60 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: "600", marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  list: { padding: 16, gap: 12 },
  card: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  cardContent: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  cardEmoji: { fontSize: 26 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "600", lineHeight: 20 },
  cardDate: { fontSize: 12, marginTop: 3 },
  deleteBtn: { padding: 4 },
  deleteIcon: { fontSize: 16 },
});
