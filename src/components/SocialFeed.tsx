import React, { useState, useEffect } from "react";
import { db, handleFirestoreError, OperationType } from "../firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { FeedPost, StudySquad, UserProfile, Question } from "../types";
import SquadChat from "./SquadChat";
import {
  Users, Send, Smile, ThumbsUp, Flame, Award, Plus, Trophy, Zap, Clock,
  ShieldCheck, ShieldAlert, Sparkles, CheckCircle, ChevronRight, UserPlus,
  UserMinus, Swords, BookOpen, Brain, HelpCircle, Compass, Edit2, Trash2, Image, Tag, CheckSquare
} from "lucide-react";

interface SocialFeedProps {
  user: UserProfile;
  dbQuestions?: Question[];
  onProfileUpdate?: (updates: Partial<UserProfile>) => Promise<void>;
  language?: "bn" | "en";
  theme?: "light" | "dark";
}

interface SquadChallenge {
  id: string;
  titleEn: string;
  titleBn: string;
  descriptionEn: string;
  descriptionBn: string;
  target: number;
  rewardXp: number;
  rewardCoins: number;
  category: "Biology" | "Chemistry" | "Physics";
}

const SQUAD_CHALLENGES: SquadChallenge[] = [
  {
    id: "biology_mastery",
    titleEn: "The Caduceus Breakthrough",
    titleBn: "ক্যাডুসিয়াস ব্রেকথ্রু (জীববিজ্ঞান)",
    descriptionEn: "Solve Biology MCQ questions as a squad to unlock neuro-cellular mastery.",
    descriptionBn: "নিউরো-সেলুলার নিয়ন্ত্রণ আনলক করতে স্কোয়াডগতভাবে জীববিজ্ঞান MCQ সমাধান করুন।",
    target: 50,
    rewardXp: 600,
    rewardCoins: 120,
    category: "Biology",
  },
  {
    id: "chemistry_fusion",
    titleEn: "Atomic Fusion Vanguard",
    titleBn: "অ্যাটমিক ফিউশন ভ্যানগার্ড (রসায়ন)",
    descriptionEn: "Master complex organic equations and thermodynamics concepts.",
    descriptionBn: "জটিল জৈব সমীকরণ এবং তাপগতিবিদ্যার ধারণার উপর স্কোয়াডগত বিজয় অর্জন করুন।",
    target: 40,
    rewardXp: 500,
    rewardCoins: 100,
    category: "Chemistry",
  },
  {
    id: "physics_vectors",
    titleEn: "Newtonian Kinetics Drill",
    titleBn: "নিউটনিয়ান গতিবিদ্যা ড্রিল (পদার্থবিজ্ঞান)",
    descriptionEn: "Align forces and work vectors in unison to dominate medical physics.",
    descriptionBn: "মেডিকেল ফিজিক্সে আধিপত্য বিস্তার করতে বল এবং কাজ ভেক্টরের সমন্বয় সাধন করুন।",
    target: 30,
    rewardXp: 400,
    rewardCoins: 80,
    category: "Physics",
  },
];

const EMBLEMS = [
  { id: "stethoscope", name: "Stethoscope Shield", icon: "🩺", color: "bg-teal-950 text-teal-400 border-teal-500" },
  { id: "neurology", name: "Neural Synapse", icon: "🧠", color: "bg-purple-950 text-purple-400 border-purple-500" },
  { id: "genetics", name: "DNA Double Helix", icon: "🧬", color: "bg-blue-950 text-blue-400 border-blue-500" },
  { id: "shield", name: "Bio-Immuno Shield", icon: "🛡️", color: "bg-emerald-950 text-emerald-400 border-emerald-500" },
  { id: "cardiology", name: "Cardio Striker", icon: "❤️", color: "bg-red-950 text-red-400 border-red-500" },
  { id: "pharmacy", name: "Chemical Fusion Lab", icon: "🧪", color: "bg-amber-950 text-amber-400 border-amber-500" },
];

const SQUAD_FALLBACK_QUESTIONS: Record<"Biology" | "Chemistry" | "Physics", Question[]> = {
  Biology: [
    {
      id: "bio_sq_1",
      questionText: "What is the powerhouse of the cell?",
      options: ["Lysosome", "Ribosome", "Mitochondria", "Nucleus"],
      correctAnswerIndex: 2,
      explanation: "Mitochondria generate most of the cell's supply of adenosine triphosphate (ATP), used as a source of chemical energy.",
      subject: "Biology",
      chapter: "Cell Biology",
      difficulty: "Medium",
    },
    {
      id: "bio_sq_2",
      questionText: "Which hormone reduces blood glucose levels?",
      options: ["Glucagon", "Insulin", "Adrenaline", "Thyroxine"],
      correctAnswerIndex: 1,
      explanation: "Insulin, secreted by beta cells of pancreas, enables cells to absorb glucose from the bloodstream, thereby lowering blood sugar.",
      subject: "Biology",
      chapter: "Endocrine System",
      difficulty: "Medium",
    },
    {
      id: "bio_sq_3",
      questionText: "Which type of blood vessel carries oxygenated blood away from the heart?",
      options: ["Veins", "Capillaries", "Arteries", "Venules"],
      correctAnswerIndex: 2,
      explanation: "Arteries carry oxygen-rich blood away from the heart, except for the pulmonary artery which carries oxygen-poor blood to the lungs.",
      subject: "Biology",
      chapter: "Circulatory System",
      difficulty: "Medium",
    },
    {
      id: "bio_sq_4",
      questionText: "Where does transcription occur in a eukaryotic cell?",
      options: ["Cytoplasm", "Nucleus", "Ribosome", "Endoplasmic Reticulum"],
      correctAnswerIndex: 1,
      explanation: "Transcription is the process of making an RNA copy of a gene sequence, which occurs inside the eukaryotic nucleus.",
      subject: "Biology",
      chapter: "Genetics",
      difficulty: "Hard",
    },
    {
      id: "bio_sq_5",
      questionText: "Which cranial nerve is primarily responsible for vision?",
      options: ["Olfactory (I)", "Optic (II)", "Oculomotor (III)", "Trochlear (IV)"],
      correctAnswerIndex: 1,
      explanation: "The optic nerve (CN II) transmits visual information from the retina to the brain.",
      subject: "Biology",
      chapter: "Nervous System",
      difficulty: "Hard",
    }
  ],
  Chemistry: [
    {
      id: "chem_sq_1",
      questionText: "Which of the following is a strong acid?",
      options: ["CH3COOH", "H2CO3", "HCl", "HCN"],
      correctAnswerIndex: 2,
      explanation: "Hydrochloric acid (HCl) dissociates completely in water, making it a strong mineral acid.",
      subject: "Chemistry",
      chapter: "Acids and Bases",
      difficulty: "Medium",
    },
    {
      id: "chem_sq_2",
      questionText: "What is the oxidation state of sulfur in H2SO4?",
      options: ["+4", "+2", "+6", "-2"],
      correctAnswerIndex: 2,
      explanation: "In H2SO4, H is +1 and O is -2. So, 2(+1) + S + 4(-2) = 0 => S = +6.",
      subject: "Chemistry",
      chapter: "Redox Reactions",
      difficulty: "Medium",
    },
    {
      id: "chem_sq_3",
      questionText: "What is the main component of natural gas?",
      options: ["Ethane", "Propane", "Butane", "Methane"],
      correctAnswerIndex: 3,
      explanation: "Methane (CH4) is the primary constituent of natural gas, typically making up about 70-90% of its volume.",
      subject: "Chemistry",
      chapter: "Organic Chemistry",
      difficulty: "Medium",
    },
    {
      id: "chem_sq_4",
      questionText: "Which gas is released when a metal reacts with hydrochloric acid?",
      options: ["Oxygen", "Carbon Dioxide", "Hydrogen", "Nitrogen"],
      correctAnswerIndex: 2,
      explanation: "Metals react with acids to produce a salt and release hydrogen gas (H2).",
      subject: "Chemistry",
      chapter: "Inorganic Chemistry",
      difficulty: "Easy",
    },
    {
      id: "chem_sq_5",
      questionText: "Which law states that pressure is inversely proportional to volume at constant temperature?",
      options: ["Charles's Law", "Boyle's Law", "Avogadro's Law", "Dalton's Law"],
      correctAnswerIndex: 1,
      explanation: "Boyle's Law relates pressure (P) and volume (V) of an ideal gas at constant temperature: P1V1 = P2V2 (inversely proportional).",
      subject: "Chemistry",
      chapter: "Gases",
      difficulty: "Medium",
    }
  ],
  Physics: [
    {
      id: "phys_sq_1",
      questionText: "What is the SI unit of electric charge?",
      options: ["Volt", "Ampere", "Coulomb", "Ohm"],
      correctAnswerIndex: 2,
      explanation: "The Coulomb (C) is the SI unit of electric charge, representing the amount of charge transported by a constant current of one ampere in one second.",
      subject: "Physics",
      chapter: "Electricity",
      difficulty: "Easy",
    },
    {
      id: "phys_sq_2",
      questionText: "According to Einstein's mass-energy equivalence, E equals:",
      options: ["mc", "m^2c", "mc^2", "m/c"],
      correctAnswerIndex: 2,
      explanation: "The famous equation is E = mc^2, where E is energy, m is mass, and c is the speed of light.",
      subject: "Physics",
      chapter: "Modern Physics",
      difficulty: "Easy",
    },
    {
      id: "phys_sq_3",
      questionText: "Which type of lens is used to correct myopia (nearsightedness)?",
      options: ["Convex lens", "Concave lens", "Cylindrical lens", "Bifocal lens"],
      correctAnswerIndex: 1,
      explanation: "A concave lens is diverging, which helps in spreading light rays before they hit the eye lens, correcting nearsightedness (myopia).",
      subject: "Physics",
      chapter: "Optics",
      difficulty: "Medium",
    },
    {
      id: "phys_sq_4",
      questionText: "What is the acceleration due to gravity on the surface of Earth (approximate)?",
      options: ["9.8 m/s^2", "9.8 cm/s^2", "1.6 m/s^2", "3.0 x 10^8 m/s^2"],
      correctAnswerIndex: 0,
      explanation: "The acceleration due to gravity is approximately 9.8 m/s^2 near the Earth's surface.",
      subject: "Physics",
      chapter: "Gravity",
      difficulty: "Easy",
    },
    {
      id: "phys_sq_5",
      questionText: "Which phenomenon explains why light bends when passing from water to air?",
      options: ["Reflection", "Refraction", "Diffraction", "Polarization"],
      correctAnswerIndex: 1,
      explanation: "Refraction is the bending of light as it passes from one medium to another with a different refractive index.",
      subject: "Physics",
      chapter: "Optics",
      difficulty: "Easy",
    }
  ],
};

const getSquadLevelInfo = (xp: number) => {
  if (xp < 1000) {
    return { level: 1, nextXp: 1000, titleBn: "ব্রোঞ্জ অ্যালায়েন্স", titleEn: "Bronze Alliance", color: "text-amber-500", bg: "bg-amber-500/20", progress: (xp / 1000) * 100 };
  } else if (xp < 2500) {
    return { level: 2, nextXp: 2500, titleBn: "সিলভার ব্যাটালিয়ন", titleEn: "Silver Battalion", color: "text-slate-400", bg: "bg-slate-400/20", progress: ((xp - 1000) / 1500) * 100 };
  } else if (xp < 5000) {
    return { level: 3, nextXp: 5000, titleBn: "গোল্ড ভ্যানগার্ড", titleEn: "Gold Vanguard", color: "text-yellow-400", bg: "bg-yellow-400/20", progress: ((xp - 2500) / 2500) * 100 };
  } else if (xp < 10000) {
    return { level: 4, nextXp: 10000, titleBn: "এলিট মেডিকেল কর্পস", titleEn: "Elite Medical Corps", color: "text-red-400", bg: "bg-red-400/20", progress: ((xp - 5000) / 5000) * 100 };
  } else {
    return { level: 5, nextXp: 10000, titleBn: "অ্যাপেক্স লিজেন্ডস", titleEn: "Apex Legends Vanguard", color: "text-[#FFD700]", bg: "bg-[#FFD700]/20", progress: 100 };
  }
};

const getMemberDetails = (uid: string, currentUser: UserProfile) => {
  if (uid === currentUser.uid) {
    return {
      displayName: currentUser.displayName,
      avatarUrl: currentUser.avatarUrl,
      level: currentUser.level || 1,
      xp: currentUser.xp || 100,
      college: currentUser.college || "Viqarunnisa Noon College",
    };
  }
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash << 5) - hash + uid.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash);
  const names = [
    "Arifur Rahman (SMC)", "Tahmina Akhter (DMC)", "Sujon Ahmed (Mymensingh)",
    "Fariha Islam (CMC)", "Zahid Hasan (RMC)", "Nabila Karim (Sylhet MC)",
    "Tanvir Anjum (Sher-e-Bangla MC)", "Anika Tabassum (PMC)"
  ];
  const colleges = [
    "Notre Dame College", "Dhaka College", "Rajshahi College",
    "Holy Cross College", "Viqarunnisa Noon", "Cantonment Public College",
    "Chittagong College", "Sylhet MC College"
  ];
  const name = names[index % names.length];
  const college = colleges[index % colleges.length];
  const level = (index % 8) + 3;
  const xp = level * 650 + (index % 400);

  return {
    displayName: name,
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
    level,
    xp,
    college,
  };
};

export default function SocialFeed({
  user,
  dbQuestions = [],
  onProfileUpdate,
  language = "bn",
  theme = "dark"
}: SocialFeedProps) {
  const isDark = theme === "dark";
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [squads, setSquads] = useState<StudySquad[]>([]);
  const [newPostText, setNewPostText] = useState("");
  const [loadingPosts, setLoadingPosts] = useState(true);
  const isBn = language === "bn";

  // Doubt system states
  const [isDoubt, setIsDoubt] = useState(true);
  const [doubtSubject, setDoubtSubject] = useState("Biology");
  const [doubtChapter, setDoubtChapter] = useState("");
  const [doubtImageUrl, setDoubtImageUrl] = useState("");
  const [imageFileLoading, setImageFileLoading] = useState(false);

  // Edit Doubt states
  const [editingPost, setEditingPost] = useState<FeedPost | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editSubject, setEditSubject] = useState("Biology");
  const [editChapter, setEditChapter] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editIsDoubt, setEditIsDoubt] = useState(true);

  // Navigation tab for the social center
  const [socialSubTab, setSocialSubTab] = useState<"feed" | "squads" | "doubts">("feed");

  // Doubt board filtering states
  const [doubtFilterSubject, setDoubtFilterSubject] = useState<string>("All");
  const [doubtFilterSolved, setDoubtFilterSolved] = useState<"All" | "Solved" | "Open">("All");

  // Squad form states
  const [showCreateSquad, setShowCreateSquad] = useState(false);
  const [squadName, setSquadName] = useState("");
  const [squadDesc, setSquadDesc] = useState("");
  const [squadMotto, setSquadMotto] = useState("");
  const [selectedEmblem, setSelectedEmblem] = useState("stethoscope");

  // Interactive Squad Challenge Drill states
  const [activeChallengeDrill, setActiveChallengeDrill] = useState<SquadChallenge | null>(null);
  const [drillQuestions, setDrillQuestions] = useState<Question[]>([]);
  const [drillCurrentIndex, setDrillCurrentIndex] = useState(0);
  const [drillSelectedAnswer, setDrillSelectedAnswer] = useState<number | null>(null);
  const [drillAnswersHistory, setDrillAnswersHistory] = useState<boolean[]>([]);
  const [drillFinished, setDrillFinished] = useState(false);
  const [drillCorrectCount, setDrillCorrectCount] = useState(0);

  // Friends states
  const [friends, setFriends] = useState<UserProfile[]>([
    {
      uid: "f1",
      displayName: "Maimuna (PMC)",
      email: "maimuna@pmc.edu",
      college: "Viqarunnisa Noon School & College",
      district: "Dhaka",
      level: 6,
      xp: 2450,
      coins: 400,
      rank: "Scholar",
      dailyStreak: 12,
      lastActiveDate: "2026-06-15",
      questionsSolved: 240,
      questionsCorrect: 204,
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maimuna",
      role: "student",
      createdAt: null,
      characterId: "immunoshield",
    },
    {
      uid: "f2",
      displayName: "Rafsan (DMC)",
      email: "rafsan@dmc.edu",
      college: "Notre Dame College",
      district: "Rajshahi",
      level: 8,
      xp: 4100,
      coins: 920,
      rank: "Elite",
      dailyStreak: 15,
      lastActiveDate: "2026-06-14",
      questionsSolved: 512,
      questionsCorrect: 470,
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rafsan",
      role: "student",
      createdAt: null,
      characterId: "cardio_striker",
    },
  ]);

  // Read Feed Posts in real-time
  useEffect(() => {
    const qPosts = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(25));
    const unsubscribe = onSnapshot(
      qPosts,
      (snapshot) => {
        const loaded: FeedPost[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          loaded.push({
            id: doc.id,
            ...data,
          } as FeedPost);
        });
        setPosts(loaded);
        setLoadingPosts(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "posts");
        setLoadingPosts(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Read Study Squadueries in real-time
  useEffect(() => {
    const qSquads = query(collection(db, "squads"), orderBy("teamXp", "desc"), limit(10));
    const unsubscribe = onSnapshot(
      qSquads,
      (snapshot) => {
        const loaded: StudySquad[] = [];
        snapshot.forEach((doc) => {
          loaded.push({
            id: doc.id,
            ...doc.data(),
          } as StudySquad);
        });
        setSquads(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "squads");
      }
    );

    return () => unsubscribe();
  }, []);

  // Image selection reader
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800000) { // Limit to 800KB
      alert(isBn ? "ফাইলের সাইজ অবশ্যই ৮০০ কেবির নিচে হতে হবে!" : "Image size must be under 800KB!");
      return;
    }

    const reader = new FileReader();
    if (isEdit) {
      setEditImageUrl("");
    } else {
      setDoubtImageUrl("");
    }
    
    setImageFileLoading(true);
    reader.onload = () => {
      const resultStr = reader.result as string;
      if (isEdit) {
        setEditImageUrl(resultStr);
      } else {
        setDoubtImageUrl(resultStr);
      }
      setImageFileLoading(false);
    };
    reader.onerror = () => {
      alert("Error reading file");
      setImageFileLoading(false);
    };
    reader.readAsDataURL(file);
  };

  // Submit Feed Post / Doubt Question
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim()) return;

    try {
      const postPayload: Omit<FeedPost, "id"> = {
        userId: user.uid,
        userDisplayName: user.displayName,
        userAvatar: user.avatarUrl,
        userRank: user.rank,
        content: newPostText,
        likes: 0,
        fires: 0,
        claps: 0,
        likedBy: [],
        firedBy: [],
        clappedBy: [],
        createdAt: serverTimestamp(),
        // Doubt attributes
        isDoubt: isDoubt,
        doubtSubject: isDoubt ? doubtSubject : "",
        doubtChapter: isDoubt ? doubtChapter : "",
        doubtImageUrl: isDoubt ? doubtImageUrl : "",
        doubtSolved: isDoubt ? false : false,
      };

      await addDoc(collection(db, "posts"), postPayload);
      setNewPostText("");
      setDoubtChapter("");
      setDoubtImageUrl("");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, "posts");
    }
  };

  // Delete Feed Post / Doubt
  const handleDeletePost = async (postId: string) => {
    if (!window.confirm(isBn ? "আপনি কি এই ডাউট প্রশ্নটি মুছে ফেলতে চান?" : "Are you sure you want to delete this doubt question?")) {
      return;
    }
    try {
      await deleteDoc(doc(db, "posts", postId));
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `posts/${postId}`);
    }
  };

  // Setup editing fields
  const startEditPost = (post: FeedPost) => {
    setEditingPost(post);
    setEditContent(post.content);
    setEditSubject(post.doubtSubject || "Biology");
    setEditChapter(post.doubtChapter || "");
    setEditImageUrl(post.doubtImageUrl || "");
    setEditIsDoubt(post.isDoubt !== false);
  };

  // Submit updated doubt / post
  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost) return;
    if (!editContent.trim()) return;

    try {
      const postRef = doc(db, "posts", editingPost.id);
      await updateDoc(postRef, {
        content: editContent,
        isDoubt: editIsDoubt,
        doubtSubject: editIsDoubt ? editSubject : "",
        doubtChapter: editIsDoubt ? editChapter : "",
        doubtImageUrl: editIsDoubt ? editImageUrl : "",
      });
      setEditingPost(null);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `posts/${editingPost.id}`);
    }
  };

  // Toggle solved / unsolved
  const handleToggleSolved = async (postId: string, currentStatus: boolean) => {
    try {
      const postRef = doc(db, "posts", postId);
      await updateDoc(postRef, {
        doubtSolved: !currentStatus,
      });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `posts/${postId}`);
    }
  };

  // Submit Quick Achievement Post Helper
  const triggerStreakShare = async () => {
    try {
      const content = `🔥 streak master active! I'm keeping my ${user.dailyStreak}-day medical prep daily study lock active on MediBridge Games! Can you defeat my high score?`;
      const postPayload: Omit<FeedPost, "id"> = {
        userId: user.uid,
        userDisplayName: user.displayName,
        userAvatar: user.avatarUrl,
        userRank: user.rank,
        content,
        streakCount: user.dailyStreak,
        achievementType: "Streak King",
        likes: 1,
        fires: 2,
        claps: 1,
        likedBy: [user.uid],
        firedBy: [],
        clappedBy: [],
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, "posts"), postPayload);
      alert("Shared your daily streak to the national Study Feed!");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, "posts");
    }
  };

  // Handle emoji reaction toggles
  const handleReaction = async (postId: string, reactionType: "likes" | "fires" | "claps") => {
    try {
      const postRef = doc(db, "posts", postId);
      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      const userUid = user.uid;
      let arrayField: "likedBy" | "firedBy" | "clappedBy" = "likedBy";
      if (reactionType === "fires") arrayField = "firedBy";
      if (reactionType === "claps") arrayField = "clappedBy";

      const currentList = post[arrayField] || [];
      const hasReacted = currentList.includes(userUid);

      let newCount = post[reactionType] || 0;
      let newList = [...currentList];

      if (hasReacted) {
        newCount = Math.max(0, newCount - 1);
        newList = newList.filter((id) => id !== userUid);
      } else {
        newCount = newCount + 1;
        newList.push(userUid);
      }

      await updateDoc(postRef, {
        [reactionType]: newCount,
        [arrayField]: newList,
      });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `posts/${postId}`);
    }
  };

  // Create Study Squad Team
  const handleCreateSquad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!squadName.trim()) return;

    const isUserInAnySquad = squads.some(s => s.members?.includes(user.uid));
    if (isUserInAnySquad) {
      alert("You are already in a Study Squad! Please leave your current squad before creating a new one.");
      return;
    }

    try {
      const squadPayload: any = {
        name: squadName,
        description: squadDesc || "Standard team of medical legends grinding high-yield MCQs.",
        motto: squadMotto || "Per Aspera Ad Astra!",
        logoUrl: `emblem:${selectedEmblem}`,
        creatorId: user.uid,
        teamXp: 150, // starter XP
        level: 1,
        memberCount: 1,
        members: [user.uid],
        challengeProgress: {
          biology_mastery: 0,
          chemistry_fusion: 0,
          physics_vectors: 0,
        },
        memberContributions: {
          [user.uid]: 100, // Starter contribution credit
        },
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "squads"), squadPayload);
      
      // Post announcement on Feed
      const broadcastContent = `🏆 NEW STUDY GUILD INAUGURATED! **${user.displayName}** has commissioned a new Study Squad **"${squadName}"**! Slogan: *"${squadPayload.motto}"*. Join them now to conquer the national rankings!`;
      await addDoc(collection(db, "posts"), {
        userId: user.uid,
        userDisplayName: user.displayName,
        userAvatar: user.avatarUrl,
        userRank: user.rank || "Aspirant",
        content: broadcastContent,
        achievementType: "New Guild",
        streakCount: 1,
        likes: 2,
        fires: 1,
        claps: 2,
        likedBy: [user.uid],
        firedBy: [],
        clappedBy: [],
        createdAt: serverTimestamp(),
      });

      setSquadName("");
      setSquadDesc("");
      setSquadMotto("");
      setShowCreateSquad(false);
      alert(`Study Squad "${squadName}" successfully commissioned!`);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, "squads");
    }
  };

  // Join Existing Squad
  const handleJoinSquad = async (squadId: string) => {
    const isUserInAnySquad = squads.some(s => s.members?.includes(user.uid));
    if (isUserInAnySquad) {
      alert("You are already in a Study Squad! Please leave your current squad before joining another.");
      return;
    }

    try {
      const squadRef = doc(db, "squads", squadId);
      const squad = squads.find((s) => s.id === squadId);
      if (!squad) return;

      const currentMembers = Array.isArray(squad.members) ? squad.members : [];
      if (currentMembers.includes(user.uid)) {
        alert("You are already a member of this Squad!");
        return;
      }

      const updatedMembers = [...currentMembers, user.uid];
      const currentContributions = squad.memberContributions || {};
      const updatedContributions = {
        ...currentContributions,
        [user.uid]: 50, // Welcome points
      };

      await updateDoc(squadRef, {
        members: updatedMembers,
        memberCount: updatedMembers.length,
        teamXp: squad.teamXp + 250, // bonus XP for recruiting another gladiator
        memberContributions: updatedContributions,
      });

      // Post join on Feed
      const broadcastContent = `⚔️ RECRUIT ALLIANCE! **${user.displayName}** has joined the ranks of Study Squad **"${squad.name}"**! Team XP grew by **+250**!`;
      await addDoc(collection(db, "posts"), {
        userId: user.uid,
        userDisplayName: user.displayName,
        userAvatar: user.avatarUrl,
        userRank: user.rank || "Aspirant",
        content: broadcastContent,
        achievementType: "Squad Join",
        streakCount: 1,
        likes: 1,
        fires: 1,
        claps: 1,
        likedBy: [user.uid],
        firedBy: [],
        clappedBy: [],
        createdAt: serverTimestamp(),
      });

      // Award small reward to user
      if (onProfileUpdate) {
        await onProfileUpdate({
          xp: (user.xp || 0) + 100,
          coins: (user.coins || 0) + 20,
        });
      }

      alert(`Joined Team ${squad.name}! Gained +250 Team XP! Received +100 XP and +20 Coins welcome bonus!`);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `squads/${squadId}`);
    }
  };

  // Leave Existing Squad
  const handleLeaveSquad = async (squadId: string) => {
    if (!window.confirm("Are you sure you want to leave this Study Squad? You will lose your team bonus multiplier and contribution log!")) {
      return;
    }

    try {
      const squadRef = doc(db, "squads", squadId);
      const squad = squads.find((s) => s.id === squadId);
      if (!squad) return;

      const updatedMembers = squad.members.filter(m => m !== user.uid);
      const updatedContributions = { ...(squad.memberContributions || {}) };
      delete updatedContributions[user.uid];

      await updateDoc(squadRef, {
        members: updatedMembers,
        memberCount: updatedMembers.length,
        memberContributions: updatedContributions,
      });

      // Post leave on Feed
      const broadcastContent = `🏃 GUILD DEPARTURE! **${user.displayName}** has departed from Study Squad **"${squad.name}"** to seek their own path.`;
      await addDoc(collection(db, "posts"), {
        userId: user.uid,
        userDisplayName: user.displayName,
        userAvatar: user.avatarUrl,
        userRank: user.rank || "Aspirant",
        content: broadcastContent,
        achievementType: "Squad Leave",
        streakCount: 0,
        likes: 0,
        fires: 0,
        claps: 0,
        likedBy: [],
        firedBy: [],
        clappedBy: [],
        createdAt: serverTimestamp(),
      });

      alert(`Successfully left Study Squad "${squad.name}".`);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `squads/${squadId}`);
    }
  };

  // Start Interactive Mini-Drill for Squad Challenge
  const startMiniDrill = (challenge: SquadChallenge) => {
    // Collect questions matching challenge category
    let matchedQuestions = (dbQuestions || []).filter(
      q => q.subject?.toLowerCase() === challenge.category.toLowerCase()
    );

    // If matching questions is fewer than 5, pad or override with SQUAD_FALLBACK_QUESTIONS
    if (matchedQuestions.length < 5) {
      const fallbackSet = SQUAD_FALLBACK_QUESTIONS[challenge.category] || [];
      matchedQuestions = [...matchedQuestions, ...fallbackSet];
    }

    // Get unique questions and shuffle
    const uniqueMap = new Map();
    matchedQuestions.forEach(q => uniqueMap.set(q.questionText, q));
    const uniqueList = Array.from(uniqueMap.values());
    const selected = uniqueList.sort(() => 0.5 - Math.random()).slice(0, 5);

    setDrillQuestions(selected);
    setActiveChallengeDrill(challenge);
    setDrillCurrentIndex(0);
    setDrillSelectedAnswer(null);
    setDrillAnswersHistory([]);
    setDrillCorrectCount(0);
    setDrillFinished(false);
  };

  // Submit Answer in Mini-Drill
  const submitDrillAnswer = (optionIdx: number) => {
    if (drillSelectedAnswer !== null) return; // already selected
    
    setDrillSelectedAnswer(optionIdx);
    const currentQuestion = drillQuestions[drillCurrentIndex];
    const isCorrect = optionIdx === currentQuestion.correctAnswerIndex;
    
    setDrillAnswersHistory([...drillAnswersHistory, isCorrect]);
    if (isCorrect) {
      setDrillCorrectCount(prev => prev + 1);
    }
  };

  // Proceed to next question in Mini-Drill
  const nextDrillQuestion = () => {
    if (drillCurrentIndex < 4) {
      setDrillCurrentIndex(prev => prev + 1);
      setDrillSelectedAnswer(null);
    } else {
      handleCompleteDrill();
    }
  };

  // Complete Mini-Drill and save state
  const handleCompleteDrill = async () => {
    if (!activeChallengeDrill) return;
    
    const mySquad = squads.find(s => s.members?.includes(user.uid));
    if (!mySquad) return;

    const correctCount = drillCorrectCount;
    const gainedXp = correctCount * 40; // 40 XP per correct answer
    const gainedCoins = correctCount * 12; // 12 coins per correct answer
    const teamXpAdded = correctCount * 50 + 50; // Team XP: 50 per correct answer + 50 synergy bonus

    try {
      const squadRef = doc(db, "squads", mySquad.id);
      const challengeId = activeChallengeDrill.id;
      
      const currentProgress = mySquad.challengeProgress || {};
      const newProgressCount = (currentProgress[challengeId] || 0) + correctCount;
      const target = activeChallengeDrill.target;

      const updatedProgress = {
        ...currentProgress,
        [challengeId]: newProgressCount
      };

      let bonusTeamXp = 0;
      let challengeFinishedMessage = "";

      const wasCompletedBefore = (currentProgress[challengeId] || 0) >= target;
      const isCompletedNow = newProgressCount >= target;

      if (!wasCompletedBefore && isCompletedNow) {
        bonusTeamXp = activeChallengeDrill.rewardXp;
        challengeFinishedMessage = `\n\n🏆 MISSION ACCOMPLISHED! Squad "${mySquad.name}" has officially completed the "${activeChallengeDrill.titleEn}"! Team rewarded with **+${activeChallengeDrill.rewardXp} XP**!`;
      }

      const rawNewXp = (mySquad.teamXp || 100) + teamXpAdded + bonusTeamXp;
      
      // Calculate dynamic level up for squad
      const currentLevelInfo = getSquadLevelInfo(mySquad.teamXp || 100);
      const nextLevelInfo = getSquadLevelInfo(rawNewXp);
      let levelUpMessage = "";
      if (nextLevelInfo.level > currentLevelInfo.level) {
        levelUpMessage = `\n\n⭐ SQUAD LEVEL UP! "${mySquad.name}" has ascended to **Level ${nextLevelInfo.level} (${nextLevelInfo.titleEn})**!`;
      }

      const currentContributions = mySquad.memberContributions || {};
      const newUserContribution = (currentContributions[user.uid] || 0) + teamXpAdded;

      const updatedContributions = {
        ...currentContributions,
        [user.uid]: newUserContribution
      };

      await updateDoc(squadRef, {
        teamXp: rawNewXp,
        level: nextLevelInfo.level,
        challengeProgress: updatedProgress,
        memberContributions: updatedContributions,
      });

      // Post broadcast announcement
      const broadcastContent = `🛡️ SQUAD DRILL VICTOR! **${user.displayName}** completed the **${activeChallengeDrill.titleEn}** drill with **${correctCount}/5** correct answers, contributing **+${teamXpAdded} Team XP** to **"${mySquad.name}"**!${challengeFinishedMessage}${levelUpMessage}`;
      
      await addDoc(collection(db, "posts"), {
        userId: user.uid,
        userDisplayName: user.displayName,
        userAvatar: user.avatarUrl,
        userRank: user.rank || "Aspirant",
        content: broadcastContent,
        achievementType: "Squad Drill",
        streakCount: correctCount,
        likes: 2,
        fires: 2,
        claps: 2,
        likedBy: [user.uid],
        firedBy: [],
        clappedBy: [],
        createdAt: serverTimestamp(),
      });

      // Award individual rewards to user
      if (onProfileUpdate) {
        await onProfileUpdate({
          xp: (user.xp || 0) + gainedXp,
          coins: (user.coins || 0) + gainedCoins,
        });
      }

      setDrillFinished(true);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `squads/${mySquad.id}`);
    }
  };

  // Simulation: Add random new Aspirant as friend
  const addRandomFriend = () => {
    const names = ["Tofazzal (DMC)", "Samiha (SMC)", "Farhan (Mymensingh)", "Nusrat (CMC)"];
    const randomName = names[Math.floor(Math.random() * names.length)];
    const colleges = ["Notre Dame College", "Rajuk Uttara Model College", "Govt. Science College", "Holy Cross College"];
    const randomCol = colleges[Math.floor(Math.random() * colleges.length)];
    const districts = ["Sylhet", "Chattogram", "Khulna", "Barishal"];
    const randomDist = districts[Math.floor(Math.random() * districts.length)];

    const newFriend: UserProfile = {
      uid: "f_rand_" + Math.random().toString(36).substring(7),
      displayName: randomName,
      email: `${randomName.toLowerCase().replace(/[^a-z]/g, "")}@edu.bd`,
      college: randomCol,
      district: randomDist,
      level: Math.floor(Math.random() * 5) + 2,
      xp: Math.floor(Math.random() * 1500) + 500,
      coins: 200,
      rank: "Learner",
      dailyStreak: Math.floor(Math.random() * 8) + 1,
      lastActiveDate: "2026-06-15",
      questionsSolved: Math.floor(Math.random() * 100) + 10,
      questionsCorrect: Math.floor(Math.random() * 80) + 8,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomName}`,
      role: "student",
      createdAt: null,
      characterId: "gene_hacker",
    };

    setFriends([...friends, newFriend]);
    alert(`Acquired new alliance! Added ${randomName} to your Friend Squad!`);
  };

  const myActiveSquad = squads.find(s => s.members?.includes(user.uid));

  const renderEmblemIcon = (logoUrl: string, sizeClass = "w-10 h-10") => {
    if (logoUrl?.startsWith("emblem:")) {
      const emblemId = logoUrl.split(":")[1];
      const emb = EMBLEMS.find(e => e.id === emblemId) || EMBLEMS[0];
      return (
        <div className={`rounded-xl flex items-center justify-center border font-display ${sizeClass} ${emb.color}`}>
          <span className="text-xl">{emb.icon}</span>
        </div>
      );
    }
    return (
      <img
        src={logoUrl || "https://api.dicebear.com/7.x/identicon/svg?seed=fallback"}
        alt="Squad Logo"
        className={`${sizeClass} rounded-xl bg-neutral-900 object-contain`}
      />
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* SOCIAL SYSTEM NAVIGATION SUB-TABS */}
      <div className={`grid grid-cols-3 border rounded-2xl font-mono text-xs leading-none font-black text-center uppercase tracking-wider relative overflow-hidden ${
        isDark ? "bg-black border-white/10" : "bg-slate-50 border-red-100"
      }`}>
        <button
          onClick={() => { setSocialSubTab("feed"); setIsDoubt(false); }}
          className={`py-4 transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
            socialSubTab === "feed"
              ? "bg-[#C1121F] text-white shadow-inner"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
          id="tab-social-feed"
        >
          <Users className="w-4 h-4" />
          <span>{isBn ? "পাবলিক ফিড" : "Public Feed"}</span>
        </button>
        <button
          onClick={() => setSocialSubTab("squads")}
          className={`py-4 transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
            socialSubTab === "squads"
              ? "bg-[#C1121F] text-white shadow-inner"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
          id="tab-social-squads"
        >
          <Swords className="w-4 h-4" />
          <span>{isBn ? "স্কোয়াড" : "Squad HQ"}</span>
        </button>
        <button
          onClick={() => { setSocialSubTab("doubts"); setIsDoubt(true); }}
          className={`py-4 transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
            socialSubTab === "doubts"
              ? "bg-[#C1121F] text-white shadow-inner"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
          id="tab-social-doubts"
        >
          <HelpCircle className="w-4 h-4" />
          <span>{isBn ? "ডাউট সলভ" : "Doubt Solve"}</span>
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* LEFT & CENTER PANEL: Feed or Squad Panel */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {socialSubTab === "feed" ? (
            <>
        
        {/* Share Quick Achievement Box */}
        <div className="bg-[#111111] border border-white/10 rounded-2xl p-5 flex flex-col md:flex-row items-center gap-4 justify-between relative overflow-hidden">
          <div className="flex items-center gap-3">
            <span className="text-3xl text-[#FFD700]">🔥</span>
            <div>
              <h3 className="font-bold uppercase text-sm tracking-wider font-display">{isBn ? "আপনার অর্জন শেয়ার করুন!" : "SHARE YOUR COMPLETED CAMPAIGN!"}</h3>
              <p className="text-xs text-gray-400">{isBn ? `অন্যান্য পরীক্ষার্থীদের অনুপ্রাণিত করতে আপনার ${user.dailyStreak}-দিনের পড়ার স্ট্রিক প্রকাশ করুন।` : `Broadcast your current ${user.dailyStreak}-day study streak to inspire other medical candidates.`}</p>
            </div>
          </div>
          <button
            onClick={triggerStreakShare}
            className="px-5 py-2.5 bg-[#FFD700] hover:bg-[#FFD700]/90 text-black font-black uppercase text-xs tracking-wider rounded-xl transition duration-300 min-w-[150px] text-center font-display shadow-[0_0_15px_rgba(255,215,0,0.25)] cursor-pointer"
            id="btn-feed-share-streak"
          >
            {isBn ? "স্ট্রিক শেয়ার করুন" : "SHARE STREAK NOW"}
          </button>
        </div>

        {/* Create Doubt / Post Form */}
        <form onSubmit={handleCreatePost} className="bg-[#111111] border border-white/10 rounded-2xl p-5 relative flex flex-col gap-4">
          <div className="absolute top-0 left-6 h-1 w-20 bg-[#C1121F]"></div>
          
          {/* Toggle between Doubt Question and General Post */}
          <div className="flex border-b border-white/5 pb-3 justify-between items-center">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsDoubt(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition flex items-center gap-1.5 ${
                  isDoubt 
                    ? "bg-[#C1121F]/20 text-[#C1121F] border border-[#C1121F]/40" 
                    : "bg-transparent text-gray-400 hover:text-white"
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                {isBn ? "ডাউট প্রশ্ন জিজ্ঞেস করুন" : "Ask a Doubt Question"}
              </button>
              <button
                type="button"
                onClick={() => setIsDoubt(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition flex items-center gap-1.5 ${
                  !isDoubt 
                    ? "bg-[#C1121F]/20 text-[#C1121F] border border-[#C1121F]/40" 
                    : "bg-transparent text-gray-400 hover:text-white"
                }`}
              >
                <Smile className="w-3.5 h-3.5" />
                {isBn ? "সাধারণ পোস্ট" : "General Study Post"}
              </button>
            </div>
            <span className="text-[10px] text-gray-500 font-mono hidden md:inline">
              {isBn ? "লাইভ ডাউট প্ল্যাটফর্ম" : "LIVE DOUBT CENTER"}
            </span>
          </div>

          {/* Subject & Chapter Selection for Doubts */}
          {isDoubt && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-fadeIn">
              {/* Subject dropdown */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono font-black text-gray-400 uppercase flex items-center gap-1">
                  <Tag className="w-3 h-3 text-[#C1121F]" /> {isBn ? "বিষয় নির্বাচন" : "Select Subject"}
                </label>
                <select
                  value={doubtSubject}
                  onChange={(e) => setDoubtSubject(e.target.value)}
                  className="w-full bg-[#0A0A0A] text-xs text-white border border-white/10 rounded-lg p-2.5 focus:outline-none focus:border-[#C1121F]"
                >
                  <option value="Biology">{isBn ? "জীববিজ্ঞান (Biology)" : "Biology"}</option>
                  <option value="Chemistry">{isBn ? "রসায়ন (Chemistry)" : "Chemistry"}</option>
                  <option value="Physics">{isBn ? "পদার্থবিজ্ঞান (Physics)" : "Physics"}</option>
                  <option value="English">{isBn ? "ইংরেজি (English)" : "English"}</option>
                  <option value="GK">{isBn ? "সাধারণ জ্ঞান (GK)" : "GK"}</option>
                  <option value="General">{isBn ? "অন্যান্য (General)" : "General"}</option>
                </select>
              </div>
              
              {/* Chapter Input */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono font-black text-gray-400 uppercase flex items-center gap-1">
                  <BookOpen className="w-3 h-3 text-[#C1121F]" /> {isBn ? "অধ্যায় বা টপিক" : "Chapter or Topic Name"}
                </label>
                <input
                  type="text"
                  value={doubtChapter}
                  onChange={(e) => setDoubtChapter(e.target.value)}
                  placeholder={isBn ? "যেমন: কোষ বিভাজন, জটিল যৌগ..." : "e.g., Cell Division, Organic Chemistry..."}
                  className="w-full bg-[#0A0A0A] text-xs text-white border border-white/10 rounded-lg p-2.5 focus:outline-none focus:border-[#C1121F] placeholder-gray-650"
                />
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <img
              src={user.avatarUrl}
              alt="User"
              className="w-10 h-10 rounded-full border border-white/10 bg-[#0A0A0A]"
            />
            <div className="flex-1 flex flex-col gap-3">
              <textarea
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                placeholder={
                  isDoubt
                    ? (isBn ? "ডাউট প্রশ্নটি বিস্তারিত এখানে লিখুন (যেমন: এই কোশ্চেনের সমাধান কিভাবে হলো?)..." : "Describe your doubt question in detail here (e.g. why is the option B correct?)...")
                    : (isBn ? "দেশজুড়ে থাকা অন্যান্য মেডিকেল পরীক্ষার্থীদের সাথে আপনার জীববিজ্ঞান আবিষ্কার বা অ্যাডমিশন প্রস্তুতির স্টাডি টিপস শেয়ার করুন..." : "Share your high-yield biology discoveries or clinical prep milestones with the nation...")
                }
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl p-3.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#C1121F] h-24 resize-none transition duration-300"
                id="textarea-feed-post"
              />

              {/* Image attachment / Snapshot Upload section */}
              <div className="flex flex-wrap gap-2 items-center justify-between mt-1 pt-2 border-t border-white/5">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0D0D0D] hover:bg-neutral-900 border border-white/10 rounded-lg text-xs text-gray-300 font-mono font-bold cursor-pointer transition">
                    <Image className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isBn ? "ছবি সংযুক্ত করুন" : "Attach Image"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageChange(e, false)}
                      className="hidden"
                    />
                  </label>
                  
                  {imageFileLoading && (
                    <span className="text-[10px] font-mono text-gray-400 animate-pulse">{isBn ? "আপলোড হচ্ছে..." : "Uploading..."}</span>
                  )}

                  {doubtImageUrl && (
                    <div className="relative group rounded-lg overflow-hidden border border-emerald-500/30">
                      <img
                        src={doubtImageUrl}
                        alt="Doubt attachment preview"
                        className="h-10 w-10 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setNewPostText(prev => prev + "\n" + (isBn ? "[সংযুক্ত ছবি]" : "[Attached Image]")) && setDoubtImageUrl("")}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[8px] font-mono text-red-400 font-black transition cursor-pointer"
                      >
                        {isBn ? "মুছুন" : "REMOVE"}
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="px-5 py-2 bg-[#C1121F] hover:bg-red-750 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition duration-300 font-display cursor-pointer"
                  id="btn-feed-submit"
                >
                  <Send className="w-3.5 h-3.5" /> 
                  {isDoubt 
                    ? (isBn ? "ডাউট প্রশ্ন জিজ্ঞেস করুন" : "ASK DOUBT") 
                    : (isBn ? "পোস্ট করুন" : "BROADCAST")
                  }
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* FEED BOX */}
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-3">
            <h2 className="font-extrabold uppercase text-base tracking-wider text-white font-display">
              {isBn ? "পাবলিক স্টাডি ও সাকসেস ফিড" : "STUDY & PROGRESS BROADCASTS"}
            </h2>
            <span className="text-xs font-mono text-gray-400">{isBn ? "লাইভ রাডার" : "REALTIME RADAR"}</span>
          </div>

          {loadingPosts ? (
            <div className="text-center py-12 text-sm text-gray-500 font-mono">{isBn ? "ফিড লোড হচ্ছে..." : "Loading feeds..."}</div>
          ) : posts.filter(p => !p.isDoubt).length === 0 ? (
            <div className="bg-[#111111] p-8 rounded-xl border border-white/5 text-center text-gray-500 text-sm font-mono">
              {isBn ? "এখনও কোনো পাবলিক পোস্ট নেই। প্রথম স্টাডি পোস্টটি করুন!" : "No study broadcasts here yet. Be the first to share your milestone!"}
            </div>
          ) : (
            posts.filter(p => !p.isDoubt).map((post) => {
              const hasLiked = post.likedBy?.includes(user.uid);
              const hasFired = post.firedBy?.includes(user.uid);
              const hasClapped = post.clappedBy?.includes(user.uid);
              const isEditingThis = editingPost?.id === post.id;

              if (isEditingThis) {
                return (
                  <form 
                    key={post.id} 
                    onSubmit={handleUpdatePost} 
                    className="bg-[#151515] p-5 rounded-2xl border-2 border-[#C1121F]/40 flex flex-col gap-4 animate-fadeIn"
                  >
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-xs font-mono font-black text-[#C1121F] uppercase">
                        {isBn ? "ডাউট সংশোধন করুন" : "EDIT DOUBT QUESTION"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingPost(null)}
                        className="text-[10px] font-mono text-gray-400 hover:text-white transition cursor-pointer"
                      >
                        {isBn ? "বাতিল" : "CANCEL"}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-mono font-bold text-gray-400">Subject</label>
                        <select
                          value={editSubject}
                          onChange={(e) => setEditSubject(e.target.value)}
                          className="bg-[#0A0A0A] text-xs text-white border border-white/10 rounded-lg p-2 focus:outline-none focus:border-[#C1121F]"
                        >
                          <option value="Biology">Biology</option>
                          <option value="Chemistry">Chemistry</option>
                          <option value="Physics">Physics</option>
                          <option value="English">English</option>
                          <option value="GK">GK</option>
                          <option value="General">General</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-mono font-bold text-gray-400">Chapter</label>
                        <input
                          type="text"
                          value={editChapter}
                          onChange={(e) => setEditChapter(e.target.value)}
                          className="bg-[#0A0A0A] text-xs text-white border border-white/10 rounded-lg p-2 focus:outline-none focus:border-[#C1121F]"
                        />
                      </div>
                    </div>

                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl p-3 text-sm text-gray-200 focus:outline-none focus:border-[#C1121F] h-24 resize-none"
                    />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0D0D0D] hover:bg-neutral-900 border border-white/10 rounded-lg text-xs text-gray-300 font-mono font-bold cursor-pointer transition">
                          <Image className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{isBn ? "নতুন ছবি" : "Change Image"}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageChange(e, true)}
                            className="hidden"
                          />
                        </label>
                        {editImageUrl && (
                          <div className="relative group rounded-lg overflow-hidden border border-emerald-500/30">
                            <img src={editImageUrl} className="h-10 w-10 object-cover" />
                            <button
                              type="button"
                              onClick={() => setEditImageUrl("")}
                              className="absolute inset-0 bg-black/60 flex items-center justify-center text-[8px] font-mono text-red-400 font-black"
                            >
                              REMOVE
                            </button>
                          </div>
                        )}
                      </div>

                      <button
                        type="submit"
                        className="px-5 py-2 bg-[#C1121F] hover:bg-red-750 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition"
                      >
                        {isBn ? "সংরক্ষণ করুন" : "SAVE CHANGES"}
                      </button>
                    </div>
                  </form>
                );
              }

              return (
                <div key={post.id} className="bg-[#111111] p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-all duration-300 flex gap-4">
                  <img
                    src={post.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.userId}`}
                    alt="User"
                    className="w-10 h-10 rounded-full border border-white/5 bg-[#0D0D0D] h-fit"
                  />
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-sm tracking-wide block leading-tight text-white font-display">{post.userDisplayName}</span>
                        <span className="text-[10px] font-mono text-[#FFD700] uppercase font-black tracking-widest">{post.userRank || "Aspirant"}</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-gray-400 flex items-center gap-1 mr-1">
                          <Clock className="w-3 h-3 text-gray-600" /> {isBn ? "এইমাত্র" : "RECENTLY"}
                        </span>
                        {post.userId === user.uid && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => startEditPost(post)}
                              className="p-1 text-gray-400 hover:text-white hover:bg-white/5 rounded transition cursor-pointer"
                              title={isBn ? "সম্পাদনা করুন" : "Edit Post"}
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeletePost(post.id)}
                              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded transition cursor-pointer"
                              title={isBn ? "মুছে ফেলুন" : "Delete Post"}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Doubt Header Meta Info */}
                    {post.isDoubt !== false && (
                      <div className="flex flex-wrap gap-1.5 items-center my-1">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${
                          post.doubtSubject === "Biology" ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/40" :
                          post.doubtSubject === "Chemistry" ? "bg-blue-950/40 text-blue-400 border-blue-900/40" :
                          post.doubtSubject === "Physics" ? "bg-purple-950/40 text-purple-400 border-purple-900/40" :
                          post.doubtSubject === "English" ? "bg-amber-950/40 text-amber-400 border-amber-900/40" :
                          post.doubtSubject === "GK" ? "bg-cyan-950/40 text-cyan-400 border-cyan-900/40" :
                          "bg-neutral-800 text-gray-300 border-neutral-750"
                        }`}>
                          {post.doubtSubject || "Biology"}
                        </span>
                        {post.doubtChapter && (
                          <span className="px-2 py-0.5 bg-neutral-900 border border-white/5 rounded-md text-[9px] font-mono text-gray-400 uppercase">
                            {post.doubtChapter}
                          </span>
                        )}
                        
                        {/* Solved / Unsolved indicator */}
                        <button
                          disabled={post.userId !== user.uid}
                          onClick={() => handleToggleSolved(post.id, !!post.doubtSolved)}
                          className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase transition border ${
                            post.doubtSolved 
                              ? "bg-teal-950/30 text-teal-400 border-teal-900/40" 
                              : "bg-red-950/30 text-[#C1121F] border-[#C1121F]/30"
                          } ${post.userId !== user.uid ? "cursor-default" : "hover:scale-105 cursor-pointer"}`}
                          title={post.userId === user.uid ? (isBn ? "সমাধানের অবস্থা পরিবর্তন করুন" : "Toggle solved status") : ""}
                        >
                          {post.doubtSolved 
                            ? (isBn ? "● সমাধানকৃত" : "● SOLVED") 
                            : (isBn ? "● অপূর্ণাঙ্গ ডাউট" : "● OPEN DOUBT")
                          }
                        </button>
                      </div>
                    )}

                    <p className="text-gray-350 text-sm leading-relaxed mt-1 break-words font-display whitespace-pre-wrap">{post.content}</p>

                    {/* Attached Image Preview */}
                    {post.doubtImageUrl && (
                      <div className="mt-2 max-w-md rounded-xl overflow-hidden border border-white/5 bg-black/40">
                        <img
                          src={post.doubtImageUrl}
                          alt="Doubt Snapshot"
                          className="max-h-72 w-auto object-contain cursor-zoom-in"
                          onClick={() => {
                            const newTab = window.open();
                            if (newTab) {
                              newTab.document.write(`<img src="${post.doubtImageUrl}" style="max-width:100%; height:auto;" />`);
                            }
                          }}
                        />
                      </div>
                    )}

                    {post.achievementType && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-950/20 border border-yellow-800/20 rounded-lg text-[10px] text-[#FFD700] w-fit font-mono font-bold mt-2 uppercase">
                        <Award className="w-4 h-4 text-[#FFD700]" /> {post.achievementType} ({post.streakCount} Days Streak King!)
                      </div>
                    )}

                    {/* Emoji interactions row */}
                    <div className="flex items-center gap-3 mt-4 border-t border-white/5 pt-3">
                      <button
                        onClick={() => handleReaction(post.id, "likes")}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold font-mono transition duration-200 ${hasLiked ? "text-blue-400 bg-blue-950/20 border border-blue-900/35" : "text-gray-400 hover:text-white bg-white/5 cursor-pointer"}`}
                      >
                        <ThumbsUp className={`w-3.5 h-3.5 ${hasLiked ? "fill-current" : ""}`} /> {post.likes || 0}
                      </button>
                      <button
                        onClick={() => handleReaction(post.id, "fires")}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold font-mono transition duration-200 ${hasFired ? "text-red-400 bg-red-950/20 border border-red-900/35" : "text-gray-400 hover:text-white bg-white/5 cursor-pointer"}`}
                      >
                        <Flame className={`w-3.5 h-3.5 ${hasFired ? "fill-current text-red-500" : ""}`} /> {post.fires || 0}
                      </button>
                      <button
                        onClick={() => handleReaction(post.id, "claps")}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold font-mono transition duration-200 ${hasClapped ? "text-yellow-400 bg-yellow-950/20 border border-yellow-800/35" : "text-gray-400 hover:text-white bg-white/5 cursor-pointer"}`}
                      >
                        <Smile className={`w-3.5 h-3.5 ${hasClapped ? "fill-current" : ""}`} /> {post.claps || 0}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </>
      ) : socialSubTab === "doubts" ? (
        <>
          {/* DOUBT SOLVE BOARD WORKSPACE */}
          {/* 1. Statistics Widget */}
          <div className="grid grid-cols-3 gap-4 bg-gradient-to-r from-red-950/20 to-black/40 border border-white/5 rounded-2xl p-4">
            <div className="text-center p-3 rounded-xl bg-neutral-900/60 border border-white/5">
              <span className="text-[10px] text-gray-400 font-mono block uppercase">{isBn ? "মোট ডাউট" : "TOTAL DOUBTS"}</span>
              <span className="text-xl font-black text-white">{posts.filter(p => p.isDoubt).length}</span>
            </div>
            <div className="text-center p-3 rounded-xl bg-neutral-900/60 border border-white/5">
              <span className="text-[10px] text-red-400 font-mono block uppercase">{isBn ? "অপূর্ণাঙ্গ" : "OPEN DOUBTS"}</span>
              <span className="text-xl font-black text-[#C1121F]">{posts.filter(p => p.isDoubt && !p.doubtSolved).length}</span>
            </div>
            <div className="text-center p-3 rounded-xl bg-neutral-900/60 border border-white/5">
              <span className="text-[10px] text-emerald-400 font-mono block uppercase">{isBn ? "সমাধানকৃত" : "SOLVED"}</span>
              <span className="text-xl font-black text-emerald-400">{posts.filter(p => p.isDoubt && p.doubtSolved).length}</span>
            </div>
          </div>

          {/* 2. Ask a Doubt Form */}
          <form onSubmit={handleCreatePost} className="bg-[#111111] border border-white/10 rounded-2xl p-5 relative flex flex-col gap-4">
            <div className="absolute top-0 left-6 h-1 w-20 bg-amber-500"></div>
            
            <div className="flex border-b border-white/5 pb-3 justify-between items-center">
              <span className="text-xs font-bold font-mono text-amber-500 flex items-center gap-1.5 uppercase">
                <HelpCircle className="w-4 h-4 text-amber-500" />
                {isBn ? "নতুন ডাউট প্রশ্ন জিজ্ঞেস করুন" : "ASK A NEW DOUBT"}
              </span>
              <span className="text-[10px] text-gray-500 font-mono hidden md:inline">
                {isBn ? "লাইভ ডাউট প্ল্যাটফর্ম" : "LIVE DOUBT CENTER"}
              </span>
            </div>

            {/* Subject & Chapter Selection for Doubts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-fadeIn">
              {/* Subject dropdown */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono font-black text-gray-400 uppercase flex items-center gap-1">
                  <Tag className="w-3 h-3 text-[#C1121F]" /> {isBn ? "বিষয় নির্বাচন" : "Select Subject"}
                </label>
                <select
                  value={doubtSubject}
                  onChange={(e) => setDoubtSubject(e.target.value)}
                  className="w-full bg-[#0A0A0A] text-xs text-white border border-white/10 rounded-lg p-2.5 focus:outline-none focus:border-[#C1121F]"
                >
                  <option value="Biology">{isBn ? "জীববিজ্ঞান (Biology)" : "Biology"}</option>
                  <option value="Chemistry">{isBn ? "রসায়ন (Chemistry)" : "Chemistry"}</option>
                  <option value="Physics">{isBn ? "পদার্থবিজ্ঞান (Physics)" : "Physics"}</option>
                  <option value="English">{isBn ? "ইংরেজি (English)" : "English"}</option>
                  <option value="GK">{isBn ? "সাধারণ জ্ঞান (GK)" : "GK"}</option>
                  <option value="General">{isBn ? "অন্যান্য (General)" : "General"}</option>
                </select>
              </div>
              
              {/* Chapter Input */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono font-black text-gray-400 uppercase flex items-center gap-1">
                  <BookOpen className="w-3 h-3 text-[#C1121F]" /> {isBn ? "অধ্যায় বা টপিক" : "Chapter or Topic Name"}
                </label>
                <input
                  type="text"
                  value={doubtChapter}
                  onChange={(e) => setDoubtChapter(e.target.value)}
                  placeholder={isBn ? "যেমন: কোষ বিভাজন, জটিল যৌগ..." : "e.g., Cell Division, Organic Chemistry..."}
                  className="w-full bg-[#0A0A0A] text-xs text-white border border-white/10 rounded-lg p-2.5 focus:outline-none focus:border-[#C1121F] placeholder-gray-650"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <img
                src={user.avatarUrl}
                alt="User"
                className="w-10 h-10 rounded-full border border-white/10 bg-[#0A0A0A]"
              />
              <div className="flex-1 flex flex-col gap-3">
                <textarea
                  value={newPostText}
                  onChange={(e) => setNewPostText(e.target.value)}
                  placeholder={isBn ? "ডাউট প্রশ্নটি বিস্তারিত এখানে লিখুন (যেমন: এই কোশ্চেনের সমাধান কিভাবে হলো?)..." : "Describe your doubt question in detail here (e.g. why is the option B correct?)..."}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl p-3.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#C1121F] h-24 resize-none transition duration-300"
                  id="textarea-doubt-post"
                />

                {/* Image attachment / Snapshot Upload section */}
                <div className="flex flex-wrap gap-2 items-center justify-between mt-1 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0D0D0D] hover:bg-neutral-900 border border-white/10 rounded-lg text-xs text-gray-300 font-mono font-bold cursor-pointer transition">
                      <Image className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{isBn ? "ছবি সংযুক্ত করুন" : "Attach Image"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageChange(e, false)}
                        className="hidden"
                      />
                    </label>
                    
                    {imageFileLoading && (
                      <span className="text-[10px] font-mono text-gray-400 animate-pulse">{isBn ? "আপলোড হচ্ছে..." : "Uploading..."}</span>
                    )}

                    {doubtImageUrl && (
                      <div className="relative group rounded-lg overflow-hidden border border-emerald-500/30">
                        <img
                          src={doubtImageUrl}
                          alt="Doubt attachment preview"
                          className="h-10 w-10 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setDoubtImageUrl("")}
                          className="absolute inset-0 bg-black/60 flex items-center justify-center text-[8px] font-mono text-red-400 font-black cursor-pointer"
                        >
                          {isBn ? "মুছুন" : "REMOVE"}
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-black font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition duration-300 font-display cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" /> 
                    {isBn ? "ডাউট জিজ্ঞেস করুন" : "ASK DOUBT"}
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* 3. Filtering Section */}
          <div className="bg-[#111111] border border-white/10 rounded-2xl p-4 flex flex-col gap-4 font-display">
            {/* Subject Filters */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">
                {isBn ? "বিষয় অনুযায়ী ফিল্টার" : "Filter by Subject"}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "All", name: isBn ? "সব বিষয়" : "All Subjects", color: "border-white/10 text-white" },
                  { id: "Biology", name: isBn ? "জীববিজ্ঞান" : "Biology", color: "border-emerald-500/30 text-emerald-400 bg-emerald-950/20" },
                  { id: "Chemistry", name: isBn ? "রসায়ন" : "Chemistry", color: "border-blue-500/30 text-blue-400 bg-blue-950/20" },
                  { id: "Physics", name: isBn ? "পদার্থবিজ্ঞান" : "Physics", color: "border-purple-500/30 text-purple-400 bg-purple-950/20" },
                  { id: "English", name: isBn ? "ইংরেজি" : "English", color: "border-amber-500/30 text-amber-400 bg-amber-950/20" },
                  { id: "GK", name: isBn ? "সাধারণ জ্ঞান" : "GK", color: "border-cyan-500/30 text-cyan-400 bg-cyan-950/20" },
                  { id: "General", name: isBn ? "অন্যান্য" : "General", color: "border-gray-500/30 text-gray-400 bg-gray-900/20" }
                ].map(sub => {
                  const isActive = doubtFilterSubject === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setDoubtFilterSubject(sub.id)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition flex items-center gap-1 cursor-pointer border ${
                        isActive
                          ? "bg-white text-black border-white"
                          : `hover:bg-white/5 ${sub.color}`
                      }`}
                    >
                      {sub.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Solved Status Filter */}
            <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
              <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">
                {isBn ? "সমাধানের অবস্থা" : "Resolution Status"}
              </span>
              <div className="flex gap-1.5">
                {[
                  { id: "All", name: isBn ? "সব ডাউট" : "All Doubts" },
                  { id: "Open", name: isBn ? "● অপূর্ণাঙ্গ ডাউট" : "● Open Doubts" },
                  { id: "Solved", name: isBn ? "● সমাধানকৃত" : "● Solved Doubts" }
                ].map(status => {
                  const isActive = doubtFilterSolved === status.id;
                  return (
                    <button
                      key={status.id}
                      type="button"
                      onClick={() => setDoubtFilterSolved(status.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition cursor-pointer border ${
                        isActive
                          ? "bg-[#C1121F] text-white border-[#C1121F]"
                          : "bg-[#0D0D0D] border-white/5 text-gray-400 hover:text-white"
                      }`}
                    >
                      {status.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 4. Doubt Board Feed Box */}
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h2 className="font-extrabold uppercase text-base tracking-wider text-white font-display">
                {isBn ? "লাইভ ডাউট সমাধান বোর্ড" : "DOUBT RESOLUTION BOARD"}
              </h2>
              <span className="text-xs font-mono text-gray-400">{isBn ? "অ্যাক্টিভ ডাউট" : "ACTIVE DEBATE"}</span>
            </div>

            {loadingPosts ? (
              <div className="text-center py-12 text-sm text-gray-500 font-mono">{isBn ? "ডাউট লোড হচ্ছে..." : "Loading doubts..."}</div>
            ) : posts.filter(post => {
              if (!post.isDoubt) return false;
              if (doubtFilterSubject !== "All" && post.doubtSubject !== doubtFilterSubject) return false;
              if (doubtFilterSolved === "Solved" && !post.doubtSolved) return false;
              if (doubtFilterSolved === "Open" && post.doubtSolved) return false;
              return true;
            }).length === 0 ? (
              <div className="bg-[#111111] p-8 rounded-xl border border-white/5 text-center text-gray-500 text-sm font-mono">
                {isBn 
                  ? "নির্বাচিত ফিল্টারের সাথে কোনো ডাউট মেলেনি। আপনার কোনো প্রশ্ন থাকলে জিজ্ঞেস করুন!" 
                  : "No doubts found matching your filter criteria. Ask a question to get solved!"}
              </div>
            ) : (
              posts.filter(post => {
                if (!post.isDoubt) return false;
                if (doubtFilterSubject !== "All" && post.doubtSubject !== doubtFilterSubject) return false;
                if (doubtFilterSolved === "Solved" && !post.doubtSolved) return false;
                if (doubtFilterSolved === "Open" && post.doubtSolved) return false;
                return true;
              }).map((post) => {
                const hasLiked = post.likedBy?.includes(user.uid);
                const hasFired = post.firedBy?.includes(user.uid);
                const hasClapped = post.clappedBy?.includes(user.uid);
                const isEditingThis = editingPost?.id === post.id;

                if (isEditingThis) {
                  return (
                    <form 
                      key={post.id} 
                      onSubmit={handleUpdatePost} 
                      className="bg-[#151515] p-5 rounded-2xl border-2 border-[#C1121F]/40 flex flex-col gap-4 animate-fadeIn"
                    >
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-xs font-mono font-black text-[#C1121F] uppercase">
                          {isBn ? "ডাউট সংশোধন করুন" : "EDIT DOUBT QUESTION"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingPost(null)}
                          className="text-[10px] font-mono text-gray-400 hover:text-white transition cursor-pointer"
                        >
                          {isBn ? "বাতিল" : "CANCEL"}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-mono font-bold text-gray-400">Subject</label>
                          <select
                            value={editSubject}
                            onChange={(e) => setEditSubject(e.target.value)}
                            className="bg-[#0A0A0A] text-xs text-white border border-white/10 rounded-lg p-2 focus:outline-none focus:border-[#C1121F]"
                          >
                            <option value="Biology">Biology</option>
                            <option value="Chemistry">Chemistry</option>
                            <option value="Physics">Physics</option>
                            <option value="English">English</option>
                            <option value="GK">GK</option>
                            <option value="General">General</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-mono font-bold text-gray-400">Chapter</label>
                          <input
                            type="text"
                            value={editChapter}
                            onChange={(e) => setEditChapter(e.target.value)}
                            className="bg-[#0A0A0A] text-xs text-white border border-white/10 rounded-lg p-2 focus:outline-none focus:border-[#C1121F]"
                          />
                        </div>
                      </div>

                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl p-3 text-sm text-gray-200 focus:outline-none focus:border-[#C1121F] h-24 resize-none"
                      />

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0D0D0D] hover:bg-neutral-900 border border-white/10 rounded-lg text-xs text-gray-300 font-mono font-bold cursor-pointer transition">
                            <Image className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{isBn ? "নতুন ছবি" : "Change Image"}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageChange(e, true)}
                              className="hidden"
                            />
                          </label>
                          {editImageUrl && (
                            <div className="relative group rounded-lg overflow-hidden border border-emerald-500/30">
                              <img src={editImageUrl} className="h-10 w-10 object-cover" />
                              <button
                                type="button"
                                onClick={() => setEditImageUrl("")}
                                className="absolute inset-0 bg-black/60 flex items-center justify-center text-[8px] font-mono text-red-400 font-black"
                              >
                                REMOVE
                              </button>
                            </div>
                          )}
                        </div>

                        <button
                          type="submit"
                          className="px-5 py-2 bg-[#C1121F] hover:bg-red-750 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition"
                        >
                          {isBn ? "সংরক্ষণ করুন" : "SAVE CHANGES"}
                        </button>
                      </div>
                    </form>
                  );
                }

                return (
                  <div key={post.id} className="bg-[#111111] p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-all duration-300 flex gap-4">
                    <img
                      src={post.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.userId}`}
                      alt="User"
                      className="w-10 h-10 rounded-full border border-white/5 bg-[#0D0D0D] h-fit"
                    />
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-sm tracking-wide block leading-tight text-white font-display">{post.userDisplayName}</span>
                          <span className="text-[10px] font-mono text-[#FFD700] uppercase font-black tracking-widest">{post.userRank || "Aspirant"}</span>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-gray-400 flex items-center gap-1 mr-1">
                            <Clock className="w-3 h-3 text-gray-600" /> {isBn ? "এইমাত্র" : "RECENTLY"}
                          </span>
                          {post.userId === user.uid && (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => startEditPost(post)}
                                className="p-1 text-gray-400 hover:text-white hover:bg-white/5 rounded transition cursor-pointer"
                                title={isBn ? "সম্পাদনা করুন" : "Edit Post"}
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeletePost(post.id)}
                                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded transition cursor-pointer"
                                title={isBn ? "মুছে ফেলুন" : "Delete Post"}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Doubt Header Meta Info */}
                      <div className="flex flex-wrap gap-1.5 items-center my-1">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${
                          post.doubtSubject === "Biology" ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/40" :
                          post.doubtSubject === "Chemistry" ? "bg-blue-950/40 text-blue-400 border-blue-900/40" :
                          post.doubtSubject === "Physics" ? "bg-purple-950/40 text-purple-400 border-purple-900/40" :
                          post.doubtSubject === "English" ? "bg-amber-950/40 text-amber-400 border-amber-900/40" :
                          post.doubtSubject === "GK" ? "bg-cyan-950/40 text-cyan-400 border-cyan-900/40" :
                          "bg-neutral-800 text-gray-300 border-neutral-750"
                        }`}>
                          {post.doubtSubject || "Biology"}
                        </span>
                        {post.doubtChapter && (
                          <span className="px-2 py-0.5 bg-neutral-900 border border-white/5 rounded-md text-[9px] font-mono text-gray-400 uppercase">
                            {post.doubtChapter}
                          </span>
                        )}
                        
                        {/* Solved / Unsolved indicator */}
                        <button
                          disabled={post.userId !== user.uid}
                          onClick={() => handleToggleSolved(post.id, !!post.doubtSolved)}
                          className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase transition border ${
                            post.doubtSolved 
                              ? "bg-teal-950/30 text-teal-400 border-teal-900/40" 
                              : "bg-red-950/30 text-[#C1121F] border-[#C1121F]/30"
                          } ${post.userId !== user.uid ? "cursor-default" : "hover:scale-105 cursor-pointer"}`}
                          title={post.userId === user.uid ? (isBn ? "সমাধানের অবস্থা পরিবর্তন করুন" : "Toggle solved status") : ""}
                        >
                          {post.doubtSolved 
                            ? (isBn ? "● সমাধানকৃত" : "● SOLVED") 
                            : (isBn ? "● অপূর্ণাঙ্গ ডাউট" : "● OPEN DOUBT")
                          }
                        </button>
                      </div>

                      <p className="text-gray-350 text-sm leading-relaxed mt-1 break-words font-display whitespace-pre-wrap">{post.content}</p>

                      {/* Attached Image Preview */}
                      {post.doubtImageUrl && (
                        <div className="mt-2 max-w-md rounded-xl overflow-hidden border border-white/5 bg-black/40">
                          <img
                            src={post.doubtImageUrl}
                            alt="Doubt Snapshot"
                            className="max-h-72 w-auto object-contain cursor-zoom-in"
                            onClick={() => {
                              const newTab = window.open();
                              if (newTab) {
                                newTab.document.write(`<img src="${post.doubtImageUrl}" style="max-width:100%; height:auto;" />`);
                              }
                            }}
                          />
                        </div>
                      )}

                      {/* Emoji interactions row */}
                      <div className="flex items-center gap-3 mt-4 border-t border-white/5 pt-3 font-mono">
                        <button
                          onClick={() => handleReaction(post.id, "likes")}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition duration-200 ${hasLiked ? "text-blue-400 bg-blue-950/20 border border-blue-900/35" : "text-gray-400 hover:text-white bg-white/5 cursor-pointer"}`}
                        >
                          <ThumbsUp className={`w-3.5 h-3.5 ${hasLiked ? "fill-current" : ""}`} /> {post.likes || 0}
                        </button>
                        <button
                          onClick={() => handleReaction(post.id, "fires")}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition duration-200 ${hasFired ? "text-red-400 bg-red-950/20 border border-red-900/35" : "text-gray-400 hover:text-white bg-white/5 cursor-pointer"}`}
                        >
                          <Flame className={`w-3.5 h-3.5 ${hasFired ? "fill-current text-red-500" : ""}`} /> {post.fires || 0}
                        </button>
                        <button
                          onClick={() => handleReaction(post.id, "claps")}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition duration-200 ${hasClapped ? "text-yellow-400 bg-yellow-950/20 border border-yellow-800/35" : "text-gray-400 hover:text-white bg-white/5 cursor-pointer"}`}
                        >
                          <Smile className={`w-3.5 h-3.5 ${hasClapped ? "fill-current" : ""}`} /> {post.claps || 0}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        /* SQUAD WORKSPACE */
        <div className="flex flex-col gap-6">
              {!myActiveSquad ? (
                /* USER HAS NO SQUAD - RENDER COMMISION BOARD */
                <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 relative overflow-hidden flex flex-col gap-6">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#C1121F]/15 to-transparent rounded-bl-full pointer-events-none"></div>
                  
                  <div className="text-center md:text-left py-2">
                    <span className="inline-block px-3 py-1 bg-red-950 text-[#C1121F] border border-[#C1121F]/30 font-mono text-[9px] font-black rounded-full uppercase tracking-widest mb-3">
                      OFFICIAL MEDICAL STUDY GUILDS
                    </span>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight font-display mb-2">
                      {isBn ? "স্টাডি স্কোয়াডে যোগদান করুন" : "JOIN OR COMMISSION A SQUAD"}
                    </h2>
                    <p className="text-xs text-gray-400 leading-relaxed font-display max-w-xl">
                      {isBn 
                        ? "একটি স্টাডি স্কোয়াডে দলবদ্ধ হয়ে একসাথে উচ্চ-ফলনশীল MCQ সমাধান করুন, টিম বোনাস অর্জন করুন এবং সাপ্তাহিক চ্যালেঞ্জ জয় করে জাতীয় র‍্যাংকিংয়ের শীর্ষে পৌঁছান!"
                        : "Form an alliance with high-yield medical candidates. Combine forces to solve challenges, log collective study progress, and dominate the national squad leaderboards!"}
                    </p>
                  </div>

                  {/* Create Squad Panel inline */}
                  <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-5 relative">
                    <div className="absolute top-0 left-6 h-1 w-16 bg-[#C1121F]"></div>
                    <h3 className="font-extrabold uppercase text-xs text-white tracking-widest font-mono flex items-center gap-1.5 mb-4">
                      <Plus className="w-4 h-4 text-[#C1121F]" /> {isBn ? "নতুন মেডিকেল স্কোয়াড গঠন করুন" : "INHERIT A NEW SQUAD COMMAND"}
                    </h3>

                    <form onSubmit={handleCreateSquad} className="grid md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] text-gray-400 uppercase font-mono font-bold">Squad Name</label>
                          <input
                            type="text"
                            required
                            value={squadName}
                            onChange={(e) => setSquadName(e.target.value)}
                            placeholder="e.g., Clinical Slayers..."
                            className="bg-black text-white placeholder-gray-500 text-xs border border-white/10 rounded-xl p-3 focus:outline-none focus:border-[#C1121F] font-display font-semibold transition animate-fadeIn"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] text-gray-400 uppercase font-mono font-bold">Squad Motto</label>
                          <input
                            type="text"
                            value={squadMotto}
                            onChange={(e) => setSquadMotto(e.target.value)}
                            placeholder="e.g., Unstoppable Brain Cells..."
                            className="bg-black text-white placeholder-gray-500 text-xs border border-white/10 rounded-xl p-3 focus:outline-none focus:border-[#C1121F] font-display italic transition animate-fadeIn"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] text-gray-400 uppercase font-mono font-bold">Objective description</label>
                          <textarea
                            value={squadDesc}
                            onChange={(e) => setSquadDesc(e.target.value)}
                            placeholder="Grinding high-yield anatomy, physiology, and admission biochemistry..."
                            className="bg-black text-white placeholder-gray-500 text-xs border border-white/10 rounded-xl p-3 focus:outline-none focus:border-[#C1121F] h-14 resize-none font-display transition animate-fadeIn"
                          />
                        </div>
                        
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] text-gray-400 uppercase font-mono font-black">Select Squad Emblem</label>
                          <div className="grid grid-cols-6 gap-1.5 mt-1 animate-fadeIn">
                            {EMBLEMS.map(emb => (
                              <button
                                key={emb.id}
                                type="button"
                                onClick={() => setSelectedEmblem(emb.id)}
                                className={`p-2 rounded-xl border flex items-center justify-center transition cursor-pointer text-lg ${
                                  selectedEmblem === emb.id 
                                    ? "border-[#C1121F] bg-[#C1121F]/25 scale-105" 
                                    : "border-white/5 bg-[#0D0D0D] hover:border-white/20"
                                }`}
                              >
                                <span>{emb.icon}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="md:col-span-2 pt-2">
                        <button
                          type="submit"
                          className="w-full py-3 bg-[#C1121F] hover:bg-[#A30F1A] text-white font-black rounded-xl text-xs uppercase font-mono tracking-widest transition shadow-lg shadow-[#C1121F]/15 cursor-pointer"
                        >
                          DEPLOY GUILD AND EARN STARTER BONUS
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Available squads directory */}
                  <div className="flex flex-col gap-4 animate-fadeIn">
                    <h3 className="font-extrabold uppercase text-xs text-white tracking-wider font-mono flex items-center gap-1.5 border-b border-white/5 pb-2">
                      <Compass className="w-4 h-4 text-[#FFD700]" /> {isBn ? "সক্রিয় স্টাডি স্কোয়াড সমূহ" : "COMMISSIONED SQUADS IN RADAR RANGE"}
                    </h3>

                    {squads.length === 0 ? (
                      <div className="text-center py-8 text-xs text-gray-500 font-mono">
                        No active medical prep squads running. Be the founding commander!
                      </div>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-4">
                        {squads.map((s) => {
                          const sLvl = getSquadLevelInfo(s.teamXp || 100);
                          return (
                            <div key={s.id} className="bg-[#0D0D0D] p-4 rounded-2xl border border-white/5 hover:border-white/10 transition flex items-start gap-4 justify-between">
                              <div className="flex gap-3">
                                {renderEmblemIcon(s.logoUrl, "w-10 h-10 shrink-0")}
                                <div>
                                  <span className="font-bold text-sm text-white block font-display uppercase tracking-tight">{s.name}</span>
                                  <span className="text-[10px] text-gray-400 block line-clamp-2 italic mt-0.5">"{s.motto || s.description}"</span>
                                  
                                  <div className="flex gap-4 items-center mt-2 font-mono text-[9px]">
                                    <span className="text-[#FFD700] font-black">Level {sLvl.level}</span>
                                    <span className="text-gray-400">{s.members?.length || 1} / 8 Members</span>
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => handleJoinSquad(s.id)}
                                className="px-3 py-1.5 bg-red-950 hover:bg-red-900 border border-[#C1121F]/30 hover:border-[#C1121F] text-white rounded-lg text-[9px] font-black font-mono tracking-wider transition uppercase shrink-0"
                              >
                                JOIN
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                /* USER HAS ACTIVE SQUAD - RENDER SQUAD HQ DASHBOARD */
                <div className="flex flex-col gap-6">
                  {/* Squad Header Banner */}
                  {(() => {
                    const mySquad = myActiveSquad;
                    const levelInfo = getSquadLevelInfo(mySquad.teamXp || 150);
                    return (
                      <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#C1121F]/10 to-transparent pointer-events-none"></div>
                        
                        <div className="flex items-center gap-4">
                          {renderEmblemIcon(mySquad.logoUrl, "w-14 h-14 shrink-0 border-2 border-white/10 shadow-lg animate-pulse")}
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h2 className="text-xl font-black text-white uppercase tracking-tight font-display">{mySquad.name}</h2>
                              <span className={`px-2.5 py-0.5 ${levelInfo.bg} ${levelInfo.color} border border-current/20 rounded font-mono text-[9px] font-black uppercase tracking-wider`}>
                                LEVEL {levelInfo.level} ({levelInfo.titleEn})
                              </span>
                            </div>
                            <p className="text-xs text-[#FFD700] italic font-display mt-0.5">"{mySquad.motto || "Per Aspera Ad Astra!"}"</p>
                            <p className="text-[10px] text-gray-400 leading-relaxed max-w-lg mt-1 font-display">{mySquad.description}</p>
                          </div>
                        </div>

                        <div className="flex md:flex-col items-end gap-4 md:gap-1.5 shrink-0 w-full md:w-auto border-t md:border-t-0 border-white/5 pt-4 md:pt-0 justify-between">
                          <div className="text-left md:text-right">
                            <span className="text-[9px] text-gray-400 uppercase font-mono block tracking-wider">Squad Total Score</span>
                            <span className="text-xl font-black text-[#FFD700] font-display">{mySquad.teamXp || 150} XP</span>
                          </div>
                          <button
                            onClick={() => handleLeaveSquad(mySquad.id)}
                            className="px-3 py-1 bg-neutral-900 border border-red-950 text-red-400 hover:bg-red-950/40 hover:text-white rounded-lg text-[8px] font-black font-mono tracking-wider transition uppercase flex items-center gap-1 cursor-pointer"
                          >
                            <UserMinus className="w-3 h-3" /> LEAVE SQUAD
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Team Progress & Level details */}
                  {(() => {
                    const mySquad = myActiveSquad;
                    const lvl = getSquadLevelInfo(mySquad.teamXp || 150);
                    return (
                      <div className="bg-[#111111] border border-white/10 rounded-2xl p-5 flex flex-col gap-3">
                        <div className="flex justify-between items-center text-xs font-mono">
                          <span className="text-gray-400 font-bold uppercase tracking-wider">Squad Level Progression</span>
                          <span className="text-white font-black">{mySquad.teamXp || 150} / {lvl.nextXp} XP to Level {lvl.level + 1}</span>
                        </div>
                        <div className="w-full bg-[#090909] h-2.5 rounded-full overflow-hidden border border-white/5">
                          <div 
                            className="bg-gradient-to-r from-[#C1121F] to-[#FFD700] h-full transition-all duration-500 rounded-full"
                            style={{ width: `${lvl.progress}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-gray-400 font-display">
                          <span>Tier: <strong className={lvl.color}>{lvl.titleEn}</strong></span>
                          <span>Squad Size: <strong>{myActiveSquad.members?.length || 1} / 8 Aspirants</strong></span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Team Challenges & Missions (Dynamic MCQs) */}
                  <div className="bg-[#111111] border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
                    <div className="border-b border-white/5 pb-2">
                      <h3 className="font-extrabold uppercase text-xs text-white tracking-widest font-mono flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-[#FFD700]" /> ACTIVE TEAM CHALLENGES
                      </h3>
                      <p className="text-[10px] text-gray-400 font-display mt-0.5">Solve custom category drills as a team to contribute to active challenges and earn major study rewards!</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      {SQUAD_CHALLENGES.map(challenge => {
                        const progressMap = myActiveSquad.challengeProgress || {};
                        const current = progressMap[challenge.id] || 0;
                        const target = challenge.target;
                        const pct = Math.min(100, Math.round((current / target) * 100));
                        const isFinished = current >= target;

                        return (
                          <div 
                            key={challenge.id} 
                            className={`p-4 rounded-xl border relative overflow-hidden flex flex-col justify-between h-full transition ${
                              isFinished 
                                ? "bg-emerald-950/10 border-emerald-500/30" 
                                : "bg-black border-white/5 hover:border-white/10"
                            }`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black font-mono uppercase ${
                                challenge.category === "Biology" ? "bg-teal-950 text-teal-400 border border-teal-900/30" :
                                challenge.category === "Chemistry" ? "bg-purple-950 text-purple-400 border border-purple-900/30" :
                                "bg-blue-950 text-blue-400 border border-blue-900/30"
                              }`}>
                                {challenge.category}
                              </span>
                              {isFinished && (
                                <span className="text-[8px] text-emerald-400 font-mono font-bold uppercase flex items-center gap-0.5">
                                  <CheckCircle className="w-3 h-3" /> SOLVED
                                </span>
                              )}
                            </div>

                            <div className="mb-4">
                              <h4 className="text-xs font-extrabold text-white font-display uppercase tracking-tight line-clamp-1">{isBn ? challenge.titleBn : challenge.titleEn}</h4>
                              <p className="text-[9px] text-gray-400 leading-relaxed font-display mt-1 line-clamp-2">{isBn ? challenge.descriptionBn : challenge.descriptionEn}</p>
                            </div>

                            <div className="flex flex-col gap-2 mt-auto">
                              {/* Progress bar */}
                              <div className="flex justify-between items-center text-[9px] font-mono text-gray-400">
                                <span>Progress</span>
                                <span className="font-bold text-white">{current} / {target}</span>
                              </div>
                              <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-300 ${isFinished ? "bg-emerald-400" : "bg-[#C1121F]"}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>

                              <div className="flex justify-between items-center text-[8px] font-mono text-gray-400 pt-1 border-t border-white/5">
                                <span>Rewards:</span>
                                <span className="text-[#FFD700] font-bold">+{challenge.rewardXp} Team XP</span>
                              </div>

                              {/* Action Button */}
                              {!isFinished ? (
                                <button
                                  type="button"
                                  onClick={() => startMiniDrill(challenge)}
                                  className="w-full py-1.5 mt-2 bg-[#C1121F] hover:bg-[#A30F1A] text-white font-bold rounded-lg text-[9px] uppercase tracking-wider font-mono transition flex items-center justify-center gap-1 cursor-pointer animate-pulse"
                                >
                                  <Swords className="w-3 h-3" /> DRILL MCQS (+XP)
                                </button>
                              ) : (
                                <div className="w-full py-1.5 mt-2 bg-emerald-950/20 text-emerald-400 border border-emerald-900/30 text-center font-bold rounded-lg text-[8px] uppercase font-mono">
                                  COMPLETED MISSION
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Real-time Message Chat and Resource Share Panel */}
                  <SquadChat
                    squadId={myActiveSquad.id}
                    user={user}
                    language={language}
                    theme={theme}
                  />

                  {/* Member Roster (Active Contributors) */}
                  <div className="bg-[#111111] border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
                    <div className="border-b border-white/5 pb-2">
                      <h3 className="font-extrabold uppercase text-xs text-white tracking-widest font-mono flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-[#C1121F]" /> ACTIVE TEAM ROSTER
                      </h3>
                      <p className="text-[10px] text-gray-400 font-display mt-0.5">List of active gladiators and their study contribution score to the squad's ranking.</p>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      {myActiveSquad.members?.map((uid, idx) => {
                        const m = getMemberDetails(uid, user);
                        const contMap = myActiveSquad.memberContributions || {};
                        const contribution = contMap[uid] || 100;
                        return (
                          <div key={`${uid}_${idx}`} className="bg-black border border-white/5 p-3 rounded-xl flex items-center justify-between hover:border-white/10 transition">
                            <div className="flex items-center gap-3">
                              <img
                                src={m.avatarUrl}
                                alt={m.displayName}
                                className="w-9 h-9 rounded-full border border-white/5 bg-neutral-900"
                              />
                              <div>
                                <span className="text-xs font-bold text-white block font-display leading-tight">{m.displayName}</span>
                                <span className="text-[9px] text-gray-400 block truncate max-w-[140px] italic">{m.college}</span>
                                <span className="text-[9px] font-mono text-[#FFD700] block mt-0.5">Lvl {m.level} Aspirant</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-[8px] uppercase text-gray-500 font-mono block">Contribution</span>
                              <span className="text-xs font-black text-[#C1121F] font-mono">{contribution} XP</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}
        </div>

      {/* RIGHT SIDE PANEL: Friends & Study Squad (Teams) */}
      <div className="flex flex-col gap-6">
        
        {/* RIGHT SIDE PANEL CONDITIONAL: SQUAD LIST or NATIONAL LEADERBOARD */}
        {socialSubTab === "feed" ? (
          /* Study Squad Teams Grid */
          <div className="bg-[#111111] p-5 rounded-2xl border border-white/10">
            <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4">
              <h3 className="font-extrabold uppercase text-sm text-white flex items-center gap-2 font-display">
                <Users className="w-4 h-4 text-[#C1121F]" /> STUDY SQUADS
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateSquad(!showCreateSquad)}
                className="p-1.5 hover:bg-white/10 rounded-lg bg-black border border-white/5 text-[#FFD700] hover:text-white transition cursor-pointer"
                title="Form New Squad"
                id="btn-feed-toggle-create-squad"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {showCreateSquad && (
              <form onSubmit={handleCreateSquad} className="bg-[#0A0A0A] border border-[#C1121F]/30 p-4 rounded-xl mb-4 flex flex-col gap-3">
                <h4 className="text-xs font-bold text-[#FFD700] uppercase font-mono tracking-wider">Commission New Squad</h4>
                <input
                  type="text"
                  required
                  value={squadName}
                  onChange={(e) => setSquadName(e.target.value)}
                  placeholder="Squad Team Name..."
                  className="bg-black text-white placeholder-gray-500 text-xs border border-white/10 rounded-lg p-2 focus:outline-none focus:border-[#C1121F]"
                />
                <textarea
                  value={squadDesc}
                  onChange={(e) => setSquadDesc(e.target.value)}
                  placeholder="Motto or mission objective..."
                  className="bg-black text-white placeholder-gray-500 text-xs border border-white/10 rounded-lg p-2 focus:outline-none focus:border-[#C1121F] h-12"
                />
                <button
                  type="submit"
                  className="py-1.5 bg-[#C1121F] hover:bg-red-750 text-white font-bold rounded-lg text-xs uppercase font-mono transition"
                >
                  DEPLOY TEAM
                </button>
              </form>
            )}

            {squads.length === 0 ? (
              <div className="text-center py-6 text-xs text-gray-400 font-mono">
                No active military study squads. Deploy yours now!
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {squads.map((s) => {
                  const isMember = s.members?.includes(user.uid);
                  return (
                    <div key={s.id} className="bg-[#0D0D0D] p-3.5 rounded-xl border border-white/5 hover:border-white/10 transition flex items-center gap-3">
                      {renderEmblemIcon(s.logoUrl, "w-8 h-8")}
                      <div className="flex-1">
                        <span className="font-bold text-xs text-white uppercase block font-display">{s.name}</span>
                        <span className="text-[10px] text-gray-400 block line-clamp-1">{s.description}</span>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[9px] font-mono text-[#FFD700]">🌟 TEAM XP: {s.teamXp || 100}</span>
                          <span className="text-[9px] font-mono text-gray-400">{s.members?.length || 1} Crusaders</span>
                        </div>
                      </div>
                      {!isMember ? (
                        <button
                          type="button"
                          onClick={() => handleJoinSquad(s.id)}
                          className="px-2.5 py-1 bg-red-950 border border-[#C1121F]/30 hover:border-[#C1121F] hover:bg-red-900 text-[#C1121F] hover:text-white rounded-lg text-[9px] font-bold font-mono tracking-wider transition uppercase cursor-pointer"
                        >
                          JOIN
                        </button>
                      ) : (
                        <span className="text-[9px] text-emerald-400 font-mono flex items-center gap-0.5">
                          <ShieldCheck className="w-3.5 h-3.5" /> MY SQUAD
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* National Squad Leaderboard (Squad Wars) */
          <div className="bg-[#111111] p-5 rounded-2xl border border-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#FFD700]/10 to-transparent pointer-events-none"></div>
            <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4 font-display">
              <h3 className="font-extrabold uppercase text-sm text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#FFD700]" /> {isBn ? "জাতীয় স্কোয়াড র‍্যাংকিং" : "SQUAD WARS RANKINGS"}
              </h3>
            </div>
            
            <p className="text-[10px] text-gray-400 leading-relaxed mb-4">
              {isBn ? "অন্যান্য স্কোয়াডের সাথে মোট টিম এক্সপির তুলনা করুন।" : "National study ranking of medical prep squads based on total study contribution XP."}
            </p>

            <div className="flex flex-col gap-2 font-display">
              {squads.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-500 font-mono">
                  No medical guilds registered in range.
                </div>
              ) : (
                [...squads]
                  .sort((a, b) => (b.teamXp || 0) - (a.teamXp || 0))
                  .slice(0, 8)
                  .map((s, idx) => {
                    const isMySquad = s.members?.includes(user.uid);
                    const lvlInfo = getSquadLevelInfo(s.teamXp || 100);
                    return (
                      <div 
                        key={s.id} 
                        className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                          isMySquad 
                            ? "bg-[#C1121F]/10 border-[#C1121F]/50 shadow-[0_0_10px_rgba(193,18,31,0.1)] scale-102" 
                            : "bg-[#0D0D0D] border-white/5 hover:border-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`font-mono text-xs font-black w-4 ${
                            idx === 0 ? "text-[#FFD700]" : idx === 1 ? "text-slate-400" : idx === 2 ? "text-amber-500" : "text-gray-500"
                          }`}>
                            #{idx + 1}
                          </span>
                          {renderEmblemIcon(s.logoUrl, "w-8 h-8 shrink-0")}
                          <div className="min-w-0">
                            <span className="text-xs font-extrabold text-white block uppercase tracking-tight truncate leading-none mb-0.5">{s.name}</span>
                            <span className="text-[8px] font-mono text-gray-400 block truncate max-w-[120px]">{s.members?.length || 1} Members</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-[#FFD700] block">{s.teamXp || 150} XP</span>
                          <span className="text-[8px] font-mono bg-neutral-900 text-gray-400 px-1 py-0.5 rounded uppercase font-black">
                            Lvl {lvlInfo.level}
                          </span>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        )}

        {/* Friends Alliance comparative panel */}
        <div className="bg-[#111111] p-5 rounded-2xl border border-white/10">
          <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4 font-display">
            <h3 className="font-extrabold uppercase text-sm text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#FFD700]" /> FRIEND ALLIANCES
            </h3>
            <button
              onClick={addRandomFriend}
              className="px-2.5 py-1 bg-black hover:bg-white/10 text-[#FFD700] hover:text-white font-mono text-[9px] font-bold border border-white/10 rounded-lg uppercase tracking-wider transition"
              id="btn-feed-add-friend"
            >
              + ALLY
            </button>
          </div>

          <p className="text-[10px] text-gray-400 leading-relaxed mb-4">
            Acquire alliances with high-performing students. Compare your MAT level and mock XP in real-time.
          </p>

          <div className="flex flex-col gap-3 font-display">
            {friends.map((f, fIdx) => (
              <div key={`${f.uid || "fr"}_${fIdx}`} className="bg-[#0D0D0D] p-3 rounded-xl border border-white/5 flex items-center justify-between hover:border-white/10 transition">
                <div className="flex items-center gap-3">
                  <img
                    src={f.avatarUrl}
                    alt={f.displayName}
                    className="w-8 h-8 rounded-full border border-white/5 bg-[#0A0A0A]"
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">{f.displayName}</span>
                    <span className="text-[9px] text-gray-400 block italic leading-none">{f.college}</span>
                    <span className="text-[9px] font-mono text-gray-350 block mt-0.5">🔥 STREAK: {f.dailyStreak} Days</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-[#FFD700] block">{f.xp} XP</span>
                  <span className="text-[9px] font-mono bg-red-950 text-[#C1121F] px-1.5 py-0.5 rounded font-black uppercase">
                    Level {f.level}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>

      {/* SQUAD CHALLENGE INTERACTIVE MINI-DRILL MODAL OVERLAY */}
      {activeChallengeDrill && drillQuestions.length > 0 && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 overflow-y-auto select-none font-display">
          <div className="bg-[#111111] border-2 border-[#C1121F]/60 rounded-3xl p-6 max-w-lg w-full relative shadow-2xl overflow-hidden my-auto">
            {/* Visual Header Decoration */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#C1121F] via-[#FFD700] to-[#C1121F]"></div>
            
            {!drillFinished ? (
              /* ACTIVE DRILL SESSION */
              <div className="flex flex-col gap-5">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 bg-red-950 text-[#C1121F] border border-[#C1121F]/30 font-mono text-[8px] font-black rounded uppercase tracking-wider">
                      SQUAD MISSION DRILL
                    </span>
                    <h3 className="text-sm font-black text-white uppercase mt-1">
                      {isBn ? activeChallengeDrill.titleBn : activeChallengeDrill.titleEn}
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setActiveChallengeDrill(null);
                      setDrillQuestions([]);
                    }}
                    className="text-gray-500 hover:text-white transition text-sm font-mono cursor-pointer"
                  >
                    ESC
                  </button>
                </div>

                {/* Progress indicators - Pips */}
                <div className="flex items-center gap-2 justify-center">
                  {[0, 1, 2, 3, 4].map(idx => {
                    const isPassed = idx < drillCurrentIndex;
                    const isActive = idx === drillCurrentIndex;
                    const isCorrect = drillAnswersHistory[idx] === true;
                    return (
                      <div 
                        key={idx} 
                        className={`h-2.5 rounded-full transition-all duration-300 ${
                          isActive 
                            ? "bg-[#C1121F] w-8" 
                            : isPassed 
                              ? isCorrect 
                                ? "bg-emerald-500 w-4" 
                                : "bg-red-500 w-4"
                              : "bg-neutral-800 w-4"
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Question Context */}
                <div className="bg-black/40 border border-white/5 rounded-2xl p-4">
                  <div className="flex justify-between text-[9px] font-mono text-gray-500 mb-1">
                    <span>{drillQuestions[drillCurrentIndex]?.chapter || "General Practice"}</span>
                    <span>DIFFICULTY: {drillQuestions[drillCurrentIndex]?.difficulty || "Medium"}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white leading-relaxed font-display">
                    Q{drillCurrentIndex + 1}: {drillQuestions[drillCurrentIndex]?.questionText}
                  </h4>
                </div>

                {/* Options grid */}
                <div className="flex flex-col gap-2.5">
                  {drillQuestions[drillCurrentIndex]?.options.map((option, idx) => {
                    const isSelected = drillSelectedAnswer === idx;
                    const isCorrectOption = idx === drillQuestions[drillCurrentIndex]?.correctAnswerIndex;
                    const revealed = drillSelectedAnswer !== null;

                    let btnClass = "border-white/5 bg-black hover:border-white/25 text-gray-300";
                    if (revealed) {
                      if (isCorrectOption) {
                        btnClass = "border-emerald-500 bg-emerald-950/30 text-emerald-400";
                      } else if (isSelected) {
                        btnClass = "border-red-500 bg-red-950/30 text-red-400";
                      } else {
                        btnClass = "border-white/5 bg-black/60 text-gray-600 opacity-60";
                      }
                    }

                    return (
                      <button
                        key={idx}
                        disabled={revealed}
                        onClick={() => submitDrillAnswer(idx)}
                        className={`w-full p-3.5 rounded-xl border text-left text-xs font-semibold font-display transition duration-200 cursor-pointer flex items-center justify-between ${btnClass}`}
                      >
                        <span>{option}</span>
                        {revealed && isCorrectOption && (
                          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                        {revealed && isSelected && !isCorrectOption && (
                          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation text box */}
                {drillSelectedAnswer !== null && (
                  <div className="bg-emerald-950/10 border border-emerald-900/30 p-3.5 rounded-2xl text-[10px] text-gray-400 leading-relaxed font-display animate-fadeIn">
                    <strong className="text-emerald-400 block uppercase font-mono text-[9px] tracking-widest mb-1">Concept Mastery Explanation:</strong>
                    {drillQuestions[drillCurrentIndex]?.explanation || "Correct answer has been medically verified against national textbook references."}
                  </div>
                )}

                {/* Confirm/Next buttons */}
                <div className="border-t border-white/5 pt-4 flex justify-end">
                  {drillSelectedAnswer !== null ? (
                    <button
                      onClick={nextDrillQuestion}
                      className="px-5 py-2.5 bg-[#C1121F] hover:bg-[#A30F1A] text-white font-black uppercase text-[10px] tracking-wider rounded-xl transition cursor-pointer flex items-center gap-1"
                    >
                      <span>{drillCurrentIndex < 4 ? "Next Question" : "Submit Mission"}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="text-[10px] font-mono text-gray-500 italic py-2">Select an option to proceed...</span>
                  )}
                </div>
              </div>
            ) : (
              /* DRILL COMPLETE REPORT CARD */
              <div className="flex flex-col gap-5 text-center py-4">
                <div className="w-20 h-20 bg-gradient-to-br from-[#FFD700] to-yellow-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-[#FFD700]/10 border-2 border-white/20 animate-bounce">
                  <Trophy className="w-10 h-10 text-black" />
                </div>

                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">MISSION ACCOMPLISHED!</h3>
                  <p className="text-xs text-gray-400 mt-1">You completed the training module and successfully submitted findings back to squad HQ!</p>
                </div>

                {/* Score breakdown */}
                <div className="bg-black/60 border border-white/5 rounded-2xl p-4 grid grid-cols-2 gap-4 max-w-xs mx-auto">
                  <div className="text-center border-r border-white/5 pr-4">
                    <span className="text-[9px] font-mono text-gray-500 uppercase block">Accuracy Score</span>
                    <span className="text-xl font-black text-white">{drillCorrectCount} / 5</span>
                    <span className="text-[9px] font-mono text-emerald-400 block">MCQs Solved</span>
                  </div>
                  <div className="text-center pl-4">
                    <span className="text-[9px] font-mono text-gray-500 uppercase block">Squad Contribution</span>
                    <span className="text-xl font-black text-[#FFD700] block">+{drillCorrectCount * 50 + 50} XP</span>
                    <span className="text-[9px] font-mono text-gray-400 block">Team XP Credited</span>
                  </div>
                </div>

                {/* Individual rewards */}
                <div className="bg-neutral-900 border border-[#FFD700]/20 rounded-2xl p-4 max-w-xs mx-auto w-full">
                  <span className="text-[9px] font-mono text-[#FFD700] uppercase block font-bold tracking-widest mb-2">Claimed Personal Loot</span>
                  <div className="flex justify-around items-center text-xs font-bold">
                    <span className="text-white">+{drillCorrectCount * 40} XP</span>
                    <span className="text-[#FFD700]">+{drillCorrectCount * 12} Coins 🪙</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5">
                  <button
                    onClick={() => {
                      setActiveChallengeDrill(null);
                      setDrillQuestions([]);
                    }}
                    className="px-6 py-2.5 bg-[#C1121F] hover:bg-[#A30F1A] text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition cursor-pointer"
                  >
                    RETURN TO HEADQUARTERS
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
