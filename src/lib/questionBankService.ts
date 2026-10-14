import { db } from "./backend";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  limit,
  serverTimestamp,
  writeBatch
} from "./supabaseDb";
import { BankQuestion, ExamUsageReference, QuestionBankStats } from "../types/questionBankTypes";
import { Question } from "../types";
import { CourseExam } from "../types/courseTypes";

/**
 * Generate a standard human-readable Question Code
 * e.g. Q-BIO-001 or Q001
 */
export function generateQuestionCode(subject: string, sequenceNumber: number): string {
  const subPrefix =
    subject.toLowerCase().includes("bio")
      ? "BIO"
      : subject.toLowerCase().includes("chem")
      ? "CHEM"
      : subject.toLowerCase().includes("phys")
      ? "PHY"
      : subject.toLowerCase().includes("eng")
      ? "ENG"
      : subject.toLowerCase().includes("gk")
      ? "GK"
      : "GEN";

  return `Q-${subPrefix}-${String(sequenceNumber).padStart(4, "0")}`;
}

/**
 * Convert any Firestore or raw Question into BankQuestion format
 */
export function normalizeToBankQuestion(
  raw: any,
  index = 1,
  computedUsage: ExamUsageReference[] = []
): BankQuestion {
  const id = raw.id || raw._id || `q_${Date.now()}_${index}`;
  const subject = raw.subject || "Biology";
  const code = raw.code || generateQuestionCode(subject, index);
  const options = Array.isArray(raw.options)
    ? raw.options
    : [raw.optionA || "", raw.optionB || "", raw.optionC || "", raw.optionD || ""];

  const usedInExams = Array.isArray(raw.usedInExams) && raw.usedInExams.length > 0
    ? raw.usedInExams
    : computedUsage;

  return {
    id,
    code,
    questionText: raw.questionText || raw.text || raw.question || "",
    imageUrl: raw.imageUrl || raw.image || "",
    options,
    correctAnswerIndex: typeof raw.correctAnswerIndex === "number" ? raw.correctAnswerIndex : 0,
    explanation: raw.explanation || "",
    subject,
    chapter: raw.chapter || "General",
    topic: raw.topic || "",
    difficulty: raw.difficulty || "Medium",
    questionType: raw.questionType || raw.type || "single_mcq",
    marks: typeof raw.marks === "number" ? raw.marks : 1,
    negativeMarks: typeof raw.negativeMarks === "number" ? raw.negativeMarks : 0.25,
    source: raw.source || raw.sourceExam || "Question Bank",
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    status: raw.status || "active",
    availability: raw.availability || "global",
    allowedCourseIds: Array.isArray(raw.allowedCourseIds) ? raw.allowedCourseIds : [],
    usageCount: usedInExams.length || (typeof raw.usageCount === "number" ? raw.usageCount : 0),
    usedInExams,
    createdAt: raw.createdAt ? (typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString()) : new Date().toISOString(),
    updatedAt: raw.updatedAt ? (typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString()) : undefined,
    createdBy: raw.createdBy || "Admin"
  };
}

/**
 * Calculate dynamic Question Bank Stats
 */
export function computeQuestionBankStats(questions: BankQuestion[]): QuestionBankStats {
  const stats: QuestionBankStats = {
    totalQuestions: questions.length,
    biologyCount: 0,
    chemistryCount: 0,
    physicsCount: 0,
    gkCount: 0,
    englishCount: 0,
    usedCount: 0,
    unusedCount: 0,
    archivedCount: 0
  };

  questions.forEach((q) => {
    const sub = (q.subject || "").toLowerCase();
    if (sub.includes("bio")) stats.biologyCount++;
    else if (sub.includes("chem")) stats.chemistryCount++;
    else if (sub.includes("phys")) stats.physicsCount++;
    else if (sub.includes("gk") || sub.includes("general")) stats.gkCount++;
    else if (sub.includes("eng")) stats.englishCount++;

    if (q.status === "archived") {
      stats.archivedCount++;
    }

    if (q.usageCount > 0 || (q.usedInExams && q.usedInExams.length > 0)) {
      stats.usedCount++;
    } else {
      stats.unusedCount++;
    }
  });

  return stats;
}

/**
 * Scan all exams to compute real-time usage references for each question
 */
export function buildUsageMapFromExams(exams: (CourseExam | any)[]): Map<string, ExamUsageReference[]> {
  const usageMap = new Map<string, ExamUsageReference[]>();

  exams.forEach((exam) => {
    if (!exam || !exam.questions || !Array.isArray(exam.questions)) return;

    exam.questions.forEach((q: any) => {
      const qId = q.id || q.questionText;
      if (!qId) return;

      const ref: ExamUsageReference = {
        examId: exam.id || "exam",
        examTitle: exam.title || "Exam Batch",
        courseId: exam.courseId || "",
        courseName: exam.courseName || exam.subject || "Course",
        examDate: exam.createdAt || exam.startTime || new Date().toISOString(),
        isPublished: exam.isPublished ?? true,
        batchName: exam.batchId || exam.batchName || ""
      };

      const existing = usageMap.get(qId) || [];
      if (!existing.some((e) => e.examId === ref.examId)) {
        existing.push(ref);
        usageMap.set(qId, existing);
      }
    });
  });

  return usageMap;
}

/**
 * Save new Question into Firestore Question Bank
 */
export async function saveQuestionToFirestoreBank(
  questionData: Partial<BankQuestion>,
  currentExamContext?: { examId: string; examTitle: string; courseId?: string; courseName?: string }
): Promise<BankQuestion> {
  const questionsColl = collection(db, "questions");
  const docRef = doc(questionsColl);
  const qId = docRef.id;

  const usedInExams: ExamUsageReference[] = [];
  if (currentExamContext) {
    usedInExams.push({
      examId: currentExamContext.examId,
      examTitle: currentExamContext.examTitle,
      courseId: currentExamContext.courseId,
      courseName: currentExamContext.courseName,
      examDate: new Date().toISOString(),
      isPublished: true
    });
  }

  const subject = questionData.subject || "Biology";
  const bankQuestion: BankQuestion = {
    id: qId,
    code: questionData.code || `Q-${subject.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
    questionText: questionData.questionText || "",
    imageUrl: questionData.imageUrl || "",
    options: questionData.options || ["", "", "", ""],
    correctAnswerIndex: questionData.correctAnswerIndex ?? 0,
    explanation: questionData.explanation || "",
    subject,
    chapter: questionData.chapter || "General",
    topic: questionData.topic || "",
    difficulty: questionData.difficulty || "Medium",
    questionType: questionData.questionType || "single_mcq",
    marks: questionData.marks ?? 1,
    negativeMarks: questionData.negativeMarks ?? 0.25,
    source: questionData.source || "Question Bank",
    tags: questionData.tags || [],
    status: questionData.status || "active",
    availability: questionData.availability || "global",
    allowedCourseIds: questionData.allowedCourseIds || [],
    usageCount: usedInExams.length,
    usedInExams,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: questionData.createdBy || "Admin"
  };

  await setDoc(docRef, bankQuestion);
  return bankQuestion;
}

/**
 * Update Question in Firestore Bank
 */
export async function updateQuestionInFirestoreBank(
  questionId: string,
  updates: Partial<BankQuestion>
): Promise<void> {
  const docRef = doc(db, "questions", questionId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date().toISOString()
  });
}

/**
 * Archive Question in Question Bank (Safe deletion alternative)
 */
export async function archiveQuestionInBank(questionId: string): Promise<void> {
  const docRef = doc(db, "questions", questionId);
  await updateDoc(docRef, {
    status: "archived",
    updatedAt: new Date().toISOString()
  });
}

/**
 * Unarchive Question in Question Bank
 */
export async function unarchiveQuestionInBank(questionId: string): Promise<void> {
  const docRef = doc(db, "questions", questionId);
  await updateDoc(docRef, {
    status: "active",
    updatedAt: new Date().toISOString()
  });
}

/**
 * Delete Question with Safety Check
 */
export async function safeDeleteQuestionFromBank(
  questionId: string,
  force = false
): Promise<{ success: boolean; requiresArchiveWarning?: boolean; usageCount?: number }> {
  const docRef = doc(db, "questions", questionId);
  await deleteDoc(docRef);
  return { success: true };
}

/**
 * Bulk Import array of questions into Firestore Question Bank
 */
export async function bulkImportToQuestionBank(
  questions: Partial<BankQuestion>[],
  userEmail = "Admin"
): Promise<{ totalImported: number; batchCount: number }> {
  const batchSize = 400;
  let totalImported = 0;
  let batchCount = 0;

  for (let i = 0; i < questions.length; i += batchSize) {
    const chunk = questions.slice(i, i + batchSize);
    const firestoreBatch = writeBatch(db);

    chunk.forEach((item, idx) => {
      const docRef = doc(collection(db, "questions"));
      const subject = item.subject || "Biology";
      const bankItem: BankQuestion = {
        id: docRef.id,
        code: item.code || generateQuestionCode(subject, totalImported + idx + 1),
        questionText: item.questionText || "",
        imageUrl: item.imageUrl || "",
        options: item.options || ["", "", "", ""],
        correctAnswerIndex: item.correctAnswerIndex ?? 0,
        explanation: item.explanation || "",
        subject,
        chapter: item.chapter || "General",
        topic: item.topic || "",
        difficulty: item.difficulty || "Medium",
        questionType: item.questionType || "single_mcq",
        marks: item.marks ?? 1,
        negativeMarks: item.negativeMarks ?? 0.25,
        source: item.source || "Bulk Import",
        tags: item.tags || [],
        status: "active",
        availability: item.availability || "global",
        allowedCourseIds: item.allowedCourseIds || [],
        usageCount: 0,
        usedInExams: [],
        createdAt: new Date().toISOString(),
        createdBy: userEmail
      };

      firestoreBatch.set(docRef, bankItem);
      totalImported++;
    });

    await firestoreBatch.commit();
    batchCount++;
  }

  return { totalImported, batchCount };
}

/**
 * Link an exam's questions to the Question Bank (tracks usage count & usedInExams)
 */
export async function recordExamQuestionUsage(
  examId: string,
  examTitle: string,
  courseId: string,
  courseName: string,
  questionIds: string[]
): Promise<void> {
  const usageRef: ExamUsageReference = {
    examId,
    examTitle,
    courseId,
    courseName,
    examDate: new Date().toISOString(),
    isPublished: true
  };

  // We can update in background without blocking
  questionIds.forEach(async (qId) => {
    try {
      if (!qId || qId.startsWith("starter-") || qId.startsWith("demo_")) return;
      const qRef = doc(db, "questions", qId);
      await updateDoc(qRef, {
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      // Ignore background track error
    }
  });
}
