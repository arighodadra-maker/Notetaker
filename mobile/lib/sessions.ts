import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { NoteFormat, Session } from "@/lib/types";

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

const FORMAT_LABELS: Record<NoteFormat, string> = {
  bullet: "Bullet Points",
  cornell: "Cornell Notes",
  flashcards: "Flashcards",
  "study-guide": "Study Guide",
  flowchart: "Flowchart",
  mindmap: "Mind Map",
  diagrams: "Diagrams",
};

const SKIP_WORDS = new Set([
  "cues", "notes", "summary", "question", "answer", "flashcards",
  "key concepts", "main points", "overview", "introduction",
  "flowchart", "mindmap", "mind map", "diagrams",
]);

export function makeTitle(format: NoteFormat, notes: string): string {
  const label = FORMAT_LABELS[format];
  const isHtml = notes.trimStart().startsWith("<");
  const plain = isHtml ? stripHtml(notes) : notes;
  const lines = plain.split(/\n+/);
  const firstLine = lines
    .map((l) => l.replace(/^#+\s*/, "").replace(/[*_`]/g, "").trim())
    .find((l) => l.length > 2 && !SKIP_WORDS.has(l.toLowerCase()));
  const snippet = firstLine ? ` · ${firstLine.slice(0, 40)}` : "";
  return `${label}${snippet}`;
}

export async function loadSessions(userId: string): Promise<Session[]> {
  const q = query(
    collection(db, "users", userId, "sessions"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      title: data.title ?? makeTitle(data.format, data.notes ?? ""),
      format: data.format,
      notes: data.notes ?? "",
      transcript: data.transcript ?? "",
      subjectId: data.subjectId,
      unitId: data.unitId,
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
    };
  });
}

export async function deleteSession(userId: string, sessionId: string): Promise<void> {
  await deleteDoc(doc(db, "users", userId, "sessions", sessionId));
}
