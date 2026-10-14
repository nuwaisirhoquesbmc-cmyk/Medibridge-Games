import { Question } from "../types";

export type QuestionSubject = "Biology" | "Chemistry" | "Physics" | "English" | "GK" | string;
export type QuestionDifficulty = "Easy" | "Medium" | "Hard";
export type QuestionStatus = "active" | "archived" | "draft";
export type QuestionAvailability = "global" | "course_specific";
export type QuestionTypeFormat = "single_mcq" | "multiple_mcq" | "assertion_reason" | "case_study";

export interface ExamUsageReference {
  examId: string;
  examTitle: string;
  courseId?: string;
  courseName?: string;
  examDate?: string;
  isPublished?: boolean;
  batchName?: string;
}

export interface BankQuestion {
  id: string;
  code?: string; // e.g. "Q001", "Q-BIO-042"
  questionText: string;
  imageUrl?: string;
  options: string[];
  correctAnswerIndex: number;
  explanation?: string;
  subject: QuestionSubject;
  chapter: string;
  topic?: string;
  difficulty: QuestionDifficulty;
  questionType?: QuestionTypeFormat;
  marks?: number;
  negativeMarks?: number;
  source?: string;
  tags?: string[];
  status: QuestionStatus;
  availability: QuestionAvailability;
  allowedCourseIds?: string[];
  usageCount: number;
  usedInExams?: ExamUsageReference[];
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface QuestionBankStats {
  totalQuestions: number;
  biologyCount: number;
  chemistryCount: number;
  physicsCount: number;
  gkCount: number;
  englishCount: number;
  usedCount: number;
  unusedCount: number;
  archivedCount: number;
}

export interface QuestionFilterOptions {
  search: string;
  subject: string;
  chapter: string;
  topic: string;
  difficulty: string;
  questionType: string;
  usageStatus: "all" | "used" | "unused";
  status: "all" | "active" | "archived" | "draft";
  availability: "all" | "global" | "course_specific";
  courseId?: string;
  sortBy: "newest" | "oldest" | "most_used" | "least_used" | "code" | "difficulty";
}

export interface ExamQuestionSelectionItem {
  question: BankQuestion;
  selected: boolean;
  orderIndex: number;
  customMarks?: number;
  customNegativeMarks?: number;
}
