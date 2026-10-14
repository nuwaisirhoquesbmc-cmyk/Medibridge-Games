import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
  initializeFirestore,
  disableNetwork,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  collection
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";
import { Question } from "./types";
import { supabase } from "./lib/supabase";

const app = initializeApp(firebaseConfig);

// Initialize Firestore instance for type compatibility, but immediately disconnect network
export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
  },
  firebaseConfig.firestoreDatabaseId
);

// CRITICAL: Explicitly terminate & disconnect Firebase Firestore network connection.
// All application queries are routed to Supabase PostgreSQL and local synchronized store.
try {
  disableNetwork(db).catch(() => {});
} catch (e) {}

export const isFirebaseConnected = false;
export const isFirebaseDisconnected = true;
export const activeBackend = "supabase";

export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({ prompt: "select_account" });

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

/**
 * Detects whether an error is caused by Firestore resource exhaustion or quota limits
 */
export function isQuotaExceededError(_error: unknown): boolean {
  // With Firebase disconnected, quota is never an issue
  return false;
}

/**
 * Returns false always because Firebase is completely disconnected and Supabase is active
 */
export function isFirestoreQuotaExceeded(): boolean {
  return false;
}

/**
 * No-op quota setter because Firebase is disconnected
 */
export function setFirestoreQuotaExhausted(_reason?: string): void {
  // No-op: Supabase is active backend
}

/**
 * Helper to retrieve cached data from localStorage
 */
export function getCachedFirestoreData<T>(key: string, _maxAgeMs = 15 * 60 * 1000): T | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(`mb_fscache_${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.__mb_cached_at) {
      return parsed as T;
    }
    return parsed.data as T;
  } catch {
    return null;
  }
}

/**
 * Helper to write data to localStorage with timestamp
 */
export function setCachedFirestoreData<T>(key: string, data: T): void {
  try {
    if (typeof window === "undefined") return;
    const envelope = {
      __mb_cached_at: Date.now(),
      data
    };
    localStorage.setItem(`mb_fscache_${key}`, JSON.stringify(envelope));
  } catch {}
}

/**
 * Safe fetcher that loads from cache/fallback without hitting disconnected Firebase
 */
export async function safeFirestoreFetch<T>(options: {
  cacheKey?: string;
  ttlMs?: number;
  fallback: T;
  fetcher: () => Promise<T>;
}): Promise<T> {
  const { cacheKey, fallback } = options;

  if (cacheKey) {
    const cached = getCachedFirestoreData<T>(cacheKey);
    if (cached !== null) {
      return cached;
    }
  }

  // With Firebase disconnected, return fallback or local data instantly
  return fallback;
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): void {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
    },
    operationType,
    path,
  };
  console.info("[Disconnected Firebase Adapter Notice]: ", JSON.stringify(errInfo));
}

export async function logQuestionMistake(userId: string, question: Question): Promise<void> {
  if (!userId || !question || !question.id) return;
  
  // 1. Update localStorage
  const localKey = `medibridge_incorrect_questions_${userId}`;
  let localQuestions: Record<string, Question> = {};
  try {
    const saved = localStorage.getItem(localKey);
    if (saved) {
      localQuestions = JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to parse local incorrect questions:", e);
  }
  
  localQuestions[question.id] = question;
  localStorage.setItem(localKey, JSON.stringify(localQuestions));
  
  // 2. Sync to Supabase mistake bank asynchronously
  try {
    Promise.resolve(
      supabase.from("mistake_bank").upsert({
        user_id: userId,
        question_id: question.id,
        question_payload: question,
        recorded_at: new Date().toISOString()
      })
    ).catch(() => {});
  } catch (error) {
    console.warn("Could not sync incorrect question to Supabase:", error);
  }
}

export async function removeQuestionMistake(userId: string, questionId: string): Promise<void> {
  if (!userId || !questionId) return;
  
  // 1. Update localStorage
  const localKey = `medibridge_incorrect_questions_${userId}`;
  try {
    const saved = localStorage.getItem(localKey);
    if (saved) {
      const localQuestions = JSON.parse(saved);
      if (localQuestions[questionId]) {
        delete localQuestions[questionId];
        localStorage.setItem(localKey, JSON.stringify(localQuestions));
      }
    }
  } catch (e) {
    console.error("Failed to update local incorrect questions on remove:", e);
  }
  
  // 2. Remove from Supabase
  try {
    Promise.resolve(
      supabase.from("mistake_bank").delete().match({ user_id: userId, question_id: questionId })
    ).catch(() => {});
  } catch (error) {
    console.warn("Could not delete incorrect question from Supabase:", error);
  }
}

export async function getIncorrectQuestions(userId: string): Promise<Question[]> {
  if (!userId) return [];
  
  const localKey = `medibridge_incorrect_questions_${userId}`;
  let localQuestions: Record<string, Question> = {};
  try {
    const saved = localStorage.getItem(localKey);
    if (saved) {
      localQuestions = JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to parse local incorrect questions:", e);
  }
  
  return Object.values(localQuestions);
}
