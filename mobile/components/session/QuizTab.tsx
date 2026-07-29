import { useCallback, useMemo, useRef, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, ActivityIndicator, Alert, useColorScheme,
} from "react-native";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Colors } from "@/constants/colors";
import { API_BASE } from "@/constants/config";
import { Session, QuizQuestion, QuizMode, MatchingPair } from "@/lib/types";

type QuizState = "setup" | "active" | "results";

const MODES: { id: QuizMode; label: string; emoji: string }[] = [
  { id: "multiple-choice", label: "Multiple Choice", emoji: "🔘" },
  { id: "true-false", label: "True / False", emoji: "✅" },
  { id: "fill-blank", label: "Fill in the Blank", emoji: "✏️" },
  { id: "matching", label: "Matching", emoji: "🔗" },
  { id: "open-ended", label: "Open Ended", emoji: "💬" },
  { id: "mixed", label: "Mixed", emoji: "🎲" },
];

function normalizeAnswer(s: string) {
  return s.toLowerCase().trim().replace(/[^\w\s]/g, "").replace(/\s+/g, " ");
}

export default function QuizTab({ session }: { session: Session }) {
  const { user } = useAuth();
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  const [quizState, setQuizState] = useState<QuizState>("setup");
  const [mode, setMode] = useState<QuizMode>("multiple-choice");
  const [count, setCount] = useState(5);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(1);

  // Answer state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [fillAnswers, setFillAnswers] = useState<Record<number, string>>({});
  const [matchingAnswers, setMatchingAnswers] = useState<Record<string, string>>({});
  const [overrides, setOverrides] = useState<Record<number, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const startTimeRef = useRef<number>(0);

  const shuffledDefs = useMemo(() => {
    const result: Record<number, string[]> = {};
    for (const q of questions) {
      if (q.type === "matching" && q.matchingPairs) {
        const defs = [...q.matchingPairs.map((p) => p.definition)];
        // seeded shuffle by q.id
        for (let i = defs.length - 1; i > 0; i--) {
          const j = Math.abs((q.id * 2654435761 + i) % (i + 1));
          [defs[i], defs[j]] = [defs[j], defs[i]];
        }
        result[q.id] = defs;
      }
    }
    return result;
  }, [questions]);

  const { gradableCount, correctCount } = useMemo(() => {
    if (!submitted) return { gradableCount: 0, correctCount: 0 };
    let gradable = 0, correct = 0;
    for (const q of questions) {
      if (q.type === "open-ended") continue;
      gradable++;
      if (q.type === "fill-blank") {
        const autoRight = normalizeAnswer(fillAnswers[q.id] ?? "") === normalizeAnswer(q.correctAnswer ?? "");
        const isRight = q.id in overrides ? overrides[q.id] : autoRight;
        if (isRight) correct++;
      } else if (q.type === "matching" && q.matchingPairs) {
        let allRight = true;
        q.matchingPairs.forEach((pair, idx) => {
          const key = `${q.id}-${idx}`;
          if (matchingAnswers[key] !== pair.definition) allRight = false;
        });
        if (q.id in overrides ? overrides[q.id] : allRight) correct++;
      } else {
        const isRight = selectedAnswers[q.id] === q.correctIndex;
        if (q.id in overrides ? overrides[q.id] : isRight) correct++;
      }
    }
    return { gradableCount: gradable, correctCount: correct };
  }, [submitted, questions, selectedAnswers, fillAnswers, matchingAnswers, overrides]);

  const generateQuiz = useCallback(async () => {
    setLoading(true);
    setSelectedAnswers({});
    setFillAnswers({});
    setMatchingAnswers({});
    setOverrides({});
    setSubmitted(false);
    try {
      const res = await fetch(`${API_BASE}/api/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: session.notes, count, mode, attempt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Quiz generation failed");
      setQuestions(data.questions);
      setQuizState("active");
      startTimeRef.current = Date.now();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  }, [session.notes, count, mode, attempt]);

  const handleSubmit = async () => {
    setSubmitted(true);
    setQuizState("results");
    if (!user || gradableCount === 0) return;
    const score = correctCount / gradableCount;
    try {
      await addDoc(collection(db, "users", user.uid, "quizResults"), {
        format: session.format,
        score,
        totalQuestions: gradableCount,
        correctAnswers: correctCount,
        timeMs: Date.now() - startTimeRef.current,
        confidenceRating: 3,
        createdAt: serverTimestamp(),
      });
    } catch { /* non-critical */ }
  };

  const s = makeStyles(c);

  // ── Setup ────────────────────────────────────────────────────────────────────
  if (quizState === "setup") {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.container}>
        <Text style={[s.heading, { color: c.text }]}>Choose quiz mode</Text>
        <View style={s.modeGrid}>
          {MODES.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[s.modeCard, { backgroundColor: c.card, borderColor: mode === m.id ? Colors.primary : c.border }]}
              onPress={() => setMode(m.id)}
            >
              <Text style={{ fontSize: 24 }}>{m.emoji}</Text>
              <Text style={[s.modeLabel, { color: c.text }]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[s.countLabel, { color: c.text }]}>Questions: {count}</Text>
        <View style={s.countRow}>
          {[3, 5, 10, 15].map((n) => (
            <TouchableOpacity
              key={n}
              style={[s.countBtn, { backgroundColor: count === n ? Colors.primary : c.card, borderColor: c.border }]}
              onPress={() => setCount(n)}
            >
              <Text style={{ color: count === n ? "#fff" : c.text, fontWeight: "600" }}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[s.primaryBtn, loading && { opacity: 0.6 }]} onPress={generateQuiz} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Start Quiz</Text>}
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── Results ──────────────────────────────────────────────────────────────────
  if (quizState === "results") {
    const pct = gradableCount > 0 ? Math.round((correctCount / gradableCount) * 100) : null;
    const color = pct == null ? c.subtext : pct >= 80 ? Colors.success : pct >= 60 ? Colors.primary : Colors.warning;
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.container}>
        <View style={[s.scoreCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={{ fontSize: 48, fontWeight: "800", color }}>
            {pct != null ? `${pct}%` : "—"}
          </Text>
          <Text style={[s.scoreLabel, { color: c.subtext }]}>
            {gradableCount > 0 ? `${correctCount} / ${gradableCount} correct` : "Open-ended (self-graded)"}
          </Text>
        </View>

        {questions.map((q, qi) => (
          <QuestionReview
            key={q.id} q={q} qi={qi}
            selectedAnswers={selectedAnswers}
            fillAnswers={fillAnswers}
            matchingAnswers={matchingAnswers}
            overrides={overrides}
            onOverride={(id, val) => setOverrides((prev) => {
              if (id in prev && prev[id] === val) {
                const next = { ...prev }; delete next[id]; return next;
              }
              return { ...prev, [id]: val };
            })}
            c={c}
          />
        ))}

        <TouchableOpacity style={s.primaryBtn} onPress={() => { setQuizState("setup"); setAttempt((a) => a + 1); }}>
          <Text style={s.primaryBtnText}>New Quiz</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── Active ───────────────────────────────────────────────────────────────────
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      {questions.map((q, qi) => (
        <QuestionCard
          key={q.id} q={q} qi={qi}
          selectedAnswers={selectedAnswers} setSelectedAnswers={setSelectedAnswers}
          fillAnswers={fillAnswers} setFillAnswers={setFillAnswers}
          matchingAnswers={matchingAnswers} setMatchingAnswers={setMatchingAnswers}
          shuffledDefs={shuffledDefs}
          submitted={submitted}
          c={c}
        />
      ))}
      {!submitted && (
        <TouchableOpacity style={s.primaryBtn} onPress={handleSubmit}>
          <Text style={s.primaryBtnText}>Submit Quiz</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

// ── Question Card ─────────────────────────────────────────────────────────────

function QuestionCard({
  q, qi, selectedAnswers, setSelectedAnswers,
  fillAnswers, setFillAnswers,
  matchingAnswers, setMatchingAnswers,
  shuffledDefs, submitted, c,
}: {
  q: QuizQuestion; qi: number;
  selectedAnswers: Record<number, number>;
  setSelectedAnswers: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  fillAnswers: Record<number, string>;
  setFillAnswers: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  matchingAnswers: Record<string, string>;
  setMatchingAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  shuffledDefs: Record<number, string[]>;
  submitted: boolean;
  c: typeof Colors.light;
}) {
  const s = makeStyles(c);
  return (
    <View style={[s.qCard, { backgroundColor: c.card, borderColor: c.border }]}>
      <Text style={[s.qNum, { color: c.subtext }]}>Q{qi + 1}</Text>
      <Text style={[s.qText, { color: c.text }]}>{q.question}</Text>

      {/* Multiple choice / True-False */}
      {(q.type === "multiple-choice" || q.type === "true-false") && q.options && (
        <View style={s.optionList}>
          {q.options.map((opt, i) => {
            const chosen = selectedAnswers[q.id] === i;
            return (
              <TouchableOpacity
                key={i}
                style={[s.option, { borderColor: chosen ? Colors.primary : c.border, backgroundColor: chosen ? "#EFF6FF" : c.card }]}
                onPress={() => !submitted && setSelectedAnswers((prev) => ({ ...prev, [q.id]: i }))}
                disabled={submitted}
              >
                <View style={[s.optionBubble, { borderColor: chosen ? Colors.primary : c.border, backgroundColor: chosen ? Colors.primary : "transparent" }]}>
                  {chosen && <View style={s.optionBubbleInner} />}
                </View>
                <Text style={[s.optionText, { color: c.text }]}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Fill in the blank */}
      {q.type === "fill-blank" && (
        <TextInput
          style={[s.fillInput, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
          placeholder="Your answer…"
          placeholderTextColor={c.subtext}
          value={fillAnswers[q.id] ?? ""}
          onChangeText={(t) => setFillAnswers((prev) => ({ ...prev, [q.id]: t }))}
          editable={!submitted}
        />
      )}

      {/* Open-ended */}
      {q.type === "open-ended" && (
        <TextInput
          style={[s.fillInput, { color: c.text, borderColor: c.border, backgroundColor: c.background, minHeight: 80 }]}
          placeholder="Your answer…"
          placeholderTextColor={c.subtext}
          value={fillAnswers[q.id] ?? ""}
          onChangeText={(t) => setFillAnswers((prev) => ({ ...prev, [q.id]: t }))}
          multiline
          textAlignVertical="top"
          editable={!submitted}
        />
      )}

      {/* Matching */}
      {q.type === "matching" && q.matchingPairs && shuffledDefs[q.id] && (
        <View style={s.matchingGrid}>
          {q.matchingPairs.map((pair, idx) => (
            <View key={idx} style={s.matchingRow}>
              <Text style={[s.matchingTerm, { color: c.text, borderColor: c.border }]}>{pair.term}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.matchingDefScroll}>
                {shuffledDefs[q.id].map((def) => {
                  const key = `${q.id}-${idx}`;
                  const chosen = matchingAnswers[key] === def;
                  return (
                    <TouchableOpacity
                      key={def}
                      style={[s.matchingDefBtn, { borderColor: chosen ? Colors.primary : c.border, backgroundColor: chosen ? "#EFF6FF" : c.card }]}
                      onPress={() => !submitted && setMatchingAnswers((prev) => ({ ...prev, [key]: def }))}
                      disabled={submitted}
                    >
                      <Text style={{ fontSize: 11, color: chosen ? Colors.primary : c.text }} numberOfLines={2}>{def}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Question Review (results) ─────────────────────────────────────────────────

function QuestionReview({
  q, qi, selectedAnswers, fillAnswers, matchingAnswers,
  overrides, onOverride, c,
}: {
  q: QuizQuestion; qi: number;
  selectedAnswers: Record<number, number>;
  fillAnswers: Record<number, string>;
  matchingAnswers: Record<string, string>;
  overrides: Record<number, boolean>;
  onOverride: (id: number, val: boolean) => void;
  c: typeof Colors.light;
}) {
  const s = makeStyles(c);
  let autoCorrect: boolean | null = null;
  if (q.type === "multiple-choice" || q.type === "true-false") {
    autoCorrect = selectedAnswers[q.id] === q.correctIndex;
  } else if (q.type === "fill-blank") {
    autoCorrect = normalizeAnswer(fillAnswers[q.id] ?? "") === normalizeAnswer(q.correctAnswer ?? "");
  } else if (q.type === "matching" && q.matchingPairs) {
    autoCorrect = q.matchingPairs.every((pair, idx) => matchingAnswers[`${q.id}-${idx}`] === pair.definition);
  }
  const isOverridden = q.id in overrides;
  const displayCorrect = isOverridden ? overrides[q.id] : autoCorrect;
  const isGradable = q.type !== "open-ended";

  const resultColor = displayCorrect === true ? Colors.success : displayCorrect === false ? Colors.danger : c.subtext;

  return (
    <View style={[s.qCard, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Text style={[s.qNum, { color: c.subtext }]}>Q{qi + 1}</Text>
        {isGradable && (
          <Text style={{ fontSize: 18 }}>{displayCorrect ? "✅" : "❌"}</Text>
        )}
      </View>
      <Text style={[s.qText, { color: c.text }]}>{q.question}</Text>

      {/* Your answer */}
      {q.type === "fill-blank" && (
        <Text style={[s.answerRow, { color: c.subtext }]}>
          Your answer: <Text style={{ color: resultColor, fontWeight: "600" }}>{fillAnswers[q.id] || "(blank)"}</Text>
          {" · "}Correct: <Text style={{ color: Colors.success, fontWeight: "600" }}>{q.correctAnswer}</Text>
        </Text>
      )}
      {(q.type === "multiple-choice" || q.type === "true-false") && q.options && (
        <Text style={[s.answerRow, { color: c.subtext }]}>
          Your answer: <Text style={{ color: resultColor, fontWeight: "600" }}>
            {selectedAnswers[q.id] != null ? q.options[selectedAnswers[q.id]] : "(none)"}
          </Text>
          {"\n"}Correct: <Text style={{ color: Colors.success, fontWeight: "600" }}>{q.options[q.correctIndex ?? 0]}</Text>
        </Text>
      )}
      {q.type === "open-ended" && q.modelAnswer && (
        <Text style={[s.answerRow, { color: c.subtext }]}>
          Model answer: <Text style={{ color: c.text }}>{q.modelAnswer}</Text>
        </Text>
      )}
      {q.type === "matching" && q.matchingPairs && (
        <View style={{ gap: 4, marginTop: 6 }}>
          {q.matchingPairs.map((pair, idx) => {
            const key = `${q.id}-${idx}`;
            const correct = matchingAnswers[key] === pair.definition;
            return (
              <Text key={idx} style={{ color: c.subtext, fontSize: 13 }}>
                <Text style={{ fontWeight: "600", color: c.text }}>{pair.term}</Text>
                {" → "}{matchingAnswers[key] ?? "(none)"}{" "}
                <Text style={{ color: correct ? Colors.success : Colors.danger }}>
                  {correct ? "✓" : `✗ (${pair.definition})`}
                </Text>
              </Text>
            );
          })}
        </View>
      )}

      {/* Explanation */}
      <Text style={[s.explanation, { color: c.subtext, borderTopColor: c.border }]}>{q.explanation}</Text>

      {/* Override button */}
      {isGradable && (
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <TouchableOpacity
            style={[s.overrideBtn, { borderColor: Colors.success, backgroundColor: isOverridden && overrides[q.id] ? Colors.success : "transparent" }]}
            onPress={() => onOverride(q.id, true)}
          >
            <Text style={{ color: isOverridden && overrides[q.id] ? "#fff" : Colors.success, fontSize: 12, fontWeight: "600" }}>
              {isOverridden && overrides[q.id] ? "↺ " : ""}Mark Correct
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.overrideBtn, { borderColor: Colors.danger, backgroundColor: isOverridden && !overrides[q.id] ? Colors.danger : "transparent" }]}
            onPress={() => onOverride(q.id, false)}
          >
            <Text style={{ color: isOverridden && !overrides[q.id] ? "#fff" : Colors.danger, fontSize: 12, fontWeight: "600" }}>
              {isOverridden && !overrides[q.id] ? "↺ " : ""}Mark Wrong
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const makeStyles = (c: typeof Colors.light) =>
  StyleSheet.create({
    container: { padding: 16, gap: 12 },
    heading: { fontSize: 20, fontWeight: "700" },
    modeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    modeCard: {
      width: "47%", borderRadius: 12, borderWidth: 2,
      padding: 12, alignItems: "center", gap: 6,
    },
    modeLabel: { fontSize: 13, fontWeight: "600", textAlign: "center" },
    countLabel: { fontSize: 15, fontWeight: "600", marginTop: 4 },
    countRow: { flexDirection: "row", gap: 10 },
    countBtn: {
      width: 52, height: 40, borderRadius: 8, borderWidth: 1,
      alignItems: "center", justifyContent: "center",
    },
    primaryBtn: {
      backgroundColor: Colors.primary, borderRadius: 12,
      paddingVertical: 14, alignItems: "center", marginTop: 4,
    },
    primaryBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
    scoreCard: {
      borderRadius: 16, borderWidth: 1, padding: 24,
      alignItems: "center", gap: 6,
    },
    scoreLabel: { fontSize: 14 },
    qCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
    qNum: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
    qText: { fontSize: 15, fontWeight: "600", lineHeight: 22 },
    optionList: { gap: 8 },
    option: {
      flexDirection: "row", alignItems: "center", gap: 10,
      borderWidth: 1.5, borderRadius: 10, padding: 12,
    },
    optionBubble: {
      width: 20, height: 20, borderRadius: 10, borderWidth: 2,
      alignItems: "center", justifyContent: "center",
    },
    optionBubbleInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" },
    optionText: { flex: 1, fontSize: 14 },
    fillInput: {
      borderWidth: 1, borderRadius: 10, padding: 12,
      fontSize: 14, minHeight: 44,
    },
    matchingGrid: { gap: 10 },
    matchingRow: { gap: 6 },
    matchingTerm: {
      fontSize: 13, fontWeight: "600",
      paddingVertical: 6, paddingHorizontal: 10,
      borderWidth: 1, borderRadius: 8,
    },
    matchingDefScroll: { flexGrow: 0 },
    matchingDefBtn: {
      borderWidth: 1.5, borderRadius: 8,
      padding: 8, marginRight: 8, maxWidth: 160,
    },
    answerRow: { fontSize: 13, lineHeight: 20 },
    explanation: {
      fontSize: 13, lineHeight: 19, color: "#6B7280",
      borderTopWidth: 1, paddingTop: 10,
    },
    overrideBtn: {
      borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
    },
  });
