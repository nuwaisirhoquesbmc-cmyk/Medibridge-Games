import migratedQuestionsRaw from "../data/migrated_data/questions.json";
import migratedCoursesRaw from "../data/migrated_data/courses.json";
import migratedBatchesRaw from "../data/migrated_data/batches.json";
import migratedNoticesRaw from "../data/migrated_data/notices.json";
import migratedSettingsRaw from "../data/migrated_data/settings.json";
import migratedPostsRaw from "../data/migrated_data/posts.json";
import migratedSquadsRaw from "../data/migrated_data/squads.json";
import migratedAdsRaw from "../data/migrated_data/advertisements.json";
import { Question, AdminNotice } from "../types";
import { Course, Batch } from "../types/courseTypes";
import { INITIAL_COURSES, MOCK_BATCHES } from "../data/coursesData";
import { supabase } from "./supabase";

// In-memory singletons backed by local storage and Supabase
const STORAGE_KEYS = {
  QUESTIONS: "mb_migrated_questions_v2",
  COURSES: "mb_migrated_courses_v2",
  BATCHES: "mb_migrated_batches_v2",
  NOTICES: "mb_migrated_notices_v2",
  SETTINGS: "mb_migrated_settings_v2",
  POSTS: "mb_migrated_posts_v2",
  SQUADS: "mb_migrated_squads_v2",
  ADS: "mb_migrated_ads_v2",
};

/**
 * 1. Get All Questions (2,393 Migrated Firebase Questions + Local Admin Additions)
 */
export function getMigratedQuestions(): Question[] {
  try {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch {}

  const baseQuestions: Question[] = (migratedQuestionsRaw as any[]).map((q, idx) => ({
    id: q.id || `q_migrated_${idx}`,
    questionText: q.questionText || "",
    options: Array.isArray(q.options) ? q.options : [],
    correctAnswerIndex: typeof q.correctAnswerIndex === "number" ? q.correctAnswerIndex : 0,
    explanation: q.explanation || "",
    subject: q.subject || "Biology",
    chapter: q.chapter || "সাধারণ জ্ঞান",
    difficulty: q.difficulty || "Medium",
    source: q.source || "Medical Admission Question Bank",
    category: q.category || "Medical Standard Questions",
    createdBy: q.createdBy || "Admin",
    createdAt: q.createdAt || new Date().toISOString(),
  }));

  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(baseQuestions));
    }
  } catch {}

  return baseQuestions;
}

/**
 * Add or update question in Supabase store
 */
export function saveMigratedQuestion(question: Question): Question[] {
  const current = getMigratedQuestions();
  const existingIdx = current.findIndex((q) => q.id === question.id);
  let updated: Question[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = question;
  } else {
    updated = [question, ...current];
  }

  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("mb_questions_updated", { detail: { question } }));
    }
  } catch {}

  // Attempt async sync to Supabase questions if table exists
  try {
    Promise.resolve(
      supabase.from("questions").upsert({
        id: question.id,
        question_text: question.questionText,
        options: question.options,
        correct_answer: question.correctAnswerIndex,
        explanation: question.explanation,
        subject: question.subject,
        chapter: question.chapter,
        difficulty: question.difficulty,
      })
    ).catch(() => {});
  } catch {}

  return updated;
}

/**
 * 2. Get Migrated Courses
 */
export function getMigratedCourses(): Course[] {
  try {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEYS.COURSES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch {}

  const base: Course[] = (migratedCoursesRaw as any[]).map((c, idx) => {
    const template = INITIAL_COURSES.find((item) => item.id === c.id || item.slug === c.id) || INITIAL_COURSES[idx] || INITIAL_COURSES[0];
    return {
      ...template,
      ...c,
      id: c.id,
      title: c.title || template.title,
      slug: c.slug || c.id || template.slug,
      shortDescription: c.shortDescription || c.description || template.shortDescription,
      fullDescription: c.fullDescription || c.description || template.fullDescription,
      thumbnail: c.thumbnail || c.thumbnail_url || template.thumbnail,
      originalPrice: c.originalPrice || c.price || template.originalPrice,
      discountedPrice: c.discountedPrice || c.discount_price || template.discountedPrice,
      isPublished: c.is_published ?? c.isPublished ?? template.isPublished
    };
  });

  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(base));
    }
  } catch {}

  return base;
}

/**
 * 3. Get Migrated Batches
 */
export function getMigratedBatches(): Batch[] {
  try {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEYS.BATCHES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch {}

  const base: Batch[] = (migratedBatchesRaw as any[]).map((b, idx) => {
    const template = MOCK_BATCHES.find((m) => m.id === b.id) || MOCK_BATCHES[idx] || MOCK_BATCHES[0];
    return {
      ...template,
      ...b,
      id: b.id,
      courseId: b.courseId || b.course_id || template.courseId,
      name: b.name || b.batchName || template.name,
      batchName: b.batchName || b.name || template.batchName,
      startDate: b.startDate || b.start_date || template.startDate,
      endDate: b.endDate || b.end_date || template.endDate
    };
  });

  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.BATCHES, JSON.stringify(base));
    }
  } catch {}

  return base;
}

/**
 * 4. Get Migrated Notices
 */
export function getMigratedNotices(): AdminNotice[] {
  try {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEYS.NOTICES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch {}

  const base: AdminNotice[] = (migratedNoticesRaw as any[]).map((n) => ({
    id: n.id,
    title: n.title || "Notice",
    content: n.content || "",
    category: (n.category || "announcement") as any,
    important: n.important ?? true,
    createdAt: n.createdAt || new Date().toISOString(),
    createdBy: n.createdBy || "Admin",
  }));

  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.NOTICES, JSON.stringify(base));
    }
  } catch {}

  return base;
}

/**
 * 5. Get Migrated Settings by key (e.g. gaming_arena, platform, payment, etc.)
 */
export function getMigratedSetting<T = any>(settingId: string, fallbackDefault?: T): T {
  try {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`${STORAGE_KEYS.SETTINGS}_${settingId}`);
      if (stored) {
        return JSON.parse(stored) as T;
      }
    }
  } catch {}

  const found = (migratedSettingsRaw as any[]).find((s) => s.id === settingId);
  if (found) {
    const { id, ...rest } = found;
    return rest as T;
  }

  return fallbackDefault as T;
}

/**
 * Save Setting to local storage and sync to Supabase
 */
export function saveMigratedSetting(settingId: string, data: any): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(`${STORAGE_KEYS.SETTINGS}_${settingId}`, JSON.stringify(data));
      window.dispatchEvent(new CustomEvent("mb_setting_updated", { detail: { settingId, data } }));
    }
  } catch {}

  // Attempt async sync to Supabase settings
  try {
    Promise.resolve(
      supabase.from("settings").upsert({
        id: settingId,
        payload: data,
        updated_at: new Date().toISOString()
      })
    ).catch(() => {});
  } catch {}
}

/**
 * 6. Get Migrated Posts (Social Feed)
 */
export function getMigratedPosts(): any[] {
  try {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEYS.POSTS);
      if (stored) return JSON.parse(stored);
    }
  } catch {}
  return migratedPostsRaw as any[];
}

/**
 * 7. Get Migrated Ads
 */
export function getMigratedAds(): any[] {
  try {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEYS.ADS);
      if (stored) return JSON.parse(stored);
    }
  } catch {}
  return migratedAdsRaw as any[];
}
