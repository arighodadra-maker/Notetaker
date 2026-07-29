import { useCallback, useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, Alert, useColorScheme,
} from "react-native";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Colors } from "@/constants/colors";

interface QuizResult {
  id: string;
  format: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeMs: number;
  createdAt: Date;
}

interface FormatStat {
  format: string;
  avgScore: number;
  sessions: number;
}

const FORMAT_LABELS: Record<string, string> = {
  bullet: "Outline Notes", cornell: "Cornell Method",
  flashcards: "Active Recall", "study-guide": "Study Guide",
  flowchart: "Visual Flow", mindmap: "Mind Map",
};
const FORMAT_EMOJI: Record<string, string> = {
  bullet: "📋", cornell: "📝", flashcards: "🃏",
  "study-guide": "📖", flowchart: "🔀", mindmap: "🧠",
};

function formatMs(ms: number): string {
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <View style={{ height: 6, backgroundColor: "#E5E7EB", borderRadius: 3, flex: 1 }}>
      <View style={{ height: 6, width: `${Math.round(score * 100)}%`, backgroundColor: color, borderRadius: 3 }} />
    </View>
  );
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);

  const loadResults = useCallback(async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, "users", user.uid, "quizResults"),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      setResults(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
        })) as QuizResult[]
      );
    } catch {
      Alert.alert("Error", "Could not load quiz history.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadResults(); }, [loadResults]);

  const avgScore = results.length
    ? results.reduce((a, r) => a + r.score, 0) / results.length
    : null;

  const formatStats: FormatStat[] = Object.entries(
    results.reduce<Record<string, number[]>>((acc, r) => {
      if (!acc[r.format]) acc[r.format] = [];
      acc[r.format].push(r.score);
      return acc;
    }, {})
  ).map(([format, scores]) => ({
    format,
    avgScore: scores.reduce((a, s) => a + s, 0) / scores.length,
    sessions: scores.length,
  })).sort((a, b) => b.avgScore - a.avgScore);

  const scoreColor = (s: number) => s >= 0.8 ? Colors.success : s >= 0.6 ? Colors.primary : Colors.warning;

  const s = makeStyles(c);

  return (
    <View style={[s.flex, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <View>
          <Text style={[s.headerTitle, { color: c.text }]}>Learning Profile</Text>
          <Text style={[s.headerSub, { color: c.subtext }]}>{user?.email}</Text>
        </View>
        <TouchableOpacity
          onPress={() => Alert.alert("Sign out?", "", [
            { text: "Cancel", style: "cancel" },
            { text: "Sign Out", style: "destructive", onPress: () => signOut() },
          ])}
        >
          <Text style={{ fontSize: 22 }}>👤</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={s.loader} color={Colors.primary} />
      ) : results.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyEmoji}>📊</Text>
          <Text style={[s.emptyTitle, { color: c.text }]}>No quiz history yet</Text>
          <Text style={[s.emptySub, { color: c.subtext }]}>
            Complete quizzes on your sessions to track your learning progress.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll}>
          {/* Overall score */}
          <View style={[s.overallCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={s.overallLeft}>
              <Text style={[s.overallPct, { color: avgScore != null ? scoreColor(avgScore) : c.text }]}>
                {avgScore != null ? `${Math.round(avgScore * 100)}%` : "—"}
              </Text>
              <Text style={[s.overallLabel, { color: c.subtext }]}>Average score</Text>
            </View>
            <View style={s.overallStats}>
              <View style={s.statItem}>
                <Text style={[s.statVal, { color: c.text }]}>{results.length}</Text>
                <Text style={[s.statLabel, { color: c.subtext }]}>Quizzes</Text>
              </View>
              <View style={s.statItem}>
                <Text style={[s.statVal, { color: c.text }]}>
                  {results.reduce((a, r) => a + r.totalQuestions, 0)}
                </Text>
                <Text style={[s.statLabel, { color: c.subtext }]}>Questions</Text>
              </View>
              <View style={s.statItem}>
                <Text style={[s.statVal, { color: c.text }]}>
                  {formatMs(results.reduce((a, r) => a + r.timeMs, 0))}
                </Text>
                <Text style={[s.statLabel, { color: c.subtext }]}>Total time</Text>
              </View>
            </View>
          </View>

          {/* Per-format stats */}
          {formatStats.length > 0 && (
            <View style={[s.section, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={[s.sectionTitle, { color: c.text }]}>By Format</Text>
              {formatStats.map((fs) => (
                <View key={fs.format} style={s.formatRow}>
                  <Text style={{ fontSize: 20, width: 28 }}>{FORMAT_EMOJI[fs.format] ?? "📄"}</Text>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={[s.formatName, { color: c.text }]}>
                        {FORMAT_LABELS[fs.format] ?? fs.format}
                      </Text>
                      <Text style={[s.formatPct, { color: scoreColor(fs.avgScore) }]}>
                        {Math.round(fs.avgScore * 100)}%
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <ScoreBar score={fs.avgScore} color={scoreColor(fs.avgScore)} />
                      <Text style={[s.formatSessions, { color: c.subtext }]}>{fs.sessions}×</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Recent results */}
          <View style={[s.section, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[s.sectionTitle, { color: c.text }]}>Recent Quizzes</Text>
            {results.slice(0, 10).map((r) => (
              <View key={r.id} style={[s.resultRow, { borderTopColor: c.border }]}>
                <Text style={{ fontSize: 18 }}>{FORMAT_EMOJI[r.format] ?? "📄"}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.resultFormat, { color: c.text }]}>
                    {FORMAT_LABELS[r.format] ?? r.format}
                  </Text>
                  <Text style={[s.resultMeta, { color: c.subtext }]}>
                    {r.correctAnswers}/{r.totalQuestions} · {formatMs(r.timeMs)} · {r.createdAt.toLocaleDateString()}
                  </Text>
                </View>
                <Text style={[s.resultScore, { color: scoreColor(r.score) }]}>
                  {Math.round(r.score * 100)}%
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const makeStyles = (c: typeof Colors.light) =>
  StyleSheet.create({
    flex: { flex: 1 },
    header: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
    },
    headerTitle: { fontSize: 22, fontWeight: "700" },
    headerSub: { fontSize: 12, marginTop: 2 },
    loader: { marginTop: 60 },
    empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
    emptyEmoji: { fontSize: 56, marginBottom: 16 },
    emptyTitle: { fontSize: 20, fontWeight: "600", marginBottom: 8 },
    emptySub: { fontSize: 14, textAlign: "center", lineHeight: 20 },
    scroll: { padding: 16, gap: 16 },
    overallCard: {
      borderRadius: 16, borderWidth: 1, padding: 20,
      flexDirection: "row", alignItems: "center", gap: 16,
    },
    overallLeft: { alignItems: "center", minWidth: 72 },
    overallPct: { fontSize: 36, fontWeight: "800" },
    overallLabel: { fontSize: 11, marginTop: 2 },
    overallStats: { flex: 1, flexDirection: "row", justifyContent: "space-around" },
    statItem: { alignItems: "center" },
    statVal: { fontSize: 18, fontWeight: "700" },
    statLabel: { fontSize: 11, marginTop: 1 },
    section: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 14 },
    sectionTitle: { fontSize: 16, fontWeight: "700" },
    formatRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    formatName: { fontSize: 14, fontWeight: "500" },
    formatPct: { fontSize: 14, fontWeight: "700" },
    formatSessions: { fontSize: 11, width: 24 },
    resultRow: {
      flexDirection: "row", alignItems: "center", gap: 10,
      paddingTop: 10, borderTopWidth: 1,
    },
    resultFormat: { fontSize: 14, fontWeight: "500" },
    resultMeta: { fontSize: 12, marginTop: 2 },
    resultScore: { fontSize: 16, fontWeight: "700" },
  });
