import { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, ActivityIndicator, Alert, Linking, useColorScheme,
} from "react-native";
import { Colors } from "@/constants/colors";
import { API_BASE } from "@/constants/config";
import { Session, StudySession, ScheduleMetadata } from "@/lib/types";

function nextDay(iso: string): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split("T")[0];
}

function toGoogleCalendarUrl(event: {
  title: string; date: string; description: string;
}): string {
  const start = event.date.replace(/-/g, "");
  const end = nextDay(event.date).replace(/-/g, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${start}/${end}`,
    details: event.description,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric",
  });
}

export default function CalendarTab({ session }: { session: Session }) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  const [testDate, setTestDate] = useState("");
  const [schedule, setSchedule] = useState<StudySession[] | null>(null);
  const [metadata, setMetadata] = useState<ScheduleMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportingIdx, setExportingIdx] = useState<number | null>(null);

  // Minimum date: 3 days from today
  const minDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split("T")[0];
  })();

  const generateSchedule = async () => {
    if (!testDate || testDate < minDate) {
      Alert.alert("Invalid date", "Test date must be at least 3 days from today.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: session.notes, format: session.format, testDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate schedule");
      setSchedule(data.schedule);
      setMetadata(data.metadata);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const openInGoogleCalendar = async (s: StudySession, idx: number) => {
    setExportingIdx(idx);
    const prefix = s.type === "study" ? "📚 Study" : "🔄 Review";
    const topics = s.topics.slice(0, 3).join(", ") + (s.topics.length > 3 ? "…" : "");
    const url = toGoogleCalendarUrl({
      title: `${prefix}: ${topics}`,
      date: s.date,
      description: `ClassCapsule study session\nTopics: ${s.topics.join(", ")}`,
    });
    await Linking.openURL(url);
    setExportingIdx(null);
  };

  const openTestDayInGoogleCalendar = async () => {
    const url = toGoogleCalendarUrl({
      title: "🎯 Test Day",
      date: testDate,
      description: "Exam day — scheduled via ClassCapsule",
    });
    await Linking.openURL(url);
  };

  const exportAll = async () => {
    if (!schedule) return;
    Alert.alert(
      "Export all to Google Calendar?",
      `This will open ${schedule.length + 1} Google Calendar tabs (one per event).`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Export All",
          onPress: async () => {
            for (let i = 0; i < schedule.length; i++) {
              await openInGoogleCalendar(schedule[i], -1);
              await new Promise((r) => setTimeout(r, 400));
            }
            await openTestDayInGoogleCalendar();
          },
        },
      ]
    );
  };

  const s = makeStyles(c);

  if (!schedule) {
    return (
      <ScrollView contentContainerStyle={s.container}>
        <Text style={[s.heading, { color: c.text }]}>Study Schedule</Text>
        <Text style={[s.sub, { color: c.subtext }]}>
          Generate a spaced-repetition schedule based on your notes.
        </Text>
        <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[s.label, { color: c.text }]}>Test Date</Text>
          <TextInput
            style={[s.dateInput, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={c.subtext}
            value={testDate}
            onChangeText={setTestDate}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />
          <Text style={[s.hint, { color: c.subtext }]}>Must be at least 3 days from today ({minDate})</Text>
        </View>
        <TouchableOpacity
          style={[s.primaryBtn, (loading || !testDate) && { opacity: 0.5 }]}
          onPress={generateSchedule}
          disabled={loading || !testDate}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Generate Schedule</Text>}
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.container}>
      {/* Summary */}
      {metadata && (
        <View style={[s.metaRow, { backgroundColor: c.card, borderColor: c.border }]}>
          {[
            { label: "Topics", val: metadata.totalTopics },
            { label: "Study days", val: metadata.studyDays },
            { label: "Review days", val: metadata.reviewDays },
            { label: "Days left", val: metadata.daysUntilTest },
          ].map((m) => (
            <View key={m.label} style={s.metaItem}>
              <Text style={[s.metaVal, { color: c.text }]}>{m.val}</Text>
              <Text style={[s.metaLabel, { color: c.subtext }]}>{m.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Export all */}
      <TouchableOpacity
        style={[s.exportAllBtn, { borderColor: c.border }]}
        onPress={exportAll}
      >
        <Text style={{ fontSize: 16 }}>📅</Text>
        <Text style={[s.exportAllText, { color: c.text }]}>Add all to Google Calendar</Text>
      </TouchableOpacity>

      {/* Session list */}
      {schedule.map((sess, idx) => (
        <View key={idx} style={[s.sessionCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={s.sessionLeft}>
            <Text style={{ fontSize: 20 }}>{sess.type === "study" ? "📚" : "🔄"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.sessionDate, { color: c.text }]}>{formatDate(sess.date)}</Text>
              <Text style={[s.sessionType, { color: sess.type === "study" ? Colors.primary : Colors.warning }]}>
                {sess.type === "study" ? "Study" : `Review (day ${sess.reviewDay})`}
              </Text>
              <Text style={[s.sessionTopics, { color: c.subtext }]} numberOfLines={2}>
                {sess.topics.join(", ")}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[s.calBtn, { borderColor: c.border }]}
            onPress={() => openInGoogleCalendar(sess, idx)}
            disabled={exportingIdx === idx}
          >
            {exportingIdx === idx
              ? <ActivityIndicator size="small" color={Colors.primary} />
              : <Text style={{ fontSize: 16 }}>📅</Text>
            }
          </TouchableOpacity>
        </View>
      ))}

      {/* Test day */}
      <View style={[s.sessionCard, { backgroundColor: c.card, borderColor: Colors.danger + "55" }]}>
        <View style={s.sessionLeft}>
          <Text style={{ fontSize: 20 }}>🎯</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.sessionDate, { color: c.text }]}>{formatDate(testDate)}</Text>
            <Text style={[s.sessionType, { color: Colors.danger }]}>Test Day</Text>
          </View>
        </View>
        <TouchableOpacity style={[s.calBtn, { borderColor: c.border }]} onPress={openTestDayInGoogleCalendar}>
          <Text style={{ fontSize: 16 }}>📅</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[s.secondaryBtn, { borderColor: c.border }]}
        onPress={() => { setSchedule(null); setMetadata(null); }}
      >
        <Text style={{ color: c.subtext, fontWeight: "600" }}>New Schedule</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const makeStyles = (c: typeof Colors.light) =>
  StyleSheet.create({
    container: { padding: 16, gap: 14 },
    heading: { fontSize: 20, fontWeight: "700" },
    sub: { fontSize: 14, lineHeight: 20, marginTop: -6 },
    card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 8 },
    label: { fontSize: 14, fontWeight: "600" },
    dateInput: {
      borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
      fontSize: 15,
    },
    hint: { fontSize: 12 },
    primaryBtn: {
      backgroundColor: Colors.primary, borderRadius: 12,
      paddingVertical: 14, alignItems: "center",
    },
    primaryBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
    secondaryBtn: {
      borderWidth: 1, borderRadius: 12,
      paddingVertical: 12, alignItems: "center",
    },
    metaRow: {
      flexDirection: "row", borderRadius: 14, borderWidth: 1,
      padding: 16,
    },
    metaItem: { flex: 1, alignItems: "center" },
    metaVal: { fontSize: 20, fontWeight: "700" },
    metaLabel: { fontSize: 11, marginTop: 2 },
    exportAllBtn: {
      flexDirection: "row", alignItems: "center", gap: 10,
      borderWidth: 1, borderRadius: 12,
      paddingVertical: 12, paddingHorizontal: 16,
    },
    exportAllText: { fontWeight: "600", fontSize: 14 },
    sessionCard: {
      flexDirection: "row", alignItems: "center",
      borderRadius: 12, borderWidth: 1, padding: 12, gap: 12,
    },
    sessionLeft: { flex: 1, flexDirection: "row", gap: 10, alignItems: "flex-start" },
    sessionDate: { fontSize: 14, fontWeight: "600" },
    sessionType: { fontSize: 12, fontWeight: "600", marginTop: 1 },
    sessionTopics: { fontSize: 12, marginTop: 2, lineHeight: 17 },
    calBtn: {
      width: 36, height: 36, borderRadius: 8, borderWidth: 1,
      alignItems: "center", justifyContent: "center",
    },
  });
