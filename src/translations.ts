export interface TranslationDict {
  // Navigation
  dashboardOn: string;
  combatArena: string;
  feedSquads: string;
  warsBoard: string;
  medisenseAi: string;
  commandDeck: string;
  commandCenter: string;
  coins: string;
  streak: string;
  logout: string;

  // Alerts & Messages
  accessDeniedTitle: string;
  accessDeniedMsg: string;
  loadingSystem: string;

  // Dashboard
  levelProgress: string;
  levelSpoilsMsg: string;
  districtSector: string;
  classesDeckTitle: string;
  classesDeckDesc: string;
  store: string;
  enterArenaTitle: string;
  enterArenaDesc: string;
  enterArenaBtn: string;
  admissionRadarTitle: string;
  recentBattlesTitle: string;
  accuracy: string;
  dailyStreakMsg: string;
  streakTitle: string;

  // Practice Panel
  currentSubject: string;
  selectSubject: string;
  difficulty: string;
  easy: string;
  medium: string;
  hard: string;
  biology: string;
  chemistry: string;
  physics: string;
  english: string;
  gk: string;
  prevYear: string;
  startQuiz: string;
  correct: string;
  wrong: string;
  explanation: string;
  nextQuestion: string;
  submitQuiz: string;
  score: string;

  // Battle Panel / combat names
  battleBoss: string;
  survivalRun: string;
  combatVictory: string;
  trialLose: string;

  // AI Mentor
  mentorTitle: string;
  mentorDesc: string;
  askMentorPlaceholder: string;
  send: string;
  aiThinking: string;

  // Admin and General
  category: string;
  status: string;
  title: string;
  content: string;
  important: string;
  save: string;
  delete: string;
  add: string;
  edit: string;
  cancel: string;

  // --- NEW LOCALIZATION EXTENSIONS ---
  // Landing Page Hero
  landingTitleText: string;
  landingTagline: string;
  landingStartJourney: string;
  landingDemoStudent: string;
  landingDemoAdmin: string;
  landingWhiteCoatHeading: string;
  landingWhiteCoatDesc: string;
  landingGamerRanksHeading: string;
  landingFooterNote: string;

  // Dream Medical Tracker & Stages
  stage01Sub: string;
  stage01Name: string;
  stage02Sub: string;
  stage02Name: string;
  stage03Sub: string;
  stage03Name: string;

  // Gamer League Ranks
  gamerRank1Name: string;
  gamerRank1Desc: string;
  gamerRank2Name: string;
  gamerRank2Desc: string;
  gamerRank3Name: string;
  gamerRank3Desc: string;
  gamerRank4Name: string;
  gamerRank4Desc: string;
  topPercent: string;

  // Daily Missions
  dailyMissionsTitle: string;
  dailyMissionsDesc: string;

  // Analytics
  analyticsWeakChaptersHeadline: string;
  analyticsSuggestedRevision: string;
  analyticsSuggestedPath: string;
  analyticsAccuracyPercentage: string;
  analyticsChapterName: string;
}

export type LanguageCode = "bn" | "en";

export const TRANSLATIONS: Record<LanguageCode, TranslationDict> = {
  bn: {
    dashboardOn: "👤 ড্যাশবোর্ড",
    combatArena: "⚔️ কমব্যাট এরিনা",
    feedSquads: "💬 ফিড, স্কোয়াড ও ডাউট সলভ",
    warsBoard: "🏆 ওয়ার্স বোর্ড",
    medisenseAi: "🎓 ইউর মেন্টর",
    commandDeck: "👑 কমান্ড ডেক",
    commandCenter: "🛡️  কমান্ড সেন্টার",
    coins: "কয়েন",
    streak: " দিনের স্ট্র্যাক",
    logout: "লগআউট",

    accessDeniedTitle: "🚫 প্রবেশাধিকার নিষিদ্ধ",
    accessDeniedMsg: "মেডিব্রিজ গেমস কমান্ড সেন্টারে প্রবেশের জন্য আপনার পর্যাপ্ত অনুমতি নেই। দয়া করে অনুমোদিত অ্যাডমিনের সাথে যোগাযোগ করুন।",
    loadingSystem: "🧬 সিস্টেম লোড হচ্ছে...",

    levelProgress: "লেভেল অগ্রগতি:",
    levelSpoilsMsg: "পরবর্তী লেভেলে পৌঁছাতে এবং নতুন ট্রফি আনলক করতে আরও {xp} এক্সপি অর্জন করুন।",
    districtSector: "বিভাগীয় সেক্টর Core:",
    classesDeckTitle: "ক্যারেক্টার ক্লাস ডেক",
    classesDeckDesc: "সঠিক ক্যারেক্টার ক্লাস ক্লায়েন্টদের এমসিকিউ ট্রায়ালে অতিরিক্ত এক্সপি মাল্টিপ্লায়ার বা স্পেশাল প্যাসিভ এবিলিটি দেয়।",
    store: "স্টোর",
    enterArenaTitle: "আপনি কি কমব্যাট ক্যাম্পেইন শুরু করতে প্রস্তুত?",
    enterArenaDesc: "পয়েন্ট, গোল্ড এবং ওয়েপোনাইজড মেমোনিকস অর্জন করুন। অর্গানিক বায়োকেমিস্ট্রি চ্যাপ্টারগুলোর ম্যাট্রিক্স ডি-কোড করুন অথবা সারভাইভাল মোড টেস্টে নামুন।",
    enterArenaBtn: "এরিনায় প্রবেশ করুন ⚔️",
    admissionRadarTitle: "🧬 বাংলাদেশ মেডিকেল অ্যাডমিশন রাডার",
    recentBattlesTitle: "যুদ্ধ লগ এবং টেলমেট্রি রেকর্ডিং",
    accuracy: "সঠিকতার হার",
    dailyStreakMsg: "টানা অনুশীলনের মাধ্যমে আপনার ধারাবাহিকতা বজায় রাখুন।",
    streakTitle: "স্ট্রাক মাল্টিপ্লায়ার",

    currentSubject: "বর্তমান বিষয়:",
    selectSubject: "বিষয় নির্বাচন করুন",
    difficulty: "কঠিনতার স্তর",
    easy: "সহজ",
    medium: "মধ্যম",
    hard: "কঠিন",
    biology: "জীববিজ্ঞান",
    chemistry: "রসায়ন",
    physics: "পদার্থবিজ্ঞান",
    english: "ইংরেজি",
    gk: "সাধারণ জ্ঞান",
    prevYear: "পূর্ববর্তী বছরের প্রশ্ন",
    startQuiz: "কুইজ শুরু করুন",
    correct: "সঠিক হয়েছে! 🎉",
    wrong: "ভুল হয়েছে! 💔",
    explanation: "ব্যাখ্যা ও বিশ্লেষণ:",
    nextQuestion: "পরবর্তী প্রশ্ন ➡️",
    submitQuiz: "ফলাফল সাবমিট করুন",
    score: "আপনার প্রাপ্ত স্কোর",

    battleBoss: "👹 বস ব্যাটল",
    survivalRun: "🏃 সারভাইভাল রান",
    combatVictory: "● সফল ক্যাম্পেইন",
    trialLose: "● ট্রায়াল এলিমিনেশন",

    mentorTitle: "মেডিসেন্স এআই মেন্টর",
    mentorDesc: "যেকোনো কঠিন মেডিকেল বা ফিজিওলজি টপিক, শর্টকাট মেমোনিক্স বা পরীক্ষার প্যাটার্ন সম্পর্কে আপনার ব্যক্তিগত এআই শিক্ষককে জিজ্ঞেস করুন।",
    askMentorPlaceholder: "আপনার মেডিকেল প্রশ্ন এখানে লিখুন (যেমন: ডার্মাটোম ব্যাখ্যা করুন)...",
    send: "পাঠান",
    aiThinking: "এআই মেন্টর চিন্তাভাবনা করছেন...",

    category: "ক্যাটাগরি",
    status: "স্থিতি",
    title: "শিরোনাম",
    content: "কনটেন্ট",
    important: "গুরুত্বপূর্ণ",
    save: "সংরক্ষণ করুন",
    delete: "মুছে ফেলুন",
    add: "যোগ করুন",
    edit: "সম্পাদনা",
    cancel: "বাতিল",

    // --- NEW LOCALIZATION EXTENSIONS ---
    landingTitleText: "গেমারের মতো প্রস্তুতি নিন। মেডিকেলিয়ানের মতো চিন্তা করুন।",
    landingTagline: "মেডিকেল ভর্তি পরীক্ষা জয় করার জন্য বাংলাদেশের প্রথম গেমিফাইড এমসিকিউ কমব্যাট এবং এআই মেন্টরিং ইকোসিস্টেম।",
    landingStartJourney: "অভিযান শুরু করুন 🚀",
    landingDemoStudent: "🎮 ডেমো স্টুডেন্ট",
    landingDemoAdmin: "👑 ডেমো অ্যাডমিন",
    landingWhiteCoatHeading: "🧬 হোয়াইট কোট ক্যারিয়ার প্রগ্রেসন ট্র্যাক",
    landingWhiteCoatDesc: "একটি ইন্টারঅ্যাক্টিভ আরপিজি রোডম্যাপ যার মাধ্যমে মেডিকেল ভর্তি কাঙ্ক্ষিত স্বপ্ন ছোঁয়া যাবে ধাপে ধাপে।",
    landingGamerRanksHeading: "স্টুডেন্ট গেমার লিগ র্যাংকসমূহ",
    landingFooterNote: "© ২০২৬ মেডিব্রিজ গেমস। বাংলাদেশের মেডিকেল ভর্তি পরীক্ষার্থীদের জন্য অত্যন্ত যত্নসহকারে ডিজাইনকৃত। সকল ডাটাবেস এবং তথ্যাদি আইনত ও প্রযুক্তিগতভাবে সুরক্ষিত।",

    stage01Sub: "ধাপ ০১ (পরীক্ষার্থী)",
    stage01Name: "এসএসসি গ্র্যাজুয়েট → এইচএসসি ক্যান্ডিডেট",
    stage02Sub: "ধাপ ০২ (পরীক্ষার্থী)",
    stage02Name: "মেডিকেল প্রত্যাশী → এমসিকিউ গ্ল্যাডিয়েটর",
    stage03Sub: "ধাপ ০৩ (লক্ষ্য অর্জিত)",
    stage03Name: "হোয়াইট কোট হোল্ডার → ভবিষ্যৎ চিকিৎসক",

    gamerRank1Name: "ফ্রেশম্যান / নতুন শিক্ষার্থী",
    gamerRank1Desc: "প্রাথমিক স্তর, কোষ বিভাজনের প্রথম পাঠ নিচ্ছেন।",
    gamerRank2Name: "স্কলার / উচ্চাকাঙ্ক্ষী",
    gamerRank2Desc: "ক্রেবস চক্র এবং জৈব যৌগের জটিল বিক্রিয়া আয়ত্ত করছেন।",
    gamerRank3Name: "মেডিকেলিয়ান যোদ্ধা",
    gamerRank3Desc: "রসায়নের গতিবিদ্যা ও প্রাণিবিদ্যা শারীরবৃত্তত্ত্বে পারদর্শী।",
    gamerRank4Name: "মেডিকেল লিজেন্ড",
    gamerRank4Desc: "এলিট চ্যাম্পিয়ন, হোয়াইট কোট প্রাপ্তি এবং ডিএমসি নিশ্চিত।",
    topPercent: "শীর্ষ ০.১%% বিশ্বব্যাপী",

    dailyMissionsTitle: "🔥 দৈনিক গ্রাইন্ড মিশন",
    dailyMissionsDesc: "প্রতিদিন চ্যালেঞ্জগুলো সম্পন্ন করে বোনাস কয়েন এবং এক্সপি বুস্টার সংগ্রহ করুন।",

    analyticsWeakChaptersHeadline: "অধ্যয়ন দুর্বলতা ও চ্যাপ্টার কর্মক্ষমতা বিশ্লেষণ",
    analyticsSuggestedRevision: "প্রস্তাবিত রিভিশন রুট এবং চ্যাপ্টার দুর্বলতা",
    analyticsSuggestedPath: "💡 রিভিশন গাইড: প্রধান বইয়ের অনুশীলনী এবং নিচের অধ্যায়টি পুঙ্খানুপুঙ্খভাবে রিভিশন দিন!",
    analyticsAccuracyPercentage: "সঠিকতার শতকরা হার",
    analyticsChapterName: "অধ্যায়ের নাম"
  },

  en: {
    dashboardOn: "👤 Dashboard",
    combatArena: "⚔️ Combat Arena",
    feedSquads: "💬 Feed, Squad & Doubt Solve",
    warsBoard: "🏆 Wars Board",
    medisenseAi: "🎓 Your Mentor",
    commandDeck: "👑 Command Deck",
    commandCenter: "🛡️ Command Center",
    coins: "Coins",
    streak: "Day Streak",
    logout: "Logout",

    accessDeniedTitle: "🚫 ACCESS DENIED",
    accessDeniedMsg: "You do not have permission to access the MediBridge Games Command Center. Please contact your administrator.",
    loadingSystem: "🧬 Loading HUD system...",

    levelProgress: "LEVEL PROGRESSION:",
    levelSpoilsMsg: "Gain **{xp} XP** to unlock next level spoils and trophy parameters.",
    districtSector: "Division Sector Core:",
    classesDeckTitle: "CHARACTER CLASSES DECK",
    classesDeckDesc: "Selecting a matching character class equips custom passive abilities and multiplies your XP gains during MCQ trials.",
    store: "Store",
    enterArenaTitle: "READY TO COMMENCE PREPARATION CAMPAIGN?",
    enterArenaDesc: "Acquire points, gold, and weaponized mnemonics. Dissect organic biochemistry chapter matrices or launch Survival Mode tests.",
    enterArenaBtn: "ENTER ARENA ⚔️",
    admissionRadarTitle: "🧬 BANGLADESH ADMISSION RADAR",
    recentBattlesTitle: "RECENT BATTLE DECK LOGS",
    accuracy: "Accuracy Rate",
    dailyStreakMsg: "Keep the continuous daily grind for maximum reward multiplier.",
    streakTitle: "Streak Multiplier",

    currentSubject: "Current Subject:",
    selectSubject: "Select Subject",
    difficulty: "Difficulty Rating",
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",
    biology: "Biology",
    chemistry: "Chemistry",
    physics: "Physics",
    english: "English",
    gk: "General Knowledge",
    prevYear: "Previous Year Questions",
    startQuiz: "Start Quiz",
    correct: "Correct Answer! 🎉",
    wrong: "Wrong Answer! 💔",
    explanation: "Explanation:",
    nextQuestion: "Next Question ➡️",
    submitQuiz: "Submit Score",
    score: "Your Score",

    battleBoss: "👹 Boss Battle",
    survivalRun: "🏃 Survival Run",
    combatVictory: "● SUCCESS CAMPAIGN",
    trialLose: "● TRIAL ELIMINATION",

    mentorTitle: "MediSense AI Mentor",
    mentorDesc: "Ask your personal AI medical instructor about cell biology, anatomy, high-yield shortcuts, or previous MAT examination papers.",
    askMentorPlaceholder: "Ask your medical query here (e.g. explain krebs cycle)...",
    send: "Send",
    aiThinking: "AI Mentor is thinking...",

    category: "Category",
    status: "Status",
    title: "Title",
    content: "Content",
    important: "Important Notice",
    save: "Save Changes",
    delete: "Delete Record",
    add: "Create New",
    edit: "Edit Profile",
    cancel: "Cancel",

    // --- NEW LOCALIZATION EXTENSIONS ---
    landingTitleText: "Train like a Gamer. Think like a Medicalian.",
    landingTagline: "Bangladesh's first gamified MCQ combat and AI mentoring ecosystem engineered to dominate Medical Admission Tests.",
    landingStartJourney: "Start Journey 🚀",
    landingDemoStudent: "🎮 Demo Student",
    landingDemoAdmin: "👑 Demo Admin",
    landingWhiteCoatHeading: "🧬 White Apron Progression Track",
    landingWhiteCoatDesc: "An immersive RPG roadmap simulating the real stages from HSC Candidate to DMC White Coat Doctors.",
    landingGamerRanksHeading: "Student Gamer League Ranks",
    landingFooterNote: "© 2026 MediBridge Games. Engineered proudly for Medical Admission candidates of Bangladesh. All database structures and rules secured.",

    stage01Sub: "Stage 01 (Aspirant)",
    stage01Name: "SSC Graduate → HSC Candidate",
    stage02Sub: "Stage 02 (Gladiator)",
    stage02Name: "Medical Aspirant → MCQ Gladiator",
    stage03Sub: "Stage 03 (Milestone reached)",
    stage03Name: "White Coat Holder → Future Doctor",

    gamerRank1Name: "Freshman / Learner",
    gamerRank1Desc: "Noob state, reading basic cellular structure lessons.",
    gamerRank2Name: "Scholar / Aspirant",
    gamerRank2Desc: "Dissecting complex Krebs Cycle and chemical buffers.",
    gamerRank3Name: "Medicalian Warrior",
    gamerRank3Desc: "Mastering chemistry kinetics and zoology anatomy.",
    gamerRank4Name: "Medical Legend",
    gamerRank4Desc: "White coat guaranteed, elite champion of DMC.",
    topPercent: "Top 0.1% Globally",

    dailyMissionsTitle: "🔥 Daily Grind Objective Missions",
    dailyMissionsDesc: "Complete quests everyday to secure dynamic gold coins and XP boost parameters.",

    analyticsWeakChaptersHeadline: "Chapter Performance & Cognitive Analytics",
    analyticsSuggestedRevision: "Suggested Revision Paths & Topic Weakness",
    analyticsSuggestedPath: "💡 Revision Suggestion: Read Main Books exercises and practice MCQ trials for this chapter thoroughly!",
    analyticsAccuracyPercentage: "Accuracy Match %",
    analyticsChapterName: "Chapter Name"
  }
};
