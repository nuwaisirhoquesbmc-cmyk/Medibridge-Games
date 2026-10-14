export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  college: string;
  district: string;
  level: number;
  xp: number;
  coins: number;
  goldCoins?: number;
  rank: string;
  dailyStreak: number;
  lastActiveDate: string | null;
  questionsSolved: number;
  questionsCorrect: number;
  avatarUrl: string;
  role: "student" | "moderator" | "admin" | "superadmin";
  createdAt: any;
  characterId: string;
  isPremium?: boolean;
  premiumExpiry?: string | null;
  premiumType?: "monthly" | "6months" | null;
  pinnedRivalId?: string | null;
  completedChapters?: string[];
  phoneNumber?: string;
  enrolledBatches?: string[];
}

export interface Question {
  id: string;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  subject: "Biology" | "Chemistry" | "Physics" | "English" | "GK";
  chapter: string;
  topic?: string;
  difficulty: "Easy" | "Medium" | "Hard";
  source?: string;
  sourceExam?: string;
  sourceExamId?: string;
  batch?: string;
  batchId?: string;
  tags?: string[];
  practiceEligible?: boolean;
  liveExamStatus?: "active" | "completed" | "none";
  releaseDate?: string;
  createdAt?: any;
  createdBy?: string;
  category?: "Medical Standard Questions" | "High Yield Questions" | "Admission Special Questions" | "Chapter Final Questions" | "Daily Challenge Questions" | "Mock Test Questions" | "Boss Battle Questions" | "অনুশীলনী Questions" | string;
}

export type PracticeMode = 
  | "random"
  | "subject"
  | "chapter"
  | "topic"
  | "weakness"
  | "mistakes"
  | "live_exam_archive"
  | "custom";

export interface PracticeExamConfig {
  mode: PracticeMode;
  subjects: ("Biology" | "Chemistry" | "Physics" | "English" | "GK")[];
  chapter?: string;
  topic?: string;
  difficulty?: "All" | "Easy" | "Medium" | "Hard";
  questionCount: number;
  timePerQuestionSeconds?: number; // 0 for untimed
  durationMinutes?: number;
  negativeMarking: number; // 0.00, 0.25, 0.50
  instantExplanation: boolean; // true = instant explanation after each question, false = standard full exam mode
  sourceExamId?: string;
  sourceExamTitle?: string;
}

export interface PracticeAttemptQuestion {
  questionId: string;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  selectedAnswerIndex: number | null;
  isCorrect: boolean;
  timeSpentSeconds: number;
  explanation: string;
  subject: string;
  chapter: string;
  topic?: string;
  difficulty: string;
  source?: string;
  bookmarked?: boolean;
}

export interface PracticeAttemptRecord {
  id: string;
  userId: string;
  userName: string;
  title: string;
  mode: PracticeMode;
  subject: string;
  chapter: string;
  topic?: string;
  totalQuestions: number;
  attempted: number;
  correct: number;
  wrong: number;
  skipped: number;
  score: number;
  maxScore: number;
  accuracy: number;
  negativeMarking: number;
  timeTakenSeconds: number;
  xpEarned: number;
  coinsEarned: number;
  createdAt: string;
  questions: PracticeAttemptQuestion[];
}

export interface BattleSession {
  id: string;
  userId: string;
  battleType: "standard" | "boss" | "survival" | "challenge";
  opponentName: string;
  opponentMaxHp: number;
  opponentHp: number;
  playerMaxHp: number;
  playerHp: number;
  questionsCount: number;
  currentIndex: number;
  combo: number;
  goldEarned: number;
  xpEarned: number;
  status: "active" | "won" | "lost" | "fled";
  questionIds: string[];
  createdAt: any;
}

export interface FeedPost {
  id: string;
  userId: string;
  userDisplayName: string;
  userAvatar: string;
  userRank: string;
  content: string;
  achievementType?: string;
  streakCount?: number;
  likes: number;
  fires: number;
  claps: number;
  likedBy: string[];
  firedBy: string[];
  clappedBy: string[];
  createdAt: any;
  // Doubt properties
  isDoubt?: boolean;
  doubtSubject?: string;
  doubtChapter?: string;
  doubtImageUrl?: string;
  doubtSolved?: boolean;
}

export interface StudySquad {
  id: string;
  name: string;
  description: string;
  logoUrl: string;
  creatorId: string;
  teamXp: number;
  memberCount: number;
  members: string[]; // List of user IDs
  createdAt: any;
  motto?: string;
  level?: number;
  challengeProgress?: Record<string, number>;
  memberContributions?: Record<string, number>;
}

export interface SquadMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  resourceTitle?: string;
  resourceUrl?: string;
  resourceType?: "none" | "link" | "image" | "document" | "mnemonic";
  createdAt: any;
}

export interface AdminNotice {
  id: string;
  title: string;
  content: string;
  category: "news" | "update" | "announcement" | "event";
  important: boolean;
  createdAt: any;
  createdBy: string;
}

export interface MedicalCharacter {
  id: string;
  name: string;
  specialty: string;
  description: string;
  abilityName: string;
  abilityDesc: string;
  avatar: string;
  elementColor: string;
}

export const CHARACTERS: MedicalCharacter[] = [
  {
    id: "neuro_slasher",
    name: "Neuro Slasher",
    specialty: "Neurology",
    description: "Slashes through cognitive biases with razor-sharp synaptic pulses.",
    abilityName: "Action Potential",
    abilityDesc: "Ignores the first wrong answer in a battle once per round.",
    avatar: "🧠⚔️",
    elementColor: "text-purple-400 border-purple-500",
  },
  {
    id: "cardio_striker",
    name: "Cardio Striker",
    specialty: "Cardiology",
    description: "Keeps the heart pumping with massive rhythmic adrenaline strikes.",
    abilityName: "Adrenaline Surge",
    abilityDesc: "Earns double gold for a combo streak of 3 or more.",
    avatar: "❤️⚡",
    elementColor: "text-red-500 border-red-500",
  },
  {
    id: "immunoshield",
    name: "Immunoshield Knight",
    specialty: "Immunology",
    description: "Defends against pathogenic errors with an impenetrable HLA armor.",
    abilityName: "Phagocytosis",
    abilityDesc: "Reduces damage taken from wrong answers by 50%.",
    avatar: "🛡️🔬",
    elementColor: "text-emerald-400 border-emerald-500",
  },
  {
    id: "gene_hacker",
    name: "Gene Hacker",
    specialty: "Genetics & Biotech",
    description: "Rewrites DNA sequences to correct hereditary mistakes on the fly.",
    abilityName: "CRISPR Burst",
    abilityDesc: "Highlights and removes one wrong option automatically.",
    avatar: "🧬💻",
    elementColor: "text-cyan-400 border-cyan-500",
  },
  {
    id: "pharmacotox",
    name: "Surgeon Gladiator",
    specialty: "Surgery",
    description: "Exercises surgical precision under extreme, high-stress conditions.",
    abilityName: "Hemostasis",
    abilityDesc: "Gains +15 HP whenever defeating an enemy.",
    avatar: "🔪🩺",
    elementColor: "text-amber-500 border-amber-500",
  },
];

export const RANKS = [
  "Freshman",
  "Learner",
  "Aspirant",
  "Challenger",
  "Scholar",
  "Elite",
  "Medicalian",
  "Champion",
  "Grandmaster",
  "Medical Legend",
];

export const COLLEGES = [
  "Notre Dame College",
  "Rajuk Uttara Model College",
  "Holy Cross College",
  "Viqarunnisa Noon School & College",
  "Government Colleges",
];

export const DISTRICTS = [
  "Dhaka",
  "Barishal",
  "Chattogram",
  "Khulna",
  "Rajshahi",
  "Sylhet",
  "Rangpur",
  "Mymensingh",
];

export type SubjectType = "Biology" | "Chemistry" | "Physics" | "English" | "GK";
export type DifficultyType = "Easy" | "Medium" | "Hard";

export interface PaymentRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  selectedPlan: "monthly" | "6months" | "1year" | string;
  paymentMethod: "bKash" | "Nagad" | string;
  senderNumber: string;
  transactionId: string;
  amount: number;
  screenshotUrl?: string;
  submissionDate: string;
  status: "Pending" | "Approved" | "Rejected";
  adminNotes?: string;
  batchId?: string;
  batchTitle?: string;
}

export interface UserNotification {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: "payment_approved" | "payment_rejected" | string;
  read: boolean;
  createdAt: string;
}

export interface Advertisement {
  id: string;
  bannerUrl: string;
  title: string;
  description: string;
  destinationUrl: string;
  ctaText: string;
  openMode: "same" | "new";
  loginPopupEnabled: boolean;
  recurringPopupEnabled: boolean;
  targetAudience: "all" | "logged_in" | "guests";
  frequency: number; // in minutes
  delay: number; // in seconds
  autoCloseTime?: number; // in seconds, optional
  mediaType?: "image" | "video"; // media type of the ad
  width: string; // e.g., "500px" or "max-w-lg"
  height: string; // e.g., "auto" or "400px"
  status: "active" | "inactive";
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt?: string;
  impressionsCount?: number;
  clicksCount?: number;
}

export interface AdAnalyticsEvent {
  id: string;
  adId: string;
  type: "impression" | "click";
  userId?: string;
  sessionOrDevice: string;
  timestamp: string;
}

export interface PremiumFeature {
  id: string;
  titleEn: string;
  titleBn: string;
  descEn: string;
  descBn: string;
  icon: string;
  color: string;
}

export interface PremiumConfig {
  prices: {
    monthly: number;
    "6months": number;
    "1year": number;
  };
  features: PremiumFeature[];
}




