import { Question } from "../../types";

export interface GameMetadata {
  id: string;
  title: string;
  titleBn: string;
  subtitle: string;
  subtitleBn: string;
  description: string;
  descriptionBn: string;
  category: "action" | "racing" | "sports" | "battle" | "puzzle" | "clinical";
  icon: string;
  badgeColor: string;
  difficulty: "Easy" | "Medium" | "Hard" | "All Levels";
  xpMultiplier: number;
  coinReward: number;
  popular?: boolean;
  featured?: boolean;
  minDurationSeconds: number;
}

export interface GameScoreResult {
  gameId: string;
  gameTitle: string;
  score: number;
  correctAnswers: number;
  wrongAnswers: number;
  totalQuestions: number;
  accuracy: number;
  xpEarned: number;
  coinsEarned: number;
  timeSpentSeconds: number;
  comboMax: number;
  mistakes: {
    question: Question;
    userChoice: number;
  }[];
}

export interface GameAchievement {
  id: string;
  title: string;
  titleBn: string;
  description: string;
  descriptionBn: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
  rewardCoins: number;
  rewardXp: number;
}

export interface DailyGamingMission {
  id: string;
  title: string;
  titleBn: string;
  targetGame: string;
  targetCount: number;
  currentCount: number;
  rewardCoins: number;
  rewardXp: number;
  completed: boolean;
}

export const MEDICAL_GAMES: GameMetadata[] = [
  {
    id: "med-runner",
    title: "MedRunner: Bio Sprint",
    titleBn: "মেড-রানার: বায়ো স্প্রিন্ট",
    subtitle: "Endless Runner through Bloodstream",
    subtitleBn: "রক্তনালী দিয়ে এন্ডলেস রান ও সঠিক এমসিকিউ সংগ্রহ",
    description: "Dash through arteries, leap over cholesterol plaques, and grab correct answer enzymes to maintain speed!",
    descriptionBn: "ধমনীর ভেতর দিয়ে দৌড়াও, প্লাক ও বাধা অতিক্রম করো এবং সঠিক উত্তর সংগ্রহ করে হাই-স্পিড ধরে রাখো!",
    category: "action",
    icon: "🏃‍♂️",
    badgeColor: "from-red-600 to-rose-700",
    difficulty: "All Levels",
    xpMultiplier: 1.5,
    coinReward: 80,
    featured: true,
    minDurationSeconds: 90,
  },
  {
    id: "bio-slice",
    title: "BioSlice: Cell Ninja",
    titleBn: "বায়ো-স্লাইস: সেল নিনজা",
    subtitle: "Fruit & Cell Slicing Mastery",
    subtitleBn: "সঠিক অর্গানেল ও বায়ো-স্ট্রাকচার স্লাইস করো",
    description: "Slash the correct organelle, drug molecule, and cells flying on screen. Avoid slicing hazardous biological bombs!",
    descriptionBn: "স্ক্রিনে ভেসে ওঠা সঠিক অঙ্গাণু ও অণু দ্রুত স্লাইস করো। ক্ষতিকর বায়োলজিক্যাল বোমা এড়িয়ে চলো!",
    category: "action",
    icon: "⚔️",
    badgeColor: "from-emerald-600 to-teal-700",
    difficulty: "Medium",
    xpMultiplier: 1.4,
    coinReward: 75,
    popular: true,
    minDurationSeconds: 60,
  },
  {
    id: "med-race",
    title: "MedRace: Nitro Pharma Grand Prix",
    titleBn: "মেড-রেস: নাইট্রো ফার্মা গ্রাঁ প্রি",
    subtitle: "High-Speed Formula Racing",
    subtitleBn: "তড়িৎ গতিতে সঠিক উত্তর দিয়ে প্রতিদ্বন্দ্বীদের পেছনে ফেলো",
    description: "Answer rapid pharmacology and biochemistry MCQs to inject Nitro Boost into your medical supercar!",
    descriptionBn: "ফার্মাকোলজি ও বায়োকেমিস্ট্রির সঠিক উত্তর দিয়ে নাইট্রো বুস্ট অন করো এবং ট্র্যাকে সবার আগে পৌঁছাও!",
    category: "racing",
    icon: "🏎️",
    badgeColor: "from-amber-500 to-orange-700",
    difficulty: "Hard",
    xpMultiplier: 1.8,
    coinReward: 100,
    featured: true,
    minDurationSeconds: 120,
  },
  {
    id: "med-cricket",
    title: "MedCricket: Super Six Biology",
    titleBn: "মেড-ক্রিকেট: সুপার সিক্স বায়োলজি",
    subtitle: "T20 Power Play Admission Blast",
    subtitleBn: "প্রতিটি কঠিন প্রশ্নে ছক্কা ও চার হাঁকাও",
    description: "Face fast-paced bouncers & yorkers! Pick the right medical answer before the ball crosses the crease to hit sixes!",
    descriptionBn: "মেডিকেল ভর্তি পরীক্ষার প্রশ্নে বিশাল ছক্কা হাঁকিয়ে টার্গেট রান চেজ করো এবং ম্যাচ উইনার হও!",
    category: "sports",
    icon: "🏏",
    badgeColor: "from-blue-600 to-indigo-700",
    difficulty: "Medium",
    xpMultiplier: 1.5,
    coinReward: 85,
    popular: true,
    minDurationSeconds: 90,
  },
  {
    id: "med-soccer",
    title: "MedSoccer: Penalty Shootout Anatomy",
    titleBn: "মেড-সকার: পেনাল্টি শুটআউট অ্যানাটমি",
    subtitle: "Golden Boot Clinical Challenge",
    subtitleBn: "প্যাথোজেন গোলকিপারকে পরাস্ত করে গোল দাও",
    description: "Aim precisely and blast goals against the Pathogen Goalkeeper by correctly identifying anatomy structures!",
    descriptionBn: "অ্যানাটমির সঠিক অপশন নির্বাচন করে টপ কর্নারে বুলেট শটে গোল করো!",
    category: "sports",
    icon: "⚽",
    badgeColor: "from-green-600 to-emerald-800",
    difficulty: "Easy",
    xpMultiplier: 1.3,
    coinReward: 70,
    minDurationSeconds: 60,
  },
  {
    id: "cell-clash",
    title: "Cell Clash: Immune Boss Raid",
    titleBn: "সেল ক্ল্যাশ: ইমিউন বস রেইড",
    subtitle: "RPG Tactical Immune Combat",
    subtitleBn: "ম্যাক্রোফেজ ও অ্যান্টিবডি নিয়ে ড্রাগ-রেজিস্ট্যান্ট ভাইরাস বস ধ্বংস করো",
    description: "Command Macrophages, Killer T-Cells, and Antibodies to neutralize mutant Superbug Bosses with correct answers!",
    descriptionBn: "ইমিউন সেল আর্মি ডিপ্লয় করে মাল্টি-ফেজ ব্যাকটেরিয়া ও ভাইরাস বসদের বধ করো!",
    category: "battle",
    icon: "🛡️",
    badgeColor: "from-purple-600 to-violet-800",
    difficulty: "Hard",
    xpMultiplier: 2.0,
    coinReward: 120,
    featured: true,
    minDurationSeconds: 150,
  },
  {
    id: "speed-drill",
    title: "Speed Drill: 60s Blitz",
    titleBn: "স্পিড ড্রিল: ৬০ সেকেন্ড ব্লিৎজ",
    subtitle: "Rapid Fire Admission Reflexes",
    subtitleBn: "৬০ সেকেন্ডে সর্বোচ্চ সঠিক উত্তরের ঝড় তোলো",
    description: "Race the countdown clock! High-speed medical questions test your neural processing and recall speed under pressure.",
    descriptionBn: "প্রতি সেকেন্ডে তাৎক্ষণিক ডিসিশন মেকিং ও কম্বো মাল্টিপ্লায়ার দিয়ে হাই-স্কোর রেকর্ড গড়ো!",
    category: "puzzle",
    icon: "⚡",
    badgeColor: "from-yellow-500 to-amber-600",
    difficulty: "Medium",
    xpMultiplier: 1.6,
    coinReward: 90,
    popular: true,
    minDurationSeconds: 60,
  },
  {
    id: "med-memory",
    title: "MedMemory: Flip & Match",
    titleBn: "মেড-মেমোরি: কার্ড ফ্লিপ ম্যাচ",
    subtitle: "Visual Medical Memory Grid",
    subtitleBn: "অর্গান, ড্রাগ ও রিঅ্যাকশন কার্ড জোড়া মেলাও",
    description: "Flip and match pairs of organs, symptoms, chemical formulas, and medical roots to boost spatial memory!",
    descriptionBn: "ভিজুয়াল কার্ড ফ্লিপ করে দ্রুততম সময়ে জোড়া ম্যাচ করে মস্তিষ্কের স্মৃতিশক্তি শাণিত করো!",
    category: "puzzle",
    icon: "🧠",
    badgeColor: "from-pink-600 to-rose-700",
    difficulty: "Easy",
    xpMultiplier: 1.2,
    coinReward: 65,
    minDurationSeconds: 60,
  },
  {
    id: "clinical-er",
    title: "Clinical ER: Triage Doctor Sim",
    titleBn: "ক্লিনিক্যাল ইআর: ট্রায়াজ ডক্টর সিম",
    subtitle: "Emergency Ward Clinical Simulation",
    subtitleBn: "জরুরি বিভাগে আসা রোগীদের লক্ষণ দেখে দ্রুত সঠিক চিকিৎসা দাও",
    description: "Patients are arriving at the ER! Read symptoms, solve diagnostic MCQs, and prescribe life-saving treatments in real-time.",
    descriptionBn: "ইমার্জেন্সি কেস হিস্ট্রি দেখে দ্রুত ডায়াগনোসিস ও রাইট ড্রাগ সিলেক্ট করে প্রাণ বাঁচাও!",
    category: "clinical",
    icon: "🏥",
    badgeColor: "from-cyan-600 to-blue-700",
    difficulty: "Hard",
    xpMultiplier: 1.9,
    coinReward: 110,
    featured: true,
    minDurationSeconds: 120,
  },
  {
    id: "med-word",
    title: "MedWord: Term Scramble",
    titleBn: "মেড-ওয়ার্ড: অ্যানাটমিক্যাল টার্ম স্ক্র্যাম্বল",
    subtitle: "Medical Terminology Puzzle",
    subtitleBn: "অক্ষর সাজিয়ে বায়োলজিক্যাল ও মেডিকেল টার্ম উদ্ধার করো",
    description: "Unscramble medical terminology, Latin anatomical names, and chemical formulas with contextual clues!",
    descriptionBn: "ক্লু দেখে এলোমেলো অক্ষর সাজিয়ে সঠিক মেডিকেল শব্দ তৈরি করো এবং ভোকাবুলারি স্ট্রং করো!",
    category: "puzzle",
    icon: "🔤",
    badgeColor: "from-teal-600 to-emerald-700",
    difficulty: "Medium",
    xpMultiplier: 1.3,
    coinReward: 70,
    minDurationSeconds: 90,
  },
];

export const INITIAL_ACHIEVEMENTS: GameAchievement[] = [
  {
    id: "first_win",
    title: "First Clinical Victory",
    titleBn: "প্রথম জয়",
    description: "Complete your first game in the Arena with >70% accuracy",
    descriptionBn: "গেমিং অ্যারেনায় ৭০%+ এক্যুরেসি নিয়ে প্রথম গেম সমাপ্ত করো",
    icon: "🎖️",
    unlocked: true,
    progress: 1,
    maxProgress: 1,
    rewardCoins: 100,
    rewardXp: 200,
  },
  {
    id: "speed_demon",
    title: "Synapse Overdrive",
    titleBn: "সাইনাপ্স ওভারড্রাইভ",
    description: "Score 15+ correct answers in Speed Drill Blitz",
    descriptionBn: "স্পিড ড্রিল ৬০ সেকেন্ডে ১৫+ সঠিক উত্তর দাও",
    icon: "⚡",
    unlocked: false,
    progress: 8,
    maxProgress: 15,
    rewardCoins: 250,
    rewardXp: 400,
  },
  {
    id: "boss_slayer",
    title: "Pathogen Annihilator",
    titleBn: "প্যাথোজেন ধ্বংসকারী",
    description: "Defeat 3 Bosses in Cell Clash Immune Raid",
    descriptionBn: "সেল ক্ল্যাশে ৩টি ভাইরাস বা ব্যাকটেরিয়া বস বধ করো",
    icon: "👑",
    unlocked: false,
    progress: 1,
    maxProgress: 3,
    rewardCoins: 350,
    rewardXp: 600,
  },
  {
    id: "perfect_streak",
    title: "Flawless Diagnosis",
    titleBn: "নিখুঁত ডায়াগনোসিস",
    description: "Achieve a 10-question combo streak without any wrong answer",
    descriptionBn: "না থেমে একটানা ১০টি প্রশ্নের সঠিক উত্তর দিয়ে কম্বো স্ট্রিক গড়ো",
    icon: "🔥",
    unlocked: false,
    progress: 6,
    maxProgress: 10,
    rewardCoins: 200,
    rewardXp: 350,
  },
  {
    id: "grand_master",
    title: "Arena Grandmaster",
    titleBn: "অ্যারেনা গ্র্যান্ডমাস্টার",
    description: "Play at least 5 different game types in your enrolled batch",
    descriptionBn: "ব্যাচের ভেতর ৫টি ভিন্ন গেমিং মোড সফলভাবে খেলো",
    icon: "🏆",
    unlocked: false,
    progress: 3,
    maxProgress: 5,
    rewardCoins: 500,
    rewardXp: 1000,
  },
];

export const INITIAL_DAILY_MISSIONS: DailyGamingMission[] = [
  {
    id: "dm_1",
    title: "Play 1 MedRunner Sprint",
    titleBn: "মেড-রানার স্প্রিন্ট ১ বার খেলো",
    targetGame: "med-runner",
    targetCount: 1,
    currentCount: 0,
    rewardCoins: 50,
    rewardXp: 100,
    completed: false,
  },
  {
    id: "dm_2",
    title: "Score 5 Goals in MedSoccer Anatomy",
    titleBn: "মেড-সকার অ্যানাটমিতে ৫টি গোল করো",
    targetGame: "med-soccer",
    targetCount: 5,
    currentCount: 2,
    rewardCoins: 80,
    rewardXp: 150,
    completed: false,
  },
  {
    id: "dm_3",
    title: "Reach 5x Combo in any Arena Game",
    titleBn: "যেকোনো গেমে ৫x কম্বো স্ট্রিক অর্জন করো",
    targetGame: "any",
    targetCount: 5,
    currentCount: 5,
    rewardCoins: 60,
    rewardXp: 120,
    completed: true,
  },
];
