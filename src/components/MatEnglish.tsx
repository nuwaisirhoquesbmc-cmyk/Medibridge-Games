import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  CheckCircle,
  Layers,
  Award,
  Sparkles,
  Check,
  Flame,
  BookOpen,
  Volume2,
  HelpCircle,
  RefreshCw,
  SpellCheck,
  ChevronRight,
  BookOpenCheck,
  TrendingUp,
  Heart,
  XCircle,
  Lightbulb,
  CornerDownRight,
} from "lucide-react";
import { playSound } from "../audio";
import { UserProfile, Question } from "../types";
import { logQuestionMistake, removeQuestionMistake } from "../lib/backend";

interface MatEnglishProps {
  currentUser: UserProfile | null;
  onProfileUpdate?: (updated: Partial<UserProfile>) => void;
  language: "bn" | "en";
  theme: "light" | "dark";
}

interface EnglishFlashcard {
  id: number;
  word: string;
  category: "Synonyms" | "Preposition" | "Idioms" | "Spelling" | "Grammar Rules";
  categoryBn: string;
  meaningBn: string;
  meaningEn: string;
  synonyms?: string;
  antonyms?: string;
  sentenceEn: string;
  sentenceBn: string;
  examFactBn: string;
  examFactEn: string;
  difficulty: "Easy" | "Medium" | "Hard";
}

const ENGLISH_FLASHCARDS: EnglishFlashcard[] = [
  {
    id: 1,
    word: "Abate",
    category: "Synonyms",
    categoryBn: "সমার্থক ও বিপরীত শব্দ",
    meaningBn: "প্রশমিত হওয়া / তীব্রতা হ্রাস পাওয়া",
    meaningEn: "To become less intense or active; to diminish.",
    synonyms: "Lessen, Decrease, Subside, Wane",
    antonyms: "Increase, Intensify, Amplify, Aggravate",
    sentenceEn: "We must wait until the storm abates before sailing.",
    sentenceBn: "আমাদের পাল তোলার আগে ঝড় প্রশমিত হওয়া পর্যন্ত অপেক্ষা করতে হবে।",
    examFactBn: "এটি ভর্তি পরীক্ষায় একাধিকবার এসেছে। 'Abate' শব্দের সমার্থক শব্দ হিসেবে Lessen/Decrease সবচেয়ে বেশি অপশনে থাকে।",
    examFactEn: "A high-frequency word in MAT. 'Abate' translates to decrease or make less.",
    difficulty: "Medium"
  },
  {
    id: 2,
    word: "Abstain from",
    category: "Preposition",
    categoryBn: "উপযুক্ত প্রিপজিশন",
    meaningBn: "বিরত থাকা",
    meaningEn: "To restrain oneself from doing or enjoying something.",
    sentenceEn: "The doctor advised him to abstain from rich foods.",
    sentenceBn: "ডাক্তার তাকে গুরুপাক খাবার খাওয়া থেকে বিরত থাকার পরামর্শ দিয়েছেন।",
    examFactBn: "Abstain-এর পর সবসময় প্রিপজিশন 'from' বসে। একই অর্থযুক্ত 'Refrain'-এর পরেও 'from' বসে।",
    examFactEn: "Always followed by the preposition 'from'. Same applies to the synonym 'Refrain from'.",
    difficulty: "Easy"
  },
  {
    id: 3,
    word: "Bureaucracy",
    category: "Spelling",
    categoryBn: "সঠিক বানান",
    meaningBn: "আমলাতন্ত্র",
    meaningEn: "A system of government where decisions are made by state officials.",
    sentenceEn: "The military bureaucracy can be incredibly tight.",
    sentenceBn: "সামরিক আমলাতন্ত্র অত্যন্ত কঠোর হতে পারে।",
    examFactBn: "বানানটি সতর্কভাবে লক্ষ্য করুন: B-U-R-E-A-U-C-R-A-C-Y (বু-রে-অ-ক্র্যা-সি)। এটি মেডিকেল ভর্তি পরীক্ষার একটি অত্যন্ত কমন বানান ট্র্যাপ!",
    examFactEn: "A very common spelling trap in MAT. Practice mnemonic: B-U-R-E-A-U-C-R-A-C-Y.",
    difficulty: "Hard"
  },
  {
    id: 4,
    word: "At daggers drawn",
    category: "Idioms",
    categoryBn: "বাগধারা ও প্রবাদ",
    meaningBn: "ভীষণ শত্রুতা ভাব / খড়্গহস্ত সম্পর্ক",
    meaningEn: "In a state of open hostility; bitter enemies.",
    sentenceEn: "The two local factions have been at daggers drawn for years.",
    sentenceBn: "দুইটি স্থানীয় গ্রুপ বছরের পর বছর ধরে ভীষণ শত্রুতাভাব বজায় রেখেছে।",
    examFactBn: "বাগধারাটির অর্থ 'Bitterly hostile' বা 'On the verge of fighting'।",
    examFactEn: "An idiom indicating extreme hostility or enmity. Often tested in MAT.",
    difficulty: "Medium"
  },
  {
    id: 5,
    word: "Diarrhoea",
    category: "Spelling",
    categoryBn: "সঠিক বানান",
    meaningBn: "ডায়রিয়া / পাতলা পায়খানা",
    meaningEn: "A medical condition of frequent liquid bowel movements.",
    sentenceEn: "Severe diarrhoea can cause rapid dehydration.",
    sentenceBn: "মারাত্মক ডায়রিয়ার কারণে দ্রুত পানিশূন্যতা দেখা দিতে পারে।",
    examFactBn: "যেহেতু এটি একটি মেডিকেল পরীক্ষা, তাই এই চিকিৎসা বানানটি হরহামেশাই আসে। লক্ষ্য করুন: D-I-A-R-R-H-O-E-A।",
    examFactEn: "As a medical exam topic, medical spellings are high-yield. Remember: D-I-A-R-R-H-O-E-A.",
    difficulty: "Hard"
  },
  {
    id: 6,
    word: "Achilles' heel",
    category: "Idioms",
    categoryBn: "বাগধারা ও প্রবাদ",
    meaningBn: "দুর্বলতা / দুর্বলতম জায়গা",
    meaningEn: "A deadly weak point or vulnerability despite overall strength.",
    sentenceEn: "English grammar turned out to be his Achilles' heel in the test.",
    sentenceBn: "পরীক্ষায় ইংরেজি ব্যাকরণই তার সবচেয়ে বড় দুর্বলতা হিসেবে প্রমাণিত হলো।",
    examFactBn: "গ্রিক বীর একিলিসের পৌরাণিক কাহিনীর ওপর ভিত্তি করে এটি তৈরি। এর অর্থ 'A vulnerable spot' বা দুর্বল স্থান।",
    examFactEn: "Originates from Greek myth. Means a weak or vulnerable point.",
    difficulty: "Easy"
  },
  {
    id: 7,
    word: "Insist on",
    category: "Preposition",
    categoryBn: "উপযুক্ত প্রিপজিশন",
    meaningBn: "জেদ করা / কোনো বিষয়ে জোর দেওয়া",
    meaningEn: "To demand something forcefully, not accepting any refusal.",
    sentenceEn: "She insisted on buying that particular medical dictionary.",
    sentenceBn: "তিনি ওই নির্দিষ্ট মেডিকেল অভিধানটি কেনার জন্য জেদ করেছিলেন।",
    examFactBn: "Insist ক্রিয়াপদের পর সবসময় 'on' বসে এবং এরপর পরবর্তী verb-এর সাথে -ing যোগ হয়। (যেমন: Insisted on my going...)",
    examFactEn: "Followed by the preposition 'on'. Note that the following verb must take the gerund (-ing) form.",
    difficulty: "Easy"
  },
  {
    id: 8,
    word: "Altruistic",
    category: "Synonyms",
    categoryBn: "সমার্থক ও বিপরীত শব্দ",
    meaningBn: "পরোপকারী / নিঃস্বার্থ মানবতাপ্রেমী",
    meaningEn: "Showing unselfish concern for the well-being of others.",
    synonyms: "Benevolent, Philanthropic, Selfless, Humanitarian",
    antonyms: "Selfish, Egocentric, Greedy, Malevolent",
    sentenceEn: "The nurse devoted her life to altruistic work in rural communities.",
    sentenceBn: "সেবিকা গ্রামীণ সমাজে পরোপকারী কাজে নিজের জীবন উৎসর্গ করেছেন।",
    examFactBn: "Altruistic শব্দের বিপরীতার্থক (Antonym) শব্দ হলো Selfish। সমার্থক শব্দ হিসেবে Benevolent বা Selfless প্রায়শই মেডিকেল ভর্তি পরীক্ষায় দেখা যায়।",
    examFactEn: "Altruistic means selfless. Antonym is Selfish. High-yield synonym: Benevolent.",
    difficulty: "Medium"
  },
  {
    id: 9,
    word: "Lieutenant",
    category: "Spelling",
    categoryBn: "সঠিক বানান",
    meaningBn: "লেফটেন্যান্ট (সেনা কর্মকর্তা)",
    meaningEn: "A deputy or substitute; a junior officer rank in armed forces.",
    sentenceEn: "He was promoted to the rank of Lieutenant last month.",
    sentenceBn: "গত মাসে তিনি লেফটেন্যান্ট পদে উন্নীত হন।",
    examFactBn: "মজার টেকনিক: Lie (মিথ্যা) + U (তুমি) + Ten (দশ) + Ant (পিপড়া) = Lieutenant! এই চমৎকার সূত্রটি ব্যবহার করে বানানটি কখনোই ভুলবেন না।",
    examFactEn: "Mnemonic trick: Lie + U + Ten + Ant = Lieutenant. Memorize spelling: L-I-E-U-T-E-N-A-N-T.",
    difficulty: "Hard"
  },
  {
    id: 10,
    word: "Gift of the gab",
    category: "Idioms",
    categoryBn: "বাগধারা ও প্রবাদ",
    meaningBn: "বাগ্মিতা / চমৎকার বাচনভঙ্গি",
    meaningEn: "The ability to speak easily and persuasively.",
    sentenceEn: "As a seasoned clinician, he has a true gift of the gab with patients.",
    sentenceBn: "একজন অভিজ্ঞ চিকিৎসক হিসেবে, রোগীদের সাথে চমৎকার বাচনভঙ্গিতে কথা বলার ক্ষমতা তাঁর আছে।",
    examFactBn: "Gift of the gab অর্থ 'Eloquence' বা 'Power of speech'। ডাক্তার-রোগী কথোপকথনের সুবিধার্থে এই বাচনভঙ্গি অত্যন্ত কার্যকরী।",
    examFactEn: "Idiomatic phrase for eloquence or speaking skill. Correct meaning: Eloquence.",
    difficulty: "Easy"
  },
  {
    id: 11,
    word: "Prone to",
    category: "Preposition",
    categoryBn: "উপযুক্ত প্রিপজিশন",
    meaningBn: "ঝুঁকিপূর্ণ / প্রবণতা রয়েছে এমন",
    meaningEn: "Likely to or liable to experience something negative.",
    sentenceEn: "Newborn babies are highly prone to winter infections.",
    sentenceBn: "নবজাতক শিশুরা শীতকালীন ইনফেকশনে আক্রান্ত হওয়ার ক্ষেত্রে অত্যন্ত ঝুঁকিপূর্ণ।",
    examFactBn: "Prone শব্দের পর সবসময় 'to' বসে যার অর্থ 'আক্রান্ত হবার আশঙ্কা'। একই রূপ প্রিপজিশন: Subject to, Susceptible to।",
    examFactEn: "Followed by the preposition 'to'. Similar expressions: Subject to, Susceptible to.",
    difficulty: "Easy"
  },
  {
    id: 12,
    word: "Benevolent",
    category: "Synonyms",
    categoryBn: "সমার্থক ও বিপরীত শব্দ",
    meaningBn: "দয়ালু / হিতৈষী / মঙ্গলকামী",
    meaningEn: "Well-meaning and kindly; generous and helpful.",
    synonyms: "Kind, Altruistic, Compassionate, Generous",
    antonyms: "Malevolent, Cruel, Unkind, Spiteful",
    sentenceEn: "A benevolent donor funded the new medical ward of the hospital.",
    sentenceBn: "একজন দয়ালু দাতা হাসপাতালের নতুন মেডিকেল ওয়ার্ডের জন্য অর্থায়ন করেছেন।",
    examFactBn: "Benevolent শব্দের বিপরীত শব্দ (Antonym) হিসেবে Malevolent শব্দটি মেডিকেল পরীক্ষায় খুবই জনপ্রিয়।",
    examFactEn: "An adjective meaning kind and generous. Crucial Antonym: Malevolent.",
    difficulty: "Medium"
  }
];

interface GrammarQuestion {
  id: number;
  questionBn: string;
  questionEn: string;
  options: string[];
  correctIdx: number;
  explanationBn: string;
  explanationEn: string;
}

const GRAMMAR_QUESTIONS: GrammarQuestion[] = [
  {
    id: 1,
    questionBn: "নিচের কোন বাক্যটির প্রিপজিশন সঠিক?",
    questionEn: "Which of the following sentences has the correct preposition?",
    options: [
      "He of school is a teacher.",
      "She has no taste for music.",
      "They are good in cricket.",
      "He died from cancer."
    ],
    correctIdx: 1,
    explanationBn: "'Taste for' অর্থ কোনো বিষয়ের প্রতি অনুরাগ বা রুচি (যেমন: taste for music)। মনে রাখবেন, রোগে মারা গেলে 'die of' (e.g. died of cancer) এবং ক্রিকেট খেলার দক্ষতায় 'good at' বসে।",
    explanationEn: "'Taste for' means liking or inclination. Dying of a disease takes 'die of', and sports proficiency takes 'good at'."
  },
  {
    id: 2,
    questionBn: "সঠিক বানানটি শনাক্ত করুন:",
    questionEn: "Identify the correctly spelled word:",
    options: [
      "Queztionaire",
      "Questionaire",
      "Questionnaire",
      "Questionairre"
    ],
    correctIdx: 2,
    explanationBn: "সঠিক বানানটি হলো Questionnaire (প্রশ্নমালা)। স্পেলিং লজিক: Q-U-E-S-T-I-O-N-N-A-I-R-E (ডাবল N থাকবে)। এটি বিগত মেডিকেল পরীক্ষায় এসেছে!",
    explanationEn: "The correct spelling is Questionnaire. Pay attention to the double 'n': Q-U-E-S-T-I-O-N-N-A-I-R-E."
  },
  {
    id: 3,
    questionBn: "নিচের কোন শব্দটি 'Conducive' শব্দের সাথে সঠিক প্রিপজিশন ব্যবহার করে?",
    questionEn: "Which preposition correctly follows the word 'Conducive'?",
    options: [
      "with",
      "to",
      "for",
      "in"
    ],
    correctIdx: 1,
    explanationBn: "'Conducive to' অর্থ স্বাস্থ্যকর বা সহায়ক (Conducive to health)। মেডিকেল এডমিশনে এটি অত্যন্ত নিয়মিত প্রশ্ন।",
    explanationEn: "'Conducive' is always followed by the preposition 'to' (e.g., Early morning walks are conducive to health)."
  },
  {
    id: 4,
    questionBn: "সঠিক Passive Voice চিহ্নিত করুন: 'Panic seized the writer.'",
    questionEn: "Identify the correct Passive Voice: 'Panic seized the writer.'",
    options: [
      "The writer was seized with panic.",
      "The writer was seized by panic.",
      "The writer has been seized by panic.",
      "The writer had seized with panic."
    ],
    correctIdx: 0,
    explanationBn: "গুরুত্বপূর্ণ ব্যতিক্রম! 'Seize' ভার্বের প্যাসিভ ভয়েসের সাথে প্রিপজিশন 'with' ব্যবহৃত হয়, 'by' নয়। অতএব সঠিক উত্তর: 'The writer was seized with panic.'",
    explanationEn: "Crucial grammatical exception! The verb 'seize' takes the preposition 'with' instead of 'by' in its passive construction."
  },
  {
    id: 5,
    questionBn: "নিচের কোন বাক্যে 'But' শব্দটি প্রিপজিশন হিসেবে ব্যবহৃত হয়েছে?",
    questionEn: "In which of the following sentences is 'But' used as a preposition?",
    options: [
      "We tried but failed.",
      "It is but right.",
      "None but the brave deserve the fair.",
      "But for your help, I would have failed."
    ],
    correctIdx: 2,
    explanationBn: "'None but the brave' বাক্যে 'but' বলতে 'ছাড়া' বা 'ব্যতীত' (Except) বোঝানো হয়েছে। যখন 'but'-এর অর্থ 'except' হয়, তখন সেটি Preposition হিসেবে আচরণ করে।",
    explanationEn: "When 'but' functions as 'except' (e.g. None but the brave), it acts as a preposition rather than a coordinating conjunction."
  },
  {
    id: 6,
    questionBn: "বানানটি মেডিকেল পরীক্ষায় অত্যন্ত বেশি আসে। সঠিক বানান কোনটি?",
    questionEn: "Which of the following is the correct spelling of 'Dysentery'?",
    options: [
      "Dysentary",
      "Dysentry",
      "Dysentery",
      "Disentery"
    ],
    correctIdx: 2,
    explanationBn: "সঠিক চিকিৎসা বানানটি হলো Dysentery (আমাশয়)। লক্ষ্য করুন: D-Y-S-E-N-T-E-R-Y (শেষে tery থাকবে, tary নয়)।",
    explanationEn: "The correct spelling is Dysentery. Note the 'e' before 'ry': D-Y-S-E-N-T-E-R-Y."
  }
];

export default function MatEnglish({ currentUser, onProfileUpdate, language, theme }: MatEnglishProps) {
  const isDark = theme === "dark";
  const [activeTab, setActiveTab] = useState<"flashcards" | "grammar" | "speller">("flashcards");

  // State for Flashcards
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState<"All" | "Synonyms" | "Preposition" | "Idioms" | "Spelling">("All");
  const [flippedIds, setFlippedIds] = useState<Record<number, boolean>>({});
  const [masteredIds, setMasteredIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem("mat_eng_mastered_words");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // State for Grammar Game
  const [gameStarted, setGameStarted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [gameFinished, setGameFinished] = useState(false);

  // State for Speller Game
  const [spellerWordIndex, setSpellerWordIndex] = useState(0);
  const [userSpellingInput, setUserSpellingInput] = useState("");
  const [submittedSpelling, setSubmittedSpelling] = useState(false);
  const [spellingCorrect, setSpellingCorrect] = useState<boolean | null>(null);
  const [hintUsed, setHintUsed] = useState(false);

  const SPELLER_WORDS = [
    { word: "Bureaucracy", hintBn: "আমলাতন্ত্র। ট্রিক: Bureau (অফিস) + cracy (শাসন)।", spellingTip: "B-U-R-E-A-U-C-R-A-C-Y" },
    { word: "Lieutenant", hintBn: "লেফটেন্যান্ট। ট্রিক: Lie (মিথ্যা) + U (তুমি) + Ten (১০) + Ant (পিপড়া)।", spellingTip: "L-I-E-U-T-E-N-A-N-T" },
    { word: "Diarrhoea", hintBn: "ডায়রিয়া। ট্রিক: r-r-h-o-e-a যুক্ত অংশ লক্ষ্য করুন।", spellingTip: "D-I-A-R-R-H-O-E-A" },
    { word: "Questionnaire", hintBn: "প্রশ্নমালা। ট্রಿಕ: Double N থাকবে।", spellingTip: "Q-U-E-S-T-I-O-N-N-A-I-R-E" },
    { word: "Dysentery", hintBn: "আমাশয়। ট্রিক: Dys (খারাপ) + enteron (অন্ত্র)। tery দিয়ে শেষ হয়।", spellingTip: "D-Y-S-E-N-T-E-R-Y" },
    { word: "Millennium", hintBn: "সহস্রাব্দ। ট্রিক: ডাবল L এবং ডাবল N দুটোই থাকবে।", spellingTip: "M-I-L-L-E-N-N-I-U-M" }
  ];

  // Global Search English Navigation Listener
  useEffect(() => {
    const handleEnglishSearch = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        const { subTab, query, cat } = customEvent.detail;
        if (subTab) {
          setActiveTab(subTab);
        }
        if (query !== undefined) {
          setSearchQuery(query);
        }
        if (cat !== undefined) {
          setSelectedCat(cat);
        }
      }
    };
    window.addEventListener("medibridge_english_search_selected", handleEnglishSearch);
    return () => window.removeEventListener("medibridge_english_search_selected", handleEnglishSearch);
  }, []);

  const handleToggleFlip = (id: number) => {
    playSound("click");
    setFlippedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleMastered = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    playSound("click");
    setMasteredIds((prev) => {
      let updated;
      if (prev.includes(id)) {
        updated = prev.filter((item) => item !== id);
      } else {
        updated = [...prev, id];
        try { playSound("victory"); } catch (err) {}
      }
      localStorage.setItem("mat_eng_mastered_words", JSON.stringify(updated));
      return updated;
    });
  };

  // Grammar practice action handlers
  const handleAnswerSelection = (idx: number) => {
    if (selectedAnswer !== null || gameFinished) return;
    setSelectedAnswer(idx);
    const q = GRAMMAR_QUESTIONS[currentIdx];
    const correct = idx === q.correctIdx;
    setIsAnswerCorrect(correct);
    
    const mappedQ: Question = {
      id: `eng_grammar_${q.id}`,
      questionText: language === "bn" ? q.questionBn : q.questionEn,
      options: q.options,
      correctAnswerIndex: q.correctIdx,
      explanation: language === "bn" ? q.explanationBn : q.explanationEn,
      subject: "English",
      chapter: language === "bn" ? "ইংরেজি ব্যাকরণ অনুশীলন" : "Grammar Practice",
      difficulty: "Medium"
    };
    
    if (correct) {
      playSound("correct");
      setScore((prev) => prev + 10);
      setStreak((prev) => prev + 1);
      
      if (currentUser?.uid) {
        removeQuestionMistake(currentUser.uid, mappedQ.id);
      }
    } else {
      playSound("wrong");
      setLives((prev) => {
        const remaining = prev - 1;
        if (remaining <= 0) {
          setGameFinished(true);
        }
        return remaining;
      });
      setStreak(0);
      
      if (currentUser?.uid) {
        logQuestionMistake(currentUser.uid, mappedQ);
      }
    }
  };

  const handleNextGrammar = () => {
    playSound("click");
    setSelectedAnswer(null);
    setIsAnswerCorrect(null);
    if (currentIdx + 1 < GRAMMAR_QUESTIONS.length) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      setGameFinished(true);
      if (lives > 0) {
        playSound("levelup");
      }
    }
  };

  const resetGrammarGame = () => {
    playSound("click");
    setCurrentIdx(0);
    setSelectedAnswer(null);
    setIsAnswerCorrect(null);
    setLives(3);
    setScore(0);
    setStreak(0);
    setGameFinished(false);
    setGameStarted(true);
  };

  // Speller game handlers
  const checkSpelling = () => {
    const currentWordObj = SPELLER_WORDS[spellerWordIndex];
    const isCorrect = userSpellingInput.trim().toLowerCase() === currentWordObj.word.toLowerCase();
    setSpellingCorrect(isCorrect);
    setSubmittedSpelling(true);
    
    if (isCorrect) {
      playSound("levelup");
      setScore((prev) => prev + 15);
    } else {
      playSound("wrong");
    }
  };

  const nextSpellingWord = () => {
    playSound("click");
    setSubmittedSpelling(false);
    setSpellingCorrect(null);
    setUserSpellingInput("");
    setHintUsed(false);
    
    if (spellerWordIndex + 1 < SPELLER_WORDS.length) {
      setSpellerWordIndex((prev) => prev + 1);
    } else {
      setSpellerWordIndex(0); // Loop back or finish
    }
  };

  const filteredFlashcards = ENGLISH_FLASHCARDS.filter((card) => {
    const matchesCat = selectedCat === "All" || card.category === selectedCat;
    if (!searchQuery.trim()) return matchesCat;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (card.word || "").toLowerCase().includes(q) ||
      (card.meaningBn || "").includes(searchQuery) ||
      (card.meaningEn || "").toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
      
      {/* HEADER HERO AREA */}
      <div className={`p-6 rounded-3xl border relative overflow-hidden ${
        isDark 
          ? "bg-gradient-to-br from-[#121620] via-slate-900 to-[#101015] border-white/5" 
          : "bg-gradient-to-br from-red-50/50 via-white to-red-50/20 border-red-100 shadow-sm"
      }`}>
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-[100px] pointer-events-none bg-yellow-500/10"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-widest bg-[#C1121F] text-white rounded">
                {language === "bn" ? "সর্বোচ্চ প্রস্তুতি" : "HIGH-YIELD ENG"}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-yellow-500 font-mono">
                <Flame className="w-3.5 h-3.5" />
                <span>MAT SYLLABUS ALIGNED</span>
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-display text-gray-900 dark:text-white">
              {language === "bn" ? "ম্যাট ইংলিশ এরিনা 🇬🇧" : "MAT English Arena 🇬🇧"}
            </h1>
            <p className="text-xs text-gray-550 dark:text-gray-400 max-w-2xl leading-relaxed">
              {language === "bn" 
                ? "মেডিকেল ভর্তি পরীক্ষার ১০ নম্বরের ইংরেজি প্রস্তুতির জন্য সাজানো। এখানে রয়েছে ফ্ল্যাশকার্ডস, অ্যানিমেটেড স্পেলিং ট্রেইনার এবং হাই-ইয়েল্ড গ্রামার স্নাইপার গেম!"
                : "Designed exclusively for the 10-mark English syllabus in MAT. Features interactive mnemonics, automated spelling drills, and grammar weapon systems!"}
            </p>
          </div>

          {/* Stats Bar */}
          <div className="flex bg-slate-50 dark:bg-slate-900/80 border border-gray-200 dark:border-white/5 px-4 py-3 rounded-2xl gap-6">
            <div className="text-center">
              <span className="text-[10px] text-gray-400 font-mono block uppercase">SCORE</span>
              <span className="text-lg font-extrabold text-yellow-500">{score} XP</span>
            </div>
            <div className="h-8 w-[1px] bg-gray-250 dark:bg-white/10 self-center"></div>
            <div className="text-center">
              <span className="text-[10px] text-gray-400 font-mono block uppercase">MASTERED</span>
              <span className="text-lg font-extrabold text-emerald-500">
                {masteredIds.length}/{ENGLISH_FLASHCARDS.length}
              </span>
            </div>
          </div>
        </div>

        {/* TABS SELECTOR */}
        <div className="flex border-b border-gray-150/10 mt-8 gap-6 pt-1">
          {([
            { id: "flashcards", labelBn: "🎴 হাই-ইয়েল্ড কার্ডস", labelEn: "🎴 High-Yield Cards", icon: Layers },
            { id: "grammar", labelBn: "🚀 গ্রামার স্নাইপার কুইজ", labelEn: "🚀 Grammar Sniper", icon: BookOpenCheck },
            { id: "speller", labelBn: "✍️ মেডিকেল স্পেলিং ব্লিটজ", labelEn: "✍️ Spelling Blitz", icon: SpellCheck }
          ] as const).map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  playSound("click");
                  setActiveTab(tab.id);
                }}
                className={`flex items-center gap-2 pb-3.5 text-xs font-bold uppercase tracking-wider relative cursor-pointer outline-none ${
                  isActive 
                    ? "text-[#C1121F] dark:text-yellow-500" 
                    : "text-gray-400 hover:text-gray-600 dark:hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{language === "bn" ? tab.labelBn : tab.labelEn}</span>
                {isActive && (
                  <motion.div 
                    layoutId="activeEnglishSubtab" 
                    className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#C1121F] dark:bg-yellow-500 rounded-full"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* RENDER ACTIVE PLAYGROUND AREA */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2 }}
        >
          
          {/* TAB 1: INTERACTIVE FLASHCARDS */}
          {activeTab === "flashcards" && (
            <div className="space-y-6">
              
              {/* Category selector & search combined */}
              <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-transparent">
                <div className="flex flex-wrap gap-1.5 scrollbar-none overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                  {([
                    { id: "All", bn: "সব ক্যাটাগরি", en: "All Categories" },
                    { id: "Synonyms", bn: "ভোকাবুলারি", en: "Vocabulary" },
                    { id: "Preposition", bn: "প্রিপজিশন (Appropriate)", en: "Prepositions" },
                    { id: "Idioms", bn: "বাগধারা", en: "Idioms & Phrases" },
                    { id: "Spelling", bn: "সঠিক বানান", en: "Spelling Drills" }
                  ] as const).map((cat) => {
                    const selected = selectedCat === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          playSound("click");
                          setSelectedCat(cat.id);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                          selected
                            ? "bg-[#C1121F] dark:bg-yellow-500 text-white dark:text-black shadow-md border-transparent"
                            : isDark
                            ? "bg-slate-900 text-slate-300 border border-white/5 hover:bg-slate-800"
                            : "bg-white border border-gray-250 hover:bg-gray-50 text-slate-700"
                        }`}
                      >
                        {language === "bn" ? cat.bn : cat.en}
                      </button>
                    );
                  })}
                </div>

                {/* SEARCH FLOATER */}
                <div className="relative w-full md:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={language === "bn" ? "শব্দ বা পরীক্ষার হ্যাক খুঁজুন..." : "Filter words, defining facts..."}
                    className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs sm:text-sm focus:outline-none transition-all ${
                      isDark
                        ? "bg-slate-900 border border-white/5 text-white placeholder-slate-500 focus:border-yellow-500/50"
                        : "bg-white border border-gray-200 text-slate-800 placeholder-slate-400 focus:border-[#C1121F]"
                    }`}
                  />
                </div>
              </div>

              {/* Dynamic stats row */}
              <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row justify-between items-center gap-4 ${
                isDark ? "bg-slate-900/30 border-white/5 text-gray-300" : "bg-red-50/20 border-red-100 text-slate-800"
              }`}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-yellow-500/15 flex items-center justify-center text-yellow-500">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold leading-none mb-1">
                      {language === "bn" ? "আপনার প্রোগ্রেস" : "YOUR PROGRESS"}
                    </h4>
                    <p className="text-[10px] text-gray-400 font-mono">
                      {language === "bn"
                        ? `মোট ১২টি ভর্তিমুখী কার্ডের মধ্যে ${masteredIds.length}টি মেমোরি চেকপয়েন্ট পার করেছেন`
                        : `Mastered ${masteredIds.length} of ${ENGLISH_FLASHCARDS.length} ultimate memory triggers`}
                    </p>
                  </div>
                </div>

                <div className="w-full sm:w-48 h-2 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 to-yellow-500 transition-all duration-500"
                    style={{ width: `${(masteredIds.length / ENGLISH_FLASHCARDS.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredFlashcards.length === 0 ? (
                  <div className="col-span-full text-center py-12 bg-white dark:bg-slate-900/20 rounded-3xl border border-dashed border-gray-300 dark:border-white/5">
                    <HelpCircle className="w-12 h-12 mx-auto text-gray-400 mb-2 animate-bounce" />
                    <p className="text-sm font-semibold text-gray-500">
                      {language === "bn" ? "কোনো কার্ড পাওয়া যায়নি!" : "No matched highly vital words! Try another keyword."}
                    </p>
                  </div>
                ) : (
                  filteredFlashcards.map((card) => {
                    const isFlipped = !!flippedIds[card.id];
                    const isMastered = masteredIds.includes(card.id);
                    return (
                      <div
                        key={card.id}
                        className="h-80 w-full relative block perspective-1000 group cursor-pointer"
                        onClick={() => handleToggleFlip(card.id)}
                      >
                        <div
                          className={`w-full h-full relative transition-all duration-500 transform-style-3d ${
                            isFlipped ? "rotate-y-180" : ""
                          }`}
                        >
                          
                          {/* CARD FRONT */}
                          <div
                            className={`absolute inset-0 w-full h-full p-6 rounded-3xl border backface-hidden flex flex-col justify-between transition-all duration-300 overflow-hidden ${
                              isMastered
                                ? isDark
                                  ? "bg-gradient-to-br from-teal-950/40 to-slate-900 border-teal-500/30 text-white shadow-[0_4px_20px_rgba(20,184,166,0.06)]"
                                  : "bg-gradient-to-br from-emerald-50/70 to-white border-emerald-200 text-slate-800 shadow-[0_4px_20px_rgba(16,185,129,0.03)]"
                                : isDark
                                ? "bg-[#0d1017] border-white/5 text-white hover:border-slate-800"
                                : "bg-white border-gray-200 text-slate-800 hover:border-gray-300"
                            }`}
                            style={{
                              boxShadow: isDark ? "none" : "0 8px 24px -12px rgba(0,0,0,0.08)"
                            }}
                          >
                            {/* Top Badge Info */}
                            <div className="flex justify-between items-center w-full">
                              <span className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-widest ${
                                isDark ? "bg-white/5 text-yellow-500" : "bg-red-50 text-[#C1121F] border border-red-100"
                              }`}>
                                {language === "bn" ? card.categoryBn : card.category}
                              </span>

                              <div className="flex items-center gap-1.5">
                                {/* Difficulty badge */}
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                  card.difficulty === "Easy"
                                    ? "bg-emerald-500/10 text-emerald-500"
                                    : card.difficulty === "Medium"
                                    ? "bg-yellow-500/10 text-yellow-550"
                                    : "bg-red-500/10 text-red-500"
                                }`}>
                                  {card.difficulty}
                                </span>

                                <button
                                  onClick={(e) => toggleMastered(card.id, e)}
                                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                    isMastered
                                      ? "bg-emerald-500 text-white border-emerald-400 scale-105"
                                      : isDark
                                      ? "bg-white/5 border-white/5 text-gray-500 hover:text-white"
                                      : "bg-slate-50 border-gray-200 text-gray-400 hover:text-gray-600"
                                  }`}
                                  title={isMastered ? "Review Again Needed" : "Mastered!"}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Word Body Content */}
                            <div className="my-auto text-center py-4 space-y-2">
                              <h2 className="text-2xl font-black tracking-tight break-words font-display">
                                {card.word}
                              </h2>
                              <p className="text-[10px] text-gray-450 dark:text-gray-400 font-mono tracking-wide uppercase flex items-center justify-center gap-1">
                                <Volume2 className="w-3.5 h-3.5" />
                                <span>{language === "bn" ? "ক্লিক করে উত্তর দেখুন" : "Click to view description"}</span>
                              </p>
                            </div>

                            {/* Footer card tags */}
                            <div className="flex justify-between items-center text-[9px] text-gray-400 pt-3 border-t border-gray-150/10 w-full font-mono">
                              <span>HIGH-YIELD #{card.id}</span>
                              <span className="flex items-center gap-1 text-red-500 dark:text-yellow-500">
                                <Layers className="w-3.5 h-3.5 animate-pulse" />
                                <span>{language === "bn" ? "উল্টান" : "FLIP"}</span>
                              </span>
                            </div>

                          </div>

                          {/* CARD BACK */}
                          <div
                            className={`absolute inset-0 w-full h-full p-6 rounded-3xl border backface-hidden rotate-y-180 flex flex-col justify-between overflow-y-auto ${
                              isDark
                                ? "bg-slate-950 border-yellow-500/20 text-white"
                                : "bg-slate-50 border-gray-200 text-slate-800"
                            }`}
                          >
                            
                            <div className="flex justify-between items-center border-b border-gray-150/10 pb-2 mb-2">
                              <span className="text-[9px] font-extrabold tracking-wider text-red-500 dark:text-amber-500 uppercase font-mono">
                                {language === "bn" ? "মেডিকেল ব্যাকরণ হ্যাক" : "MAT HIGH-YIELD HACKS"}
                              </span>
                              <span className="text-[9px] text-slate-400 font-mono">#{card.id}</span>
                            </div>

                            {/* Content layout */}
                            <div className="space-y-3">
                              <div>
                                <span className="text-[8px] uppercase font-bold text-gray-400 block font-mono">
                                  {language === "bn" ? "বাংলা অর্থ (MEANING):" : "BENGALI MEANING:"}
                                </span>
                                <p className="text-xs font-bold text-slate-900 dark:text-white">
                                  {card.meaningBn}
                                </p>
                              </div>

                              <div>
                                <span className="text-[8px] uppercase font-bold text-gray-400 block font-mono">
                                  {language === "bn" ? "ইংরেজি সংজ্ঞা (DEFINITION):" : "DEFINITION:"}
                                </span>
                                <p className="text-xs opacity-95 text-slate-700 dark:text-gray-300">
                                  {card.meaningEn}
                                </p>
                              </div>

                              {(card.synonyms || card.antonyms) && (
                                <div className="p-2 rounded-xl bg-gray-200/50 dark:bg-slate-900/50 border border-black/5 dark:border-white/5 space-y-1 text-[10px]">
                                  {card.synonyms && (
                                    <p>
                                      <strong className="text-emerald-500 font-mono">SYN:</strong> {card.synonyms}
                                    </p>
                                  )}
                                  {card.antonyms && (
                                    <p>
                                      <strong className="text-red-500 font-mono">ANT:</strong> {card.antonyms}
                                    </p>
                                  )}
                                </div>
                              )}

                              <div>
                                <span className="text-[8px] uppercase font-bold text-gray-400 block font-mono">
                                  {language === "bn" ? "প্রয়োগ (SENTENCE EXAMPLE):" : "SENTENCE CONTEXT:"}
                                </span>
                                <p className="text-[11px] italic font-medium text-amber-500 dark:text-yellow-500 leading-tight">
                                  "{card.sentenceEn}"
                                </p>
                                <p className="text-[10px] text-gray-450 dark:text-gray-400 leading-tight mt-0.5">
                                  {card.sentenceBn}
                                </p>
                              </div>
                            </div>

                            {/* BANGLADESH MAT SPECIAL LAUNCH PAD */}
                            <div className="mt-3 p-2.5 rounded-xl border text-[10px] leading-relaxed bg-yellow-500/5 border-yellow-500/10 text-yellow-750 dark:text-yellow-400">
                              <strong className="block text-[8px] uppercase tracking-wider font-mono text-red-500 dark:text-amber-500">
                                {language === "bn" ? "ভর্তি পরীক্ষার পিনপয়েন্ট ট্রিক (MAT ATTACK):" : "MAT SPECIFIC ATTACK TIP:"}
                              </strong>
                              {language === "bn" ? card.examFactBn : card.examFactEn}
                            </div>

                            <div className="text-[9px] text-center text-slate-400 pt-2 border-t border-gray-150/10 font-mono">
                              {language === "bn" ? "ফিরে যেতে আবারও ট্যাপ করুন" : "Click to flip again"}
                            </div>

                          </div>

                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          )}

          {/* TAB 2: GRAMMAR SNIPER QUIZ */}
          {activeTab === "grammar" && (
            <div className="space-y-6 max-w-2xl mx-auto">
              {!gameStarted && !gameFinished ? (
                <div className={`p-8 rounded-3xl border text-center space-y-6 ${
                  isDark ? "bg-[#0c1017] border-white/5" : "bg-white border-gray-200"
                }`}>
                  <div className="w-16 h-16 rounded-full bg-[#C1121F]/15 text-[#C1121F] flex items-center justify-center text-2xl mx-auto animate-pulse">
                    🎯
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-xl font-bold">
                      {language === "bn" ? "গ্রামার স্নাইপার - সঠিক নিশানা নিন!" : "Grammar Sniper Arena"}
                    </h2>
                    <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
                      {language === "bn"
                        ? "মেডিকেল ভর্তি পরীক্ষার জন্য বাছাই করা ৩টি হার্ট সম্বলিত ব্যাটল এমসিকিউ। প্রতিটি ভুল উত্তরে ১টি হার্ট যাবে!"
                        : "A high-stakes campaign tailored exclusively on the critical preposition exception traps, spellings, and voice rules in MAT."}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      playSound("click");
                      resetGrammarGame();
                    }}
                    className="w-full sm:w-auto px-6 py-3 bg-[#C1121F] hover:bg-[#A80F1B] text-white font-extrabold text-xs uppercase tracking-widest rounded-xl shadow-lg hover:shadow-[#C1121F]/30 transform active:scale-95 transition cursor-pointer"
                  >
                    {language === "bn" ? "ক্যাম্পেইন শুরু করুন" : "LAUNCH DRILLS"}
                  </button>
                </div>
              ) : gameFinished ? (
                <div className={`p-8 rounded-3xl border text-center space-y-6 ${
                  isDark ? "bg-[#0d1017] border-white/5" : "bg-white border-gray-200"
                }`}>
                  <div className="text-4xl">🏆</div>
                  
                  <div className="space-y-2">
                    <h2 className="text-xl font-black">
                      {lives > 0 
                        ? (language === "bn" ? "চমৎকার! আপনি মিশন সম্পন্ন করেছেন!" : "MISSION ACCOMPLISHED!") 
                        : (language === "bn" ? "খেলা শেষ! আপনি ৩টি হৃদয়ই হারিয়েছেন" : "GAME OVER!")}
                    </h2>
                    <p className="text-xs text-gray-400">
                      {language === "bn"
                        ? `আপনার মোট অর্জন score: ${score} XP | লাইভ বেঁচে ছিল: ${lives}/৩`
                        : `Final scores amassed: ${score} XP | Remaining hearts: ${lives}/3`}
                    </p>
                  </div>

                  {lives > 0 && (
                    <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-xs text-left max-w-sm mx-auto space-y-1">
                      <p className="font-bold flex items-center gap-1">
                        <span>🚀</span>
                        <span>{language === "bn" ? "মেডিকেল ভর্তি পরীক্ষার বিশেষ সাজেশন" : "HIGH-YIELD MAT INSIGHT"}</span>
                      </p>
                      <p className="text-[11px] leading-relaxed font-sans opacity-90">
                        {language === "bn" 
                          ? "ভর্তি পরীক্ষায় ইংরেজি এবং সাধারণ জ্ঞান হলো ২৫ নম্বরের ট্রাম্প কার্ড। এগুলো প্রতিদিন ১০টি করে নিয়মিত অনুধাবন করলে মেধা তালিকায় হাজার জনের উপরে অবস্থান নিশ্চিত হবে।"
                          : "English works as a vital differentiator in MAT. Mastering anomalous prepositions and spellings grants a decisive vanguard advantage over other participants."}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={resetGrammarGame}
                      className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                    >
                      {language === "bn" ? "আবার খেলুন" : "TRY AGAIN"}
                    </button>
                    <button
                      onClick={() => {
                        playSound("click");
                        setGameStarted(false);
                        setGameFinished(false);
                      }}
                      className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                    >
                      {language === "bn" ? "ড্যাশবোর্ড ফিরে যান" : "EXIT ARENA"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Status Bar */}
                  <div className="flex justify-between items-center bg-transparent px-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 font-mono">LIVES:</span>
                      <div className="flex gap-1">
                        {[1, 2, 3].map((heartIdx) => (
                          <Heart
                            key={heartIdx}
                            className={`w-4 h-4 transition-all duration-300 ${
                              heartIdx <= lives 
                                ? "text-red-500 fill-red-500 scale-110" 
                                : "text-gray-600 dark:text-slate-800 scale-90"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="text-[10px] text-gray-400 font-mono">
                      {language === "bn" ? "প্রশ্ন:" : "QUESTION:"} {currentIdx + 1}/{GRAMMAR_QUESTIONS.length}
                    </div>
                  </div>

                  {/* Question box */}
                  <div className={`p-6 rounded-3xl border relative overflow-hidden ${
                    isDark ? "bg-[#0c1017] border-white/5" : "bg-white border-gray-200"
                  }`}>
                    <span className="absolute top-0 right-0 p-3 text-7xl font-mono text-gray-200/5 dark:text-white/3 font-black select-none">
                      Q
                    </span>
                    
                    <h3 className="text-sm md:text-base font-extrabold leading-relaxed mb-6">
                      {language === "bn" ? GRAMMAR_QUESTIONS[currentIdx].questionBn : GRAMMAR_QUESTIONS[currentIdx].questionEn}
                    </h3>

                    {/* Options list */}
                    <div className="grid grid-cols-1 gap-3">
                      {GRAMMAR_QUESTIONS[currentIdx].options.map((option, idx) => {
                        const isSelected = selectedAnswer === idx;
                        const correctIdx = GRAMMAR_QUESTIONS[currentIdx].correctIdx;
                        const isCorrectAnswer = idx === correctIdx;
                        
                        let cardClass = isDark 
                          ? "bg-slate-900 border-white/5 hover:border-white/10 text-slate-200" 
                          : "bg-white border-gray-200 hover:border-gray-300 text-slate-700";
                        
                        if (selectedAnswer !== null) {
                          if (isSelected) {
                            cardClass = isCorrectAnswer 
                              ? "bg-emerald-500/10 border-emerald-500 text-emerald-400 font-semibold" 
                              : "bg-red-500/10 border-red-500 text-red-500 font-semibold";
                          } else if (isCorrectAnswer) {
                            cardClass = "bg-emerald-500/10 border-emerald-500 text-emerald-400 font-semibold";
                          } else {
                            cardClass = "opacity-40 border-transparent cursor-not-allowed";
                          }
                        }

                        return (
                          <button
                            key={idx}
                            disabled={selectedAnswer !== null}
                            onClick={() => handleAnswerSelection(idx)}
                            className={`w-full p-4 rounded-2xl border text-left text-xs md:text-sm font-medium transition-all flex justify-between items-center cursor-pointer ${cardClass}`}
                          >
                            <span className="flex items-center gap-3">
                              <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px] font-mono font-bold">
                                {String.fromCharCode(65 + idx)}
                              </span>
                              <span>{option}</span>
                            </span>

                            {selectedAnswer !== null && isCorrectAnswer && (
                              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                            )}
                            {selectedAnswer !== null && isSelected && !isCorrectAnswer && (
                              <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Explanation Reveal */}
                    {selectedAnswer !== null && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`mt-6 p-4 rounded-2xl border text-xs leading-relaxed space-y-1.5 ${
                          isAnswerCorrect 
                            ? "bg-emerald-500/5 border-emerald-500/15" 
                            : "bg-red-500/5 border-red-500/15"
                        }`}
                      >
                        <p className="font-extrabold flex items-center gap-1.5 text-yellow-550 dark:text-yellow-400">
                          <Lightbulb className="w-4 h-4 text-yellow-500" />
                          <span>{language === "bn" ? "ভর্তি মেমোরি হ্যাক (HACK):" : "ACADEMIC TRICK:"}</span>
                        </p>
                        <p className="opacity-95 dark:text-gray-300">
                          {language === "bn" ? GRAMMAR_QUESTIONS[currentIdx].explanationBn : GRAMMAR_QUESTIONS[currentIdx].explanationEn}
                        </p>
                        
                        <div className="pt-4 flex justify-end">
                          <button
                            onClick={handleNextGrammar}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-white rounded-lg text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                          >
                            <span>{language === "bn" ? "পরবর্তী প্রশ্ন" : "NEXT QUESTION"}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SPELL BLITZ CLINICAL GAME */}
          {activeTab === "speller" && (
            <div className="space-y-6 max-w-lg mx-auto">
              <div className={`p-6 rounded-3xl border relative overflow-hidden ${
                isDark ? "bg-[#0c1017] border-white/5" : "bg-white border-gray-200"
              }`}>
                {/* Header info */}
                <div className="flex justify-between items-center border-b border-gray-150/10 pb-3 mb-4">
                  <div className="flex items-center gap-1.5 text-amber-500 font-bold text-xs">
                    <SpellCheck className="w-4 h-4 animate-bounce" />
                    <span>{language === "bn" ? "মেডিকেল স্পেলিং ট্রেনিং" : "CLINICAL SPELLER UNIT"}</span>
                  </div>
                  <span className="text-[10px] font-mono text-gray-400">
                    WORD {spellerWordIndex + 1}/{SPELLER_WORDS.length}
                  </span>
                </div>

                {/* Spell area */}
                <div className="space-y-4 py-2">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-gray-450 block font-mono">
                      {language === "bn" ? "বাংলা অর্থ ও ইঙ্গিত (MEANING & CLUE):" : "MEANING & BENGALI CLUE:"}
                    </p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white leading-normal">
                      {SPELLER_WORDS[spellerWordIndex].hintBn}
                    </p>
                  </div>

                  {/* Input field */}
                  <div className="space-y-2 pt-2">
                    <label className="text-[10px] font-mono text-gray-450 uppercase block font-bold">
                      {language === "bn" ? "সঠিক বানানটি লিখুন (CASE INSENSITIVE):" : "WRITE CORRECT SPELLING:"}
                    </label>
                    <input
                      type="text"
                      disabled={submittedSpelling}
                      value={userSpellingInput}
                      onChange={(e) => setUserSpellingInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && userSpellingInput.trim() && !submittedSpelling) {
                          checkSpelling();
                        }
                      }}
                      placeholder="e.g., L-i-e-u-t-e-n-a-n-t..."
                      className={`w-full px-4 py-3 rounded-xl focus:outline-none transition-all font-mono font-bold tracking-wide ${
                        submittedSpelling
                          ? spellingCorrect
                            ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                            : "bg-red-500/10 border-red-500 text-red-500"
                          : isDark
                          ? "bg-slate-900 border-white/5 text-white placeholder-slate-600 focus:border-yellow-500"
                          : "bg-white border-gray-250 text-slate-800 placeholder-gray-400 focus:border-[#C1121F]"
                      } border text-sm sm:text-base`}
                    />
                  </div>

                  {/* Hints Trigger */}
                  {!submittedSpelling && (
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => {
                          playSound("click");
                          setHintUsed(true);
                        }}
                        disabled={hintUsed}
                        className={`text-[10px] font-mono uppercase font-bold flex items-center gap-1 ${
                          hintUsed 
                            ? "text-gray-500 cursor-not-allowed opacity-50" 
                            : "text-amber-500 hover:text-amber-600 cursor-pointer"
                        }`}
                      >
                        <Lightbulb className="w-3.5 h-3.5" />
                        <span>{language === "bn" ? "বানানের সূত্র উন্মোচন" : "REVEAL LENGTH CLUE"}</span>
                      </button>
                      
                      <span className="text-[10px] font-mono text-gray-400">
                        {language === "bn" ? `অক্ষর সংখ্যা: ${SPELLER_WORDS[spellerWordIndex].word.length}` : `Length: ${SPELLER_WORDS[spellerWordIndex].word.length} letters`}
                      </span>
                    </div>
                  )}

                  {/* Character helper hints if used */}
                  {hintUsed && !submittedSpelling && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/15 text-[11px] font-mono text-amber-500"
                    >
                      {language === "bn" ? "বানানের ইঙ্গিত:" : "Spell Tip Helper:"}{" "}
                      <span className="font-bold tracking-widest">
                        {SPELLER_WORDS[spellerWordIndex].word.slice(0, 3)}...
                        {SPELLER_WORDS[spellerWordIndex].word.slice(-2)}
                      </span>
                    </motion.div>
                  )}

                  {/* Feedback line */}
                  {submittedSpelling && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-2xl border text-xs space-y-2 leading-relaxed ${
                        spellingCorrect ? "bg-emerald-500/5 border-emerald-500/25" : "bg-red-500/5 border-red-500/25"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        {spellingCorrect ? (
                          <>
                            <span className="text-emerald-500">🎉</span>
                            <span className="text-emerald-400">{language === "bn" ? "অভিনন্দন! বানানটি ১০০% নির্ভুল।" : "PERFECT SPELLING MATCH!"}</span>
                          </>
                        ) : (
                          <>
                            <span className="text-red-500">❌</span>
                            <span className="text-red-400">{language === "bn" ? "উফ! বানানটি ভুল হয়েছে।" : "INCORRECT SPELLING!"}</span>
                          </>
                        )}
                      </div>

                      <div className="text-[11px] opacity-95 dark:text-gray-300">
                        <span>{language === "bn" ? "সঠিক বানানটি মেমোরিতে সাজিয়ে নিন:" : "Target Spelling Key:"} </span>
                        <strong className="text-white bg-black font-mono px-2 py-0.5 rounded text-xs select-all tracking-wider border border-white/10">
                          {SPELLER_WORDS[spellerWordIndex].spellingTip}
                        </strong>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          onClick={nextSpellingWord}
                          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-white rounded-lg text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                        >
                          <span>{language === "bn" ? "পরবর্তী শব্দ" : "NEXT SPELL"}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Check action trigger */}
                  {!submittedSpelling && (
                    <button
                      disabled={!userSpellingInput.trim()}
                      onClick={checkSpelling}
                      className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black text-xs uppercase tracking-widest rounded-xl transition cursor-pointer mt-2"
                    >
                      {language === "bn" ? "বানান পরীক্ষা করুন" : "CONFIRM SPELLING"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
