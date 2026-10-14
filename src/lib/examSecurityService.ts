import { db } from "./backend";
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp, onSnapshot, query, limit } from "./supabaseDb";
import { LiveExamSecuritySettings, ExamViolationRecord } from "../types/courseTypes";

export const DEFAULT_SECURITY_SETTINGS: LiveExamSecuritySettings = {
  tabSwitchDetection: true,
  maxAllowedViolations: 3,
  autoSubmitOnMaxViolations: true,
  warningMessageBn: "আপনি পরীক্ষার পেজ থেকে বের হয়ে গেছেন। পরীক্ষার সময় অন্য Tab বা Window ব্যবহার করা অনুমোদিত নয়।",
  warningMessageEn: "You have left the active exam window. Switching tabs or applications during a live exam is strictly restricted.",
  violationMessageBn: "পরীক্ষার সময় বারবার Exam Tab থেকে বের হওয়ার কারণে আপনার পরীক্ষা স্বয়ংক্রিয়ভাবে Submit করা হয়েছে।",
  violationMessageEn: "Your exam was automatically submitted due to repeated tab switching/focus loss violations.",
};

/**
 * Fetch or stream Live Exam Security Settings from Firestore
 */
export function subscribeToExamSecuritySettings(
  callback: (settings: LiveExamSecuritySettings) => void
) {
  try {
    const docRef = doc(db, "settings", "live_exam_security");
    return onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<LiveExamSecuritySettings>;
          callback({
            ...DEFAULT_SECURITY_SETTINGS,
            ...data,
          });
        } else {
          callback(DEFAULT_SECURITY_SETTINGS);
        }
      },
      (err) => {
        console.warn("Could not subscribe to live exam security settings:", err);
        callback(DEFAULT_SECURITY_SETTINGS);
      }
    );
  } catch (error) {
    console.warn("Failed to listen to exam security settings:", error);
    callback(DEFAULT_SECURITY_SETTINGS);
    return () => {};
  }
}

/**
 * Save updated Live Exam Security Settings (Admin only)
 */
export async function saveExamSecuritySettings(
  settings: Partial<LiveExamSecuritySettings>,
  updatedBy: string = "Admin"
): Promise<boolean> {
  try {
    const docRef = doc(db, "settings", "live_exam_security");
    await setDoc(
      docRef,
      {
        ...settings,
        updatedAt: new Date().toISOString(),
        updatedBy,
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.error("Failed to save live exam security settings:", error);
    return false;
  }
}

/**
 * Record an exam violation to Firestore and local telemetry
 */
export async function logExamViolation(params: {
  examAttemptId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  examId: string;
  examTitle: string;
  violationType: "TAB_SWITCH" | "WINDOW_BLUR" | "PAGE_HIDDEN" | "APP_BACKGROUND" | string;
  violationCount: number;
  maxAllowed: number;
}): Promise<ExamViolationRecord> {
  const timestamp = new Date().toISOString();
  const violationRecord: ExamViolationRecord = {
    id: `viol_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    exam_attempt_id: params.examAttemptId,
    student_id: params.studentId,
    student_name: params.studentName || "Aspirant",
    student_email: params.studentEmail || "",
    exam_id: params.examId,
    exam_title: params.examTitle,
    violation_type: params.violationType,
    violation_count: params.violationCount,
    max_allowed: params.maxAllowed,
    timestamp,
    device_info: typeof navigator !== "undefined" ? navigator.userAgent : "Unknown",
  };

  try {
    await addDoc(collection(db, "exam_violations"), {
      ...violationRecord,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("Could not save exam violation to Firestore:", err);
  }

  return violationRecord;
}

/**
 * Subscribe to all live exam violations (Admin dashboard audit trail)
 */
export function subscribeToExamViolations(
  callback: (violations: ExamViolationRecord[]) => void
) {
  try {
    const q = query(collection(db, "exam_violations"), limit(60));
    return onSnapshot(
      q,
      (snapshot) => {
        const violations: ExamViolationRecord[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as any;
          violations.push({
            id: d.id,
            exam_attempt_id: data.exam_attempt_id || data.examAttemptId || "",
            student_id: data.student_id || data.studentId || "",
            student_name: data.student_name || data.studentName || "Aspirant",
            student_email: data.student_email || data.studentEmail || "",
            exam_id: data.exam_id || data.examId || "",
            exam_title: data.exam_title || data.examTitle || "Live Model Test",
            violation_type: data.violation_type || data.violationType || "TAB_SWITCH",
            violation_count: data.violation_count ?? data.violationCount ?? 1,
            max_allowed: data.max_allowed ?? data.maxAllowed ?? 3,
            timestamp: data.timestamp || new Date().toISOString(),
            device_info: data.device_info || data.deviceInfo || "",
          });
        });
        // Sort newest first
        violations.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        callback(violations);
      },
      (err) => {
        console.warn("Could not listen to exam violations:", err);
        callback([]);
      }
    );
  } catch (error) {
    console.warn("Failed to subscribe to exam violations:", error);
    callback([]);
    return () => {};
  }
}
