import { useCallback, useRef, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, TextInput, ActivityIndicator, useColorScheme,
} from "react-native";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from "expo-av";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { makeTitle } from "@/lib/sessions";
import { API_BASE } from "@/constants/config";
import { Colors } from "@/constants/colors";
import { NoteFormat } from "@/lib/types";

const FORMATS: { id: NoteFormat; label: string; emoji: string; desc: string }[] = [
  { id: "bullet", label: "Bullet Points", emoji: "📋", desc: "Hierarchical bullet notes" },
  { id: "cornell", label: "Cornell Notes", emoji: "📝", desc: "Cues · Notes · Summary" },
  { id: "flashcards", label: "Flashcards", emoji: "🃏", desc: "Q&A pairs for active recall" },
  { id: "study-guide", label: "Study Guide", emoji: "📖", desc: "Comprehensive exam prep" },
  { id: "flowchart", label: "Flowchart", emoji: "🔀", desc: "Visual process diagram" },
  { id: "mindmap", label: "Mind Map", emoji: "🧠", desc: "Concept web" },
];

type InputMode = "record" | "file" | "text";
type Step = "input" | "format" | "generating";

export default function NewSessionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  const [step, setStep] = useState<Step>("input");
  const [inputMode, setInputMode] = useState<InputMode>("record");
  const [transcript, setTranscript] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<NoteFormat>("bullet");
  const [status, setStatus] = useState("");

  // Audio recording state
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const durationInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "Microphone access is required to record.");
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);
      durationInterval.current = setInterval(() => setRecordingDuration((d) => d + 1), 1000);
    } catch (e: any) {
      Alert.alert("Recording failed", e.message);
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;
    clearInterval(durationInterval.current!);
    setIsRecording(false);
    await recordingRef.current.stopAndUnloadAsync();
    const uri = recordingRef.current.getURI();
    setRecordingUri(uri);
    recordingRef.current = null;
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "text/plain",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const file = result.assets[0];
    setStatus(`Extracting text from ${file.name}…`);
    try {
      const formData = new FormData();
      formData.append("file", { uri: file.uri, name: file.name, type: file.mimeType ?? "application/octet-stream" } as any);
      const res = await fetch(`${API_BASE}/api/extract`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Extraction failed");
      setTranscript(data.text);
      setStatus("");
    } catch (e: any) {
      setStatus("");
      Alert.alert("Error", e.message);
    }
  };

  const transcribeAudio = async (): Promise<string> => {
    if (!recordingUri) throw new Error("No recording found");
    setStatus("Transcribing audio…");
    const formData = new FormData();
    formData.append("audio", { uri: recordingUri, name: "recording.m4a", type: "audio/m4a" } as any);
    const res = await fetch(`${API_BASE}/api/transcribe`, { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Transcription failed");
    return data.transcript;
  };

  const generateNotes = async () => {
    if (!user) return;
    setStep("generating");
    try {
      let text = transcript;
      if (inputMode === "record") {
        text = await transcribeAudio();
      }
      if (!text.trim()) {
        Alert.alert("No content", "Please provide audio, a file, or type some text.");
        setStep("format");
        return;
      }

      setStatus("Generating notes with AI…");
      const res = await fetch(`${API_BASE}/api/format`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text, format: selectedFormat }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");

      const notes: string = data.notes;
      const title = makeTitle(selectedFormat, notes);

      await addDoc(collection(db, "users", user.uid, "sessions"), {
        title,
        format: selectedFormat,
        notes,
        transcript: text,
        createdAt: serverTimestamp(),
      });

      router.replace("/(tabs)");
    } catch (e: any) {
      Alert.alert("Error", e.message);
      setStep("format");
    } finally {
      setStatus("");
    }
  };

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const s = makeStyles(c);

  // ── Step: generating ────────────────────────────────────────────────────────
  if (step === "generating") {
    return (
      <View style={[s.centered, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={[s.statusText, { color: c.text }]}>{status || "Working…"}</Text>
      </View>
    );
  }

  // ── Step: format picker ──────────────────────────────────────────────────────
  if (step === "format") {
    return (
      <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={s.container}>
        <Text style={[s.sectionTitle, { color: c.text }]}>Choose note format</Text>
        <Text style={[s.sectionSub, { color: c.subtext }]}>How should your notes be structured?</Text>
        <View style={s.formatGrid}>
          {FORMATS.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[
                s.formatCard,
                { backgroundColor: c.card, borderColor: selectedFormat === f.id ? Colors.primary : c.border },
              ]}
              onPress={() => setSelectedFormat(f.id)}
            >
              <Text style={s.formatEmoji}>{f.emoji}</Text>
              <Text style={[s.formatLabel, { color: c.text }]}>{f.label}</Text>
              <Text style={[s.formatDesc, { color: c.subtext }]}>{f.desc}</Text>
              {selectedFormat === f.id && (
                <View style={s.formatCheck}><Text style={{ color: "#fff", fontSize: 12 }}>✓</Text></View>
              )}
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={s.primaryBtn} onPress={generateNotes}>
          <Text style={s.primaryBtnText}>Generate Notes →</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── Step: input ──────────────────────────────────────────────────────────────
  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <Text style={[s.sectionTitle, { color: c.text }]}>Add content</Text>

      {/* Input mode tabs */}
      <View style={[s.modeTabs, { backgroundColor: c.card, borderColor: c.border }]}>
        {(["record", "file", "text"] as InputMode[]).map((m) => (
          <TouchableOpacity
            key={m}
            style={[s.modeTab, inputMode === m && s.modeTabActive]}
            onPress={() => setInputMode(m)}
          >
            <Text style={{ fontSize: 16 }}>
              {m === "record" ? "🎙" : m === "file" ? "📎" : "✏️"}
            </Text>
            <Text style={[s.modeTabLabel, { color: inputMode === m ? Colors.primary : c.subtext }]}>
              {m === "record" ? "Record" : m === "file" ? "File" : "Type"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Record */}
      {inputMode === "record" && (
        <View style={[s.inputCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[s.inputHint, { color: c.subtext }]}>
            Record your lecture or voice notes — we'll transcribe it automatically.
          </Text>
          {isRecording && (
            <View style={s.recordingIndicator}>
              <View style={s.recordingDot} />
              <Text style={{ color: Colors.danger, fontWeight: "600" }}>
                Recording {formatDuration(recordingDuration)}
              </Text>
            </View>
          )}
          {recordingUri && !isRecording && (
            <View style={s.recordingDone}>
              <Text style={{ color: Colors.success, fontSize: 14 }}>✓ Recording ready</Text>
            </View>
          )}
          <TouchableOpacity
            style={[s.recordBtn, { backgroundColor: isRecording ? Colors.danger : Colors.primary }]}
            onPress={isRecording ? stopRecording : startRecording}
          >
            <Text style={s.recordBtnText}>{isRecording ? "⏹ Stop" : "🎙 Start Recording"}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* File */}
      {inputMode === "file" && (
        <View style={[s.inputCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[s.inputHint, { color: c.subtext }]}>
            Upload a PDF, Word doc, PowerPoint, or plain text file.
          </Text>
          {status ? (
            <View style={s.extractingRow}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={[{ color: c.subtext, fontSize: 14 }]}>{status}</Text>
            </View>
          ) : transcript ? (
            <Text style={{ color: Colors.success, fontSize: 14, marginBottom: 12 }}>
              ✓ Text extracted ({transcript.length} chars)
            </Text>
          ) : null}
          <TouchableOpacity style={s.primaryBtn} onPress={pickFile}>
            <Text style={s.primaryBtnText}>📎 Choose File</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Text */}
      {inputMode === "text" && (
        <View style={[s.inputCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <TextInput
            style={[s.textArea, { color: c.text, borderColor: c.border }]}
            placeholder="Paste your transcript or notes here…"
            placeholderTextColor={c.subtext}
            value={transcript}
            onChangeText={setTranscript}
            multiline
            textAlignVertical="top"
          />
        </View>
      )}

      {/* Next button */}
      {(inputMode === "record" ? recordingUri : transcript.trim()) ? (
        <TouchableOpacity style={s.primaryBtn} onPress={() => setStep("format")}>
          <Text style={s.primaryBtnText}>Next: Choose Format →</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

const makeStyles = (c: typeof Colors.light) =>
  StyleSheet.create({
    container: { padding: 20, gap: 16 },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
    statusText: { fontSize: 15 },
    sectionTitle: { fontSize: 22, fontWeight: "700" },
    sectionSub: { fontSize: 14, marginTop: -8 },
    modeTabs: {
      flexDirection: "row",
      borderRadius: 12,
      borderWidth: 1,
      overflow: "hidden",
    },
    modeTab: { flex: 1, alignItems: "center", paddingVertical: 10, gap: 4 },
    modeTabActive: { backgroundColor: "#EFF6FF" },
    modeTabLabel: { fontSize: 12, fontWeight: "500" },
    inputCard: {
      borderRadius: 14,
      padding: 18,
      borderWidth: 1,
      gap: 12,
    },
    inputHint: { fontSize: 14, lineHeight: 20 },
    recordingIndicator: { flexDirection: "row", alignItems: "center", gap: 8 },
    recordingDot: {
      width: 8, height: 8, borderRadius: 4,
      backgroundColor: Colors.danger,
    },
    recordingDone: { alignItems: "center" },
    recordBtn: {
      borderRadius: 10, paddingVertical: 13,
      alignItems: "center",
    },
    recordBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
    extractingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    textArea: {
      borderWidth: 1, borderRadius: 10,
      padding: 12, minHeight: 160, fontSize: 14,
    },
    formatGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    formatCard: {
      width: "47%", borderRadius: 14, padding: 14,
      borderWidth: 2, position: "relative",
    },
    formatEmoji: { fontSize: 28, marginBottom: 6 },
    formatLabel: { fontSize: 14, fontWeight: "600", marginBottom: 2 },
    formatDesc: { fontSize: 12, lineHeight: 16 },
    formatCheck: {
      position: "absolute", top: 8, right: 8,
      width: 20, height: 20, borderRadius: 10,
      backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center",
    },
    primaryBtn: {
      backgroundColor: Colors.primary,
      borderRadius: 12, paddingVertical: 14,
      alignItems: "center",
    },
    primaryBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  });
