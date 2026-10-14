import { supabase } from "./supabase";
import { Question } from "../types";

import { db, collection, doc, setDoc, deleteDoc, getDocs } from "./supabaseDb";

export { db };

export const activeBackend = "supabase";

let currentAuthUser: { id: string; email?: string | null } | null = null;
supabase.auth.onAuthStateChange((_event, session) => {
  currentAuthUser = session?.user ? { id: session.user.id, email: session.user.email } : null;
});

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface DataErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: { userId?: string | null; email?: string | null };
}

export function isQuotaExceededError(_error: unknown): boolean {
  return false;
}

export function isFirestoreQuotaExceeded(): boolean {
  return false;
}

export function setFirestoreQuotaExhausted(_reason?: string): void {}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const info: DataErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: { userId: currentAuthUser?.id ?? null, email: currentAuthUser?.email ?? null },
    operationType,
    path,
  };
  console.warn("[Supabase data error]:", JSON.stringify(info));
}

const mistakeKey = (userId: string) => `medibridge_incorrect_questions_${userId}`;

function readLocalMistakes(userId: string): Record<string, Question> {
  try {
    const saved = localStorage.getItem(mistakeKey(userId));
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

const mistakesCollection = (userId: string) => collection(db, "users", userId, "incorrectQuestions");

export async function logQuestionMistake(userId: string, question: Question): Promise<void> {
  if (!userId || !question?.id) return;
  const local = readLocalMistakes(userId);
  local[question.id] = question;
  localStorage.setItem(mistakeKey(userId), JSON.stringify(local));
  try {
    await setDoc(doc(mistakesCollection(userId), question.id), { ...question, recordedAt: Date.now() });
  } catch (error) {
    console.warn("Could not sync incorrect question to Supabase:", error);
  }
}

export async function removeQuestionMistake(userId: string, questionId: string): Promise<void> {
  if (!userId || !questionId) return;
  const local = readLocalMistakes(userId);
  if (local[questionId]) {
    delete local[questionId];
    localStorage.setItem(mistakeKey(userId), JSON.stringify(local));
  }
  try {
    await deleteDoc(doc(mistakesCollection(userId), questionId));
  } catch (error) {
    console.warn("Could not delete incorrect question from Supabase:", error);
  }
}

export async function getIncorrectQuestions(userId: string): Promise<Question[]> {
  if (!userId) return [];
  const local = readLocalMistakes(userId);
  const snapshot = await getDocs(mistakesCollection(userId));
  snapshot.forEach((d) => {
    if (!local[d.id]) {
      const { recordedAt: _recordedAt, ...question } = d.data();
      local[d.id] = { ...(question as Question), id: d.id };
    }
  });
  return Object.values(local);
}
