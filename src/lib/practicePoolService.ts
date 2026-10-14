import { Question, SubjectType, PracticeExamConfig, PracticeAttemptRecord, PracticeMode } from "../types";
import { STARTER_QUESTIONS } from "../questionsData";
import { MistakeBankItem, CourseExam } from "../types/courseTypes";
import { db } from "./backend";
import { collection, addDoc, serverTimestamp } from "./supabaseDb";

export interface ChapterTopicMap {
  [subject: string]: {
    [chapter: string]: string[];
  };
}

// Master Bangladeshi Medical Admission Curriculum Hierarchy
export const MAT_SYLLABUS_HIERARCHY: ChapterTopicMap = {
  Biology: {
    "কোষ ও এর গঠন": [
      "কোষ প্রাচীর ও প্লাজমামেমব্রেন",
      "সাইটোপ্লাজমীয় অঙ্গাণু (মাইটোকন্ড্রিয়া, প্লাস্টিড, রাইবোসোম)",
      "লাইসোসোম ও গলজি বডি",
      "ডিএনএ ও আরএনএ হেলিক্স গঠন",
      "ট্রান্সক্রিপশন ও ট্রান্সলেশন"
    ],
    "কোষ বিভাজন": [
      "মাইটোসিস মেটাকাইনেসিস ও পর্যায়সমূহ",
      "মিয়োসিস ১ ও ক্রসিং ওভার (কায়াজমা)",
      "কোষ চক্র ও চেকপয়েন্ট (G1, S, G2)",
      "ক্যান্সার ও অ্যাপোপটোসিস"
    ],
    "রক্ত ও রক্ত সংবহন": [
      "রক্তরস ও রক্তকণিকা (RBC, WBC, অনুচক্রিকা)",
      "রক্ত তঞ্চন ও ক্লটিং ফ্যাক্টরসমূহ",
      "হৃদপিণ্ডের গঠন ও কার্ডিয়াক চক্র",
      "রক্তচাপ, ব্যারোরিসেপ্টর ও পেসমেকার",
      "রক্তের গ্রুপ ও আরএইচ ফ্যাক্টর"
    ],
    "শ্বসন ও গ্যাস বিনিময়": [
      "নাসারন্ধ্র থেকে ফুসফুস অ্যালভিওলাই",
      "অক্সিজেন ও কার্বন ডাই অক্সাইড পরিবহন",
      "হ্যামবার্গার শিফট ও বোর প্রভাব",
      "শ্বসনের স্নায়বিক নিয়ন্ত্রণ ও ফুসফুসীয় রোগ"
    ],
    "উদ্ভিদ শারীরতত্ত্ব": [
      "খনিজ লবণ পরিশোষণ প্রক্রিয়া",
      "প্রস্বেদন ও পত্ররন্ধ্রীয় মেকানিজম",
      "সালোকসংশ্লেষণ (C3, C4 ও ক্র্যাঞ্জ এনাটমি)",
      "গ্লাইকোলাইসিস, ক্রিয়েবস চক্র ও ইটিএস"
    ],
    "জিনতত্ত্ব ও বিবর্তন": [
      "মেন্ডেলের প্রথম ও দ্বিতীয় সূত্র",
      "মেন্ডেলিয়ান বিচ্যুতি (পরিপূরক জিন, এপিস্ট্যাসিস)",
      "সেক্স লিঙ্কড ডিসঅর্ডার (হিমোফিলিয়া, বর্ণান্ধতা)",
      "ডারউইনিজম ও আধুনিক বিবর্তন তত্ত্ব"
    ],
    "মানব স্নায়ুতন্ত্র ও সংবেদী অঙ্গ": [
      "মস্তিষ্কের বিভিন্ন অংশ ও কাজ",
      "১২ জোড়া করোটিক স্নায়ু ও কাজ",
      "চোখের গঠন ও দৃষ্টির প্রতিসরণ কৌশল",
      "কানের গঠন ও ভারসাম্য রক্ষা"
    ],
    "পরিপাক ও শোষণ": [
      "মুখগহ্বর, পাকস্থলী ও অন্ত্রের পাচক রস",
      "যকৃৎ, পিত্তথলি ও অগ্ন্যাশয়",
      "কার্বোহাইড্রেট, প্রোটিন ও লিপিড পরিপাক",
      "স্থূলতা ও বিএমআই"
    ]
  },
  Chemistry: {
    "গুণগত রসায়ন": [
      "রাদারফোর্ড ও বোর পরমাণু মডেল",
      "কোয়ান্টাম সংখ্যা (n, l, m, s)",
      "আউফবাউ, পাউলি ও হুন্ডের নীতি",
      "দ্রাব্যতা গুণফল ও আয়নিক গুণফল",
      "শিখা পরীক্ষা ও বর্ণালী বিশ্লেষণ"
    ],
    "পর্যায় সারণি ও মৌলের পর্যায়বৃত্ত ধর্ম": [
      "পর্যায় ও গ্রুপভিত্তিক বৈশিষ্ট্য",
      "পারমাণবিক ব্যাসার্ধ ও গলনাঙ্ক",
      "আয়নীকরণ শক্তি ও ইলেকট্রন আসক্তি",
      "তড়িৎ ঋণাত্মকতা ও অক্সাইডের প্রকৃতি",
      "সংকরায়ন ও জটিল যৌগ"
    ],
    "জৈব রসায়ন": [
      "IUPAC নামকরণ ও সমাণুতা (গাঠনিক ও স্টেরিও)",
      "ইলেকট্রোফাইল ও নিউক্লিওফিলিক মেকানিজম",
      "অ্যালকেন, অ্যালকিন, অ্যালকাইন বিক্রিয়া",
      "বেনজিন ও অ্যারোমেটিক প্রতিস্থাপন",
      "অ্যালকোহল, অ্যালডিহাইড ও কিটোন শনাক্তকরণ",
      "পলিমার ও জৈব এসিড"
    ],
    "রাসায়নিক পরিবর্তন": [
      "লা-শাতেলিয়ার নীতি ও প্রভাবক",
      "সাম্যাবস্থা ও সাম্যধ্রুবক (Kp, Kc)",
      "pH ও pOH গণনা",
      "বাফার দ্রবণ ও হেন্ডারসন সমীকরণ",
      "গ্রিন কেমিস্ট্রি ও প্রভাবক"
    ],
    "তড়িৎ রসায়ন": [
      "তড়িৎ পরিবাহী ও গ্যালভানিক কোষ",
      "তড়িৎদ্বার বিভব ও নার্নস্ট সমীকরণ",
      "ফ্যারাডের তড়িৎ বিশ্লেষণ সূত্র",
      "লেড-এসিড ও লিথিয়াম আয়ন ব্যাটারি"
    ]
  },
  Physics: {
    "ভৌত জগৎ ও পরিমাপ": [
      "ভৌত রাশি, মাত্রা ও একক",
      "ভার্নিয়ার স্কেল ও স্ক্রু গজ ত্রুটি",
      "পরিমাপের অনিশ্চয়তা ও শতকরা ত্রুটি"
    ],
    "ভেক্টর": [
      "ভেক্টরের যোজন ও বিয়োজন",
      "ডট ও ক্রস গুণন",
      "লব্ধি ও সামান্তরিক সূত্র",
      "নদী ও নৌকার বেগ বিশ্লেষণ",
      "প্রাস ও গতিবিদ্যা"
    ],
    "গতিবিদ্যা ও নিউটনিয়ান বলবিদ্যা": [
      "গতির সমীকরণ ও মুক্তভাবে পতনশীল বস্তু",
      "নিউটনের গতিসূত্র ও ভরবেগ সংরক্ষণ",
      "ঘর্ষণ বল ও ব্যাংকিং কোণ",
      "জড়তার ভ্রামক ও চক্রগতির ব্যাসার্ধ",
      "টর্ক ও কৌণিক ভরবেগ"
    ],
    "কাজ, শক্তি ও ক্ষমতা": [
      "ধ্রুব ও পরিবর্তনশীল বল দ্বারা কাজ",
      "গতিশক্তি ও বিভব শক্তি",
      "কাজ-শক্তি উপপাদ্য ও শক্তি সংরক্ষণশীলতা",
      "ক্ষমতা ও কর্মদক্ষতা"
    ],
    "মহাকর্ষ ও অভিকর্ষ": [
      "নিউটনের মহাকর্ষ সূত্র",
      "অভিকর্ষজ ত্বরণ (g) এর পরিবর্তন",
      "মুক্তিবেগ ও কৃত্রিম উপগ্রহের গতি",
      "কেপলারের সূত্রাবলি"
    ],
    "পদার্থের গাঠনিক ধর্ম": [
      "হুকের সূত্র ও ইয়ং গুণাঙ্ক",
      "পৃষ্ঠটান ও স্পর্শ কোণ",
      "সান্দ্রতা ও স্টোকসের সূত্র",
      "প্রান্তিক বেগ"
    ],
    "তরঙ্গ ও আলো": [
      "সরল ছন্দিত স্পন্দন ও পর্যায়কাল",
      "অগ্রগামী ও স্থির তরঙ্গ",
      "শব্দের বেগ ও ডপলার প্রভাব",
      "প্রতিসরণ, পূর্ণ অভ্যন্তরীণ প্রতিফলন ও লেন্স"
    ]
  },
  GK: {
    "বাংলাদেশ ও মুক্তিযুদ্ধ": [
      "প্রাচীন বাংলার ইতিহাস ও জনপদ",
      "ভাষা আন্দোলন ও ১৯৫৪ সালের যুক্তফ্রন্ট",
      "১৯৬৬ সালের ৬ দফা ও ৬৯ এর গণঅভ্যুত্থান",
      "১৯৭১ সালের মুক্তিযুদ্ধ ও ১১টি সেক্টর",
      "বীরশ্রেষ্ঠ ও জাতীয় বীরবৃন্দ",
      "বাংলাদেশের সংবিধান ও শাসনব্যবস্থা",
      "ভৌগোলিক অবস্থান, নদ-নদী ও সীমানা"
    ],
    "আন্তর্জাতিক ও সাম্প্রতিক ঘটনাবলী": [
      "জাতিসংঘ ও প্রধান আন্তর্জাতিক সংস্থাসমূহ",
      "চিকিৎসা বিজ্ঞানের নোবেল ও বিশ্ব স্বাস্থ্য সংস্থা (WHO)",
      "আন্তর্জাতিক গুরুত্বপূর্ণ সীমারেখা ও রাজধানী",
      "সাম্প্রতিক স্বাস্থ্য ও বিজ্ঞান অগ্রগতি"
    ]
  },
  English: {
    "Grammar & Syntax": [
      "Parts of Speech (Identification & Usages)",
      "Right Form of Verbs & Subject-Verb Agreement",
      "Tense, Voice & Narration Transformation",
      "Prepositions (Appropriate Prepositions)",
      "Conditionals & Modifiers",
      "Clauses & Sentence Correction"
    ],
    "Vocabulary & Idioms": [
      "Synonyms & Antonyms (High Yield Medical Vocabulary)",
      "Idioms & Phrases",
      "Spelling Check & Confusing Words",
      "One Word Substitution"
    ]
  }
};

/**
 * Filter questions that are eligible for practice:
 * - `practiceEligible !== false`
 * - Not currently locked in an active live exam
 * - Scoped to course subjects / syllabus if courseId / courseSubjects provided
 */
export function getEligiblePracticePool(
  rawQuestions: Question[],
  liveExams: (CourseExam | any)[] = [],
  courseSubjects?: string[]
): Question[] {
  // Collect active live exam question IDs that must be temporarily hidden until completed
  const lockedQuestionIds = new Set<string>();
  
  if (Array.isArray(liveExams)) {
    const now = Date.now();
    liveExams.forEach((exam) => {
      // An exam is locked only while active and not completed and before its end time
      const isStillLive = exam.isActive && !exam.isCompleted && (!exam.endTime || new Date(exam.endTime).getTime() > now);
      if (isStillLive && Array.isArray(exam.questions)) {
        exam.questions.forEach((q: any) => {
          if (q.id) lockedQuestionIds.add(q.id);
        });
      }
    });
  }

  // Merge starter questions if raw questions is empty
  const basePool = rawQuestions && rawQuestions.length > 0
    ? rawQuestions
    : STARTER_QUESTIONS.map((q, idx) => ({
        id: `starter_${idx + 1}`,
        ...q,
        practiceEligible: true,
        topic: q.chapter || "General"
      })) as Question[];

  return basePool.filter((q) => {
    // Check practice eligibility
    if (q.practiceEligible === false) return false;
    // Check if locked in active live exam
    if (lockedQuestionIds.has(q.id)) return false;
    // Check basic completeness
    if (!q.questionText || !q.options || q.options.length < 2) return false;
    // Filter by course subjects if provided
    if (courseSubjects && courseSubjects.length > 0) {
      const match = courseSubjects.some((s) => s.toLowerCase() === (q.subject || "").toLowerCase());
      if (!match) return false;
    }
    return true;
  });
}

/**
 * Extract distinct subjects with counts from pool
 */
export function getSubjectStats(pool: Question[]) {
  const subjects: Record<string, { total: number; chapters: Set<string>; easy: number; medium: number; hard: number }> = {
    Biology: { total: 0, chapters: new Set(), easy: 0, medium: 0, hard: 0 },
    Chemistry: { total: 0, chapters: new Set(), easy: 0, medium: 0, hard: 0 },
    Physics: { total: 0, chapters: new Set(), easy: 0, medium: 0, hard: 0 },
    GK: { total: 0, chapters: new Set(), easy: 0, medium: 0, hard: 0 },
    English: { total: 0, chapters: new Set(), easy: 0, medium: 0, hard: 0 }
  };

  pool.forEach((q) => {
    const sub = q.subject || "Biology";
    if (!subjects[sub]) {
      subjects[sub] = { total: 0, chapters: new Set(), easy: 0, medium: 0, hard: 0 };
    }
    subjects[sub].total++;
    if (q.chapter) subjects[sub].chapters.add(q.chapter);
    if (q.difficulty === "Easy") subjects[sub].easy++;
    else if (q.difficulty === "Hard") subjects[sub].hard++;
    else subjects[sub].medium++;
  });

  return Object.entries(subjects).map(([subject, data]) => ({
    subject,
    total: data.total,
    chapterCount: data.chapters.size,
    easy: data.easy,
    medium: data.medium,
    hard: data.hard
  }));
}

/**
 * Extract distinct chapters for a given subject from pool and syllabus
 */
export function getChaptersForSubject(pool: Question[], subject: string): string[] {
  const chaptersInPool = new Set<string>();
  pool.forEach((q) => {
    if (q.subject?.toLowerCase() === subject.toLowerCase() && q.chapter) {
      chaptersInPool.add(q.chapter.trim());
    }
  });

  // Also include chapters from curriculum hierarchy
  const hierarchyChapters = MAT_SYLLABUS_HIERARCHY[subject]
    ? Object.keys(MAT_SYLLABUS_HIERARCHY[subject])
    : [];

  const combined = Array.from(new Set([...Array.from(chaptersInPool), ...hierarchyChapters]));
  return combined.filter(Boolean);
}

/**
 * Extract distinct topics for a chapter
 */
export function getTopicsForChapter(pool: Question[], subject: string, chapter: string): string[] {
  const topicsInPool = new Set<string>();
  pool.forEach((q) => {
    if (
      q.subject?.toLowerCase() === subject.toLowerCase() &&
      q.chapter?.toLowerCase() === chapter.toLowerCase() &&
      q.topic
    ) {
      topicsInPool.add(q.topic.trim());
    }
  });

  const hierarchyTopics = MAT_SYLLABUS_HIERARCHY[subject]?.[chapter] || [];
  const combined = Array.from(new Set([...Array.from(topicsInPool), ...hierarchyTopics]));
  return combined.length > 0 ? combined : ["সাধারণ ও হাই-ইয়েল্ড টপিকসমূহ"];
}

/**
 * Shuffle helper (Fisher-Yates)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Core Practice Exam Generator
 */
export function generatePracticeExam(
  pool: Question[],
  config: PracticeExamConfig,
  mistakes: MistakeBankItem[] = [],
  completedLiveExams: any[] = []
): { title: string; questions: Question[]; config: PracticeExamConfig } {
  let candidatePool = [...pool];
  let generatedTitle = "Unlimited Practice Exam";

  switch (config.mode) {
    case "random": {
      generatedTitle = `MAT Random Mega Practice (${config.questionCount} MCQs)`;
      if (config.difficulty && config.difficulty !== "All") {
        candidatePool = candidatePool.filter((q) => q.difficulty === config.difficulty);
      }
      break;
    }

    case "subject": {
      const targetSubjects = config.subjects.length > 0 ? config.subjects : ["Biology"];
      candidatePool = candidatePool.filter((q) =>
        targetSubjects.some((s) => s.toLowerCase() === q.subject?.toLowerCase())
      );
      if (config.difficulty && config.difficulty !== "All") {
        candidatePool = candidatePool.filter((q) => q.difficulty === config.difficulty);
      }
      generatedTitle = `${targetSubjects.join(" & ")} Drill (${config.questionCount} MCQs)`;
      break;
    }

    case "chapter": {
      const sub = config.subjects[0] || "Biology";
      const chap = config.chapter || "General";
      candidatePool = candidatePool.filter(
        (q) =>
          q.subject?.toLowerCase() === sub.toLowerCase() &&
          (chap === "All" || q.chapter?.toLowerCase().includes(chap.toLowerCase()) || chap.toLowerCase().includes(q.chapter?.toLowerCase() || ""))
      );
      if (config.difficulty && config.difficulty !== "All") {
        candidatePool = candidatePool.filter((q) => q.difficulty === config.difficulty);
      }
      generatedTitle = `${sub} - ${chap} Chapter Test`;
      break;
    }

    case "topic": {
      const sub = config.subjects[0] || "Biology";
      const chap = config.chapter || "General";
      const top = config.topic || "All";
      candidatePool = candidatePool.filter(
        (q) =>
          q.subject?.toLowerCase() === sub.toLowerCase() &&
          (chap === "All" || q.chapter?.toLowerCase().includes(chap.toLowerCase())) &&
          (top === "All" || (q.topic && q.topic.toLowerCase().includes(top.toLowerCase())))
      );
      generatedTitle = `${chap} • ${top} Precision Practice`;
      break;
    }

    case "weakness": {
      // Prioritize chapters where mistakes occurred
      const mistakeChapters = new Set(mistakes.map((m) => m.chapter?.toLowerCase()).filter(Boolean));
      const weakPool = candidatePool.filter((q) => mistakeChapters.has(q.chapter?.toLowerCase()));
      
      if (weakPool.length >= config.questionCount) {
        candidatePool = weakPool;
      } else {
        // Blend weak pool with general pool
        const otherPool = candidatePool.filter((q) => !mistakeChapters.has(q.chapter?.toLowerCase()));
        candidatePool = [...weakPool, ...otherPool];
      }
      generatedTitle = `AI Weakness Repair Session (${config.questionCount} MCQs)`;
      break;
    }

    case "mistakes": {
      // Convert mistakes to Question objects
      if (mistakes.length > 0) {
        const mistakeQuestions: Question[] = mistakes.map((m) => ({
          id: m.questionId || m.id,
          questionText: m.questionText,
          options: m.options,
          correctAnswerIndex: m.correctAnswerIndex,
          explanation: m.explanation || "আবুল হাসান / হাজারী নাগ স্যারের বইয়ের রেফারেন্স অনুসারে সঠিক উত্তর।",
          subject: (m.subject as any) || "Biology",
          chapter: m.chapter || "General",
          difficulty: "Medium",
          source: "Mistake Bank Revision",
          practiceEligible: true
        }));
        candidatePool = mistakeQuestions;
      }
      generatedTitle = `Mistake Bank Re-test (${Math.min(config.questionCount, candidatePool.length)} MCQs)`;
      break;
    }

    case "live_exam_archive": {
      if (config.sourceExamId) {
        const foundExam = completedLiveExams.find((e) => e.id === config.sourceExamId);
        if (foundExam && Array.isArray(foundExam.questions) && foundExam.questions.length > 0) {
          candidatePool = foundExam.questions.map((q: any, idx: number) => ({
            id: q.id || `archive_${foundExam.id}_${idx}`,
            questionText: q.questionText,
            options: q.options,
            correctAnswerIndex: q.correctAnswerIndex ?? 0,
            explanation: q.explanation || "বিগত লাইভ মডেল টেস্ট সমাধান ও বইয়ের রেফারেন্স।",
            subject: q.subject || foundExam.subject || "Biology",
            chapter: q.chapter || "Full Syllabus",
            difficulty: q.difficulty || "Medium",
            source: foundExam.title || "Past Live Exam Archive",
            practiceEligible: true
          }));
          generatedTitle = `Live Archive: ${foundExam.title}`;
        }
      }
      break;
    }

    case "custom": {
      if (config.subjects && config.subjects.length > 0) {
        candidatePool = candidatePool.filter((q) =>
          config.subjects.some((s) => s.toLowerCase() === q.subject?.toLowerCase())
        );
      }
      if (config.chapter && config.chapter !== "All") {
        candidatePool = candidatePool.filter((q) =>
          q.chapter?.toLowerCase().includes(config.chapter!.toLowerCase())
        );
      }
      if (config.difficulty && config.difficulty !== "All") {
        candidatePool = candidatePool.filter((q) => q.difficulty === config.difficulty);
      }
      generatedTitle = `Custom Practice Test (${config.questionCount} MCQs)`;
      break;
    }
  }

  // Shuffle and take required count
  const shuffled = shuffleArray(candidatePool);
  const selected = shuffled.slice(0, Math.min(config.questionCount, shuffled.length));

  // If selected pool is empty or too small, fill from general pool
  if (selected.length < config.questionCount && pool.length > selected.length) {
    const existingIds = new Set(selected.map((q) => q.id));
    const extra = shuffleArray(pool.filter((q) => !existingIds.has(q.id))).slice(
      0,
      config.questionCount - selected.length
    );
    selected.push(...extra);
  }

  return {
    title: generatedTitle,
    questions: selected,
    config
  };
}

/**
 * Save practice attempt to local storage and optionally Firestore
 */
export async function savePracticeAttemptRecord(
  attempt: PracticeAttemptRecord,
  userId?: string
): Promise<void> {
  try {
    // 1. Save to LocalStorage for instant offline retrieval
    const key = `medibridge_practice_attempts_${userId || "guest"}`;
    const existing = localStorage.getItem(key);
    const list: PracticeAttemptRecord[] = existing ? JSON.parse(existing) : [];
    list.unshift(attempt);
    // Keep max 50 recent attempts
    if (list.length > 50) list.pop();
    localStorage.setItem(key, JSON.stringify(list));

    // 2. Save to Firestore collection "practice_attempts" if user logged in
    if (userId && userId !== "guest") {
      await addDoc(collection(db, "practice_attempts"), {
        ...attempt,
        createdAtServer: serverTimestamp()
      });
    }
  } catch (err) {
    console.warn("Failed to persist practice attempt to cloud:", err);
  }
}

/**
 * Load practice attempts history
 */
export function getLocalPracticeAttempts(userId?: string): PracticeAttemptRecord[] {
  try {
    const key = `medibridge_practice_attempts_${userId || "guest"}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}
