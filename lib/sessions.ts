import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { NoteFormat } from "@/lib/prompts";

export interface Session {
  id: string;
  title: string;
  format: NoteFormat;
  notes: string;
  transcript: string;
  subjectId?: string;
  unitId?: string;
  createdAt: Date;
}

export interface Unit {
  id: string;
  name: string;
  createdAt: Date;
}

export interface Subject {
  id: string;
  name: string;
  color: string;
  units: Unit[];
  createdAt: Date;
}

export const SUBJECT_COLOR_CYCLE = [
  "blue", "purple", "green", "amber", "pink", "teal", "rose", "indigo",
] as const;

const FORMAT_LABELS: Record<NoteFormat, string> = {
  bullet: "Bullet Points",
  cornell: "Cornell Notes",
  flashcards: "Flashcards",
  "study-guide": "Study Guide",
  flowchart: "Flowchart",
  mindmap: "Mind Map",
  diagrams: "Flowchart + Mind Map",
};

// Section-header words that appear as first lines in structured formats but
// carry no descriptive information about the actual content.
const SKIP_WORDS = new Set([
  "cues", "notes", "summary", "question", "answer", "flashcards",
  "key concepts", "main points", "overview", "introduction",
  "flowchart", "mindmap", "mind map", "diagrams",
]);

/** Derive a short title from the notes content. */
function makeTitle(format: NoteFormat, notes: string): string {
  const label = FORMAT_LABELS[format];
  const firstLine = notes
    .split("\n")
    .map((l) => l.replace(/^#+\s*/, "").replace(/[*_`]/g, "").trim())
    .find((l) => l.length > 2 && !SKIP_WORDS.has(l.toLowerCase()));
  const snippet = firstLine ? ` · ${firstLine.slice(0, 40)}` : "";
  return `${label}${snippet}`;
}

export async function saveSession(
  userId: string,
  format: NoteFormat,
  notes: string,
  transcript: string
): Promise<string> {
  const ref = collection(db, "users", userId, "sessions");
  const docRef = await addDoc(ref, {
    title: makeTitle(format, notes),
    format,
    notes,
    transcript,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function loadSessions(userId: string): Promise<Session[]> {
  const ref = collection(db, "users", userId, "sessions");
  const q = query(ref, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      title: data.title,
      format: data.format,
      notes: data.notes,
      transcript: data.transcript,
      subjectId: data.subjectId ?? undefined,
      unitId: data.unitId ?? undefined,
      createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
    };
  });
}

export async function deleteSession(userId: string, sessionId: string): Promise<void> {
  await deleteDoc(doc(db, "users", userId, "sessions", sessionId));
}

export async function updateSessionFolder(
  userId: string,
  sessionId: string,
  subjectId: string | null,
  unitId: string | null
): Promise<void> {
  await updateDoc(doc(db, "users", userId, "sessions", sessionId), {
    subjectId: subjectId ?? null,
    unitId: unitId ?? null,
  });
}

// ── Subjects ──────────────────────────────────────────────────────────────────

export async function loadSubjects(userId: string): Promise<Subject[]> {
  const ref = collection(db, "users", userId, "subjects");
  const q = query(ref, orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  const subjects: Subject[] = [];
  for (const d of snap.docs) {
    const data = d.data();
    const unitsRef = collection(db, "users", userId, "subjects", d.id, "units");
    const unitsQ = query(unitsRef, orderBy("createdAt", "asc"));
    const unitsSnap = await getDocs(unitsQ);
    const units: Unit[] = unitsSnap.docs.map((u) => ({
      id: u.id,
      name: u.data().name as string,
      createdAt: (u.data().createdAt as Timestamp)?.toDate() ?? new Date(),
    }));
    subjects.push({
      id: d.id,
      name: data.name as string,
      color: data.color as string,
      units,
      createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
    });
  }
  return subjects;
}

export async function createSubject(
  userId: string,
  name: string,
  color: string
): Promise<string> {
  const ref = collection(db, "users", userId, "subjects");
  const docRef = await addDoc(ref, { name, color, createdAt: serverTimestamp() });
  return docRef.id;
}

export async function renameSubject(
  userId: string,
  subjectId: string,
  name: string
): Promise<void> {
  await updateDoc(doc(db, "users", userId, "subjects", subjectId), { name });
}

export async function deleteSubject(userId: string, subjectId: string): Promise<void> {
  // Delete all units first
  const unitsRef = collection(db, "users", userId, "subjects", subjectId, "units");
  const unitsSnap = await getDocs(unitsRef);
  await Promise.all(unitsSnap.docs.map((u) => deleteDoc(u.ref)));
  await deleteDoc(doc(db, "users", userId, "subjects", subjectId));
}

// ── Units ─────────────────────────────────────────────────────────────────────

export async function createUnit(
  userId: string,
  subjectId: string,
  name: string
): Promise<string> {
  const ref = collection(db, "users", userId, "subjects", subjectId, "units");
  const docRef = await addDoc(ref, { name, createdAt: serverTimestamp() });
  return docRef.id;
}

export async function renameUnit(
  userId: string,
  subjectId: string,
  unitId: string,
  name: string
): Promise<void> {
  await updateDoc(
    doc(db, "users", userId, "subjects", subjectId, "units", unitId),
    { name }
  );
}

export async function deleteUnit(
  userId: string,
  subjectId: string,
  unitId: string
): Promise<void> {
  await deleteDoc(doc(db, "users", userId, "subjects", subjectId, "units", unitId));
}
