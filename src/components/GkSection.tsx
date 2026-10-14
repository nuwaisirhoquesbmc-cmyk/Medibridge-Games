import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen,
  Map,
  Compass,
  Trophy,
  Award,
  Clock,
  Sparkles,
  HelpCircle,
  CheckCircle,
  XCircle,
  ChevronRight,
  RefreshCw,
  Search,
  Flag,
  Calendar,
  Anchor,
  User,
  ShieldCheck,
  ChevronLeft,
  Flame,
  Zap,
  Rotate3d,
  Layers
} from "lucide-react";
import { playSound } from "../audio";
import { UserProfile, Question } from "../types";
import { logQuestionMistake, removeQuestionMistake } from "../firebase";

interface GkSectionProps {
  currentUser: UserProfile;
  onProfileUpdate: (updates: Partial<UserProfile>) => Promise<void>;
  language: "bn" | "en";
  theme: "light" | "dark";
}

// Bangladesh Pre-Liberation & Liberation Timeline Data
export interface TimelineItem {
  year: string;
  titleBn: string;
  titleEn: string;
  dateBn: string;
  dateEn: string;
  descBn: string;
  descEn: string;
  yieldBn: string;
  yieldEn: string;
  icon: string;
  tag: string;
}

export const TIMELINE_DATA: TimelineItem[] = [
  {
    year: "1947",
    titleBn: "ভারত বিভক্তি ও দ্বিজাতি তত্ত্ব",
    titleEn: "Partition of India & Two-Nation Theory",
    dateBn: "১৪-১৫ আগস্ট, ১৯৪৭",
    dateEn: "August 14-15, 1947",
    descBn: "ব্রিটিশ শাসনের অবসান ঘটে ভারত ও পাকিস্তান নামক দুটি স্বাধীন রাষ্ট্রের জন্ম হয়। পূর্ব বাংলা পাকিস্তানের অংশ হিসেবে 'পূর্ব পাকিস্তান' নামে অন্তর্ভুক্ত হয় যা বৈষম্যের সূচনা করেছিল।",
    descEn: "British colonial rule ended, creating India and Pakistan. East Bengal became part of Pakistan, initiating structural discrimination.",
    yieldBn: "দ্বিজাতিতত্ত্বের প্রবক্তা মোহাম্মদ আলী জিন্নাহ। পাকিস্তানের মোট জনসংখ্যার ৫৬% বাঙালি হওয়া সত্ত্বেও ক্ষমতা ছিল পশ্চিম পাকিস্তানের হাতে।",
    yieldEn: "Muhammad Ali Jinnah championed the Two-Nation Theory. Even though Bengalis made up 56% of Pakistan's total population, state power was hoarded in West Pakistan.",
    icon: "🗺️",
    tag: "Background"
  },
  {
    year: "1952",
    titleBn: "ঐতিহাসিক ভাষা আন্দোলন",
    titleEn: "Historic Language Movement",
    dateBn: "২১শে ফেব্রুয়ারি, ১৯৫২",
    dateEn: "February 21, 1952",
    descBn: "উর্দুকে পাকিস্তানের একমাত্র রাষ্ট্রভাষা ঘোষণা করার প্রতিবাদে বাঙালি ছাত্রসমাজ ১৪৪ ধারা ভঙ্গ করে মিছিল বের করে। পুলিশ গুলি চালালে সালাম, বরকত, রফিক, জব্বারসহ অনেকে শহীদ হন।",
    descEn: "Bengali students defied Section 144 to protest the declaration of Urdu as the sole state language. Police opened fire, leading to martyrdom of Salam, Barkat, Rafiq, Jabbar, and others.",
    yieldBn: "২১ ফেব্রুয়ারিকে ১৯৯৯ সালে ইউনেস্কো আন্তর্জাতিক মাতৃভাষা দিবস ঘোষণা করে। প্রথম শহীদ মিনার নির্মিত হয়েছিল ২২ ফেব্রুয়ারি ১৯৫২।",
    yieldEn: "UNESCO declared February 21 as International Mother Language Day in 1999. The first Shaheed Minar was erected on February 22, 1952.",
    icon: "🗣️",
    tag: "Language"
  },
  {
    year: "1954",
    titleBn: "যুক্তফ্রন্ট নির্বাচন ও ২১ দফা",
    titleEn: "United Front Election & 21-Point Charter",
    dateBn: "৮-১২ মার্চ, ১৯৫৪",
    dateEn: "March 8-12, 1954",
    descBn: "পূর্ব পাকিস্তানের প্রথম প্রাদেশিক নির্বাচনে আওয়ামী মুসলিম লীগ, কৃষক শ্রমিক পার্টিসহ দলসমূহ মিলে 'যুক্তফ্রন্ট' গঠন করে মুসলিম লীগের বিরুদ্ধে ঐতিহাসিক বিজয় অর্জন করে।",
    descEn: "In the first provincial election of East Pakistan, Awami Muslim League and other parties formed the 'United Front' coalition, scoring a landslide victory over the Muslim League.",
    yieldBn: "যুক্তফ্রন্টের নির্বাচনী প্রতীক ছিল 'নৌকা'। তাদের ২১ দফার প্রথম দফা ছিল বাংলাকে অন্যতম রাষ্ট্রভাষা করা। শেরে বাংলা এ. কে. ফজলুল হক সরকার গঠন করেন।",
    yieldEn: "The electoral symbol of the United Front was the 'Boat'. The first point of the 21-point charter was making Bengali a state language. Sher-e-Bangla formed the cabinet.",
    icon: "🗳️",
    tag: "Electoral"
  },
  {
    year: "1966",
    titleBn: "ছয় দফা দাবি: বাঙালির ম্যাগনাকার্টা",
    titleEn: "6-Point Demands: The Magna Carta",
    dateBn: "৫-৬ ফেব্রুয়ারি, ১৯৬৬",
    dateEn: "February 5-6, 1966",
    descBn: "বঙ্গবন্ধু শেখ মুজিবুর রহমান লাহোরে বিরোধী দলগুলোর সম্মেলনে ঐতিহাসিক ৬ দফা পেশ করেন, যা ছিল বাঙালির স্বাধিকার আন্দোলনের চূড়ান্ত মাইলফলক ও স্বায়ত্তশাসনের মূল দাবিপত্র।",
    descEn: "Bangabandhu Sheikh Mujibur Rahman submitted the historic 6-point charter at an opposition conference in Lahore, which became the ultimate document for Bengali autonomy.",
    yieldBn: "৬ দফাকে আয়ারল্যান্ডের 'ম্যাগনাকার্টা'-র সাথে তুলনা করা হয়। এর প্রথম দফার মূল বিষয় ছিল যুক্তরাষ্ট্রীয় শাসন কাঠামো ও সংসদীয় পদ্ধতির সরকার।",
    yieldEn: "The 6-point demand is widely dubbed the 'Magna Carta' of Bengalis. Its very first point proposed a federal, parliamentary form of government.",
    icon: "📜",
    tag: "Autonomy"
  },
  {
    year: "1969",
    titleBn: "ঐতিহাসিক গণঅভ্যুত্থান",
    titleEn: "The Historic Mass Uprising",
    dateBn: "২৪শে জানুয়ারি, ১৯৬৯",
    dateEn: "January 24, 1969",
    descBn: "আইয়ুব সরকারের সামরিক শাসন এবং আগরতলা ষড়যন্ত্র মামলার বিরুদ্ধে ছাত্র-জনতার তীব্র আন্দোলন গণ-অভ্যুত্থানে রূপ নেয়। শহীদ হন আসাদ, মতিউর এবং ড. শামসুজ্জোহা।",
    descEn: "Mass student-led protests surged against Ayub Khan's military rule and the Agartala Conspiracy Case. Martyrdom of Asad, Matiur, and Rajshahi University's Dr. Shamsuzzoha forced military yield.",
    yieldBn: "গণ-অভ্যুত্থানের ফলে আইয়ুব খান পদত্যাগ করতে বাধ্য হন। ২৩ ফেব্রুয়ারি ছাত্র সংগ্রাম পরিষদ শেখ মুজিবুর রহমানকে 'বঙ্গবন্ধু' উপাধি দেয়।",
    yieldEn: "As a result, Ayub Khan resigned. The conspiracy case was dropped, and Sheikh Mujib was released unconditionally. He was given the title 'Bangabandhu' on Feb 23, 1969.",
    icon: "🔥",
    tag: "Uprising"
  }
];

// The 7 Bir Sreshthos Data (High-Yield Questions)
export interface BirSreshtho {
  nameBn: string;
  nameEn: string;
  rankBn: string;
  rankEn: string;
  sector: string;
  districtBn: string;
  districtEn: string;
  diedBn: string;
  diedEn: string;
  burialBn: string;
  burialEn: string;
  forceBn: string;
  forceEn: string;
  keyFactBn: string;
  keyFactEn: string;
  emoji: string;
}

export const BIR_SRESHTHO_DATA: BirSreshtho[] = [
  {
    nameBn: "মুन्সী আব্দুর রউফ",
    nameEn: "Munshi Abdur Rouf",
    rankBn: "ল্যান্স নায়েক",
    rankEn: "Lance Naik",
    sector: "১ নং সেক্টর",
    districtBn: "ফরিদপুর (জন্ম), রাঙ্গামাটি (মৃত্যু)",
    districtEn: "Faridpur (Birth), Rangamati (Death)",
    diedBn: "৮ এপ্রিল, ১৯৭১",
    diedEn: "April 8, 1971",
    burialBn: "রাঙ্গামাটির নানিয়ারচর চিংড়ি খাল",
    burialEn: "Naniarchar Chingri Khal, Rangamati",
    forceBn: "ইস্ট পাকিস্তান রাইফেলস (EPR)",
    forceEn: "East Pakistan Rifles (EPR)",
    keyFactBn: "রাঙ্গামাটির বুড়িঘাটে পাকবাহিনীর স্পিডবোট ধ্বংস করে নিজের জীবন দিয়ে সহযোদ্ধাদের রক্ষা করেন।",
    keyFactEn: "Destroyed enemy speedboats at Burighat using his machine gun, allowing 150 fellow fighters to retreat safely.",
    emoji: "🛡️"
  },
  {
    nameBn: "হামিদুর রহমান",
    nameEn: "Hamidur Rahman",
    rankBn: "সিপাহী",
    rankEn: "Sepoy",
    sector: "৪ নং সেক্টর",
    districtBn: "ঝিনাইদহ (জন্ম), মৌলভীবাজার (মৃত্যু)",
    districtEn: "Jhenaidah (Birth), Maulvibazar (Death)",
    diedBn: "২৮ অক্টোবর, ১৯৭১",
    diedEn: "October 28, 1971",
    burialBn: "মিরপুর বুদ্ধিজীবী কবরস্থান (ত্রিপুরা থেকে স্থানান্তর)",
    burialEn: "Mirpur Martyred Intellectuals Graveyard (relocated from Tripura in 2007)",
    forceBn: "সেনাবাহিনী (E. Bengal Regiment)",
    forceEn: "Army (East Bengal Regiment)",
    keyFactBn: "বীরশ্রেষ্ঠদের মধ্যে সর্বকনিষ্ঠ (বয়স ১৮ বছর)। ধলাই সীমান্তে পাকিস্তানি বাঙ্কার গ্রেনেড মেরে নিষ্ক্রিয় করতে গিয়ে শহীদ হন।",
    keyFactEn: "The youngest recipient among the seven (aged 18). Crawled under fire to silence a strategic enemy machine gun bunker with hand grenades.",
    emoji: "🎗️"
  },
  {
    nameBn: "মোহাম্মদ রুহুল আমিন",
    nameEn: "Mohammad Ruhul Amin",
    rankBn: "ইঞ্জিন রুম আর্টিফিসার-১",
    rankEn: "Engine Room Artificer-1",
    sector: "১০ নং সেক্টর (নৌপথ)",
    districtBn: "নোয়াখালী (জন্ম), খুলনা (মৃত্যু)",
    districtEn: "Noakhali (Birth), Khulna (Death)",
    diedBn: "১০ ডিসেম্বর, ১৯৭১",
    diedEn: "December 10, 1971",
    burialBn: "খুলনার রূপসা নদীর পাড়",
    burialEn: "Rupsha River Bank, Khulna",
    forceBn: "নৌবাহিনী (Navy)",
    forceEn: "Navy (Bangladesh Navy)",
    keyFactBn: "যুদ্ধজাহাজ 'পলাশ' এর ড্রাইভিং রুমে লড়েছেন। ভারতীয় বিমানের ভুল বোমাবর্ষণে আহত হয়ে তীরে উঠলে রাজাকারেরা হত্যা করে।",
    keyFactEn: "Fought on warship 'Palash'. Swam ashore after standard friendly fire mistakes, bayoneted by local Razakars.",
    emoji: "⚓"
  },
  {
    nameBn: "মহিউদ্দিন জাহাঙ্গীর",
    nameEn: "Captain Mohiuddin Jahangir",
    rankBn: "ক্যাপ্টেন",
    rankEn: "Captain",
    sector: "৭ নং সেক্টর",
    districtBn: "বরিশাল (জন্ম), চাঁপাইনবাবগঞ্জ (মৃত্যু)",
    districtEn: "Barishal (Birth), Chapainawabganj (Death)",
    diedBn: "১৪ ডিসেম্বর, ১৯৭১",
    diedEn: "December 14, 1971",
    burialBn: "সোনা মসজিদ প্রাঙ্গণ, চাঁপাইনবাবগঞ্জ",
    burialEn: "Sona Masjid Premises, Chapainawabganj",
    forceBn: "সেনাবাহিনী (Engineers Block)",
    forceEn: "Army (Corps of Engineers)",
    keyFactBn: "বীরশ্রেষ্ঠদের মাঝে একমাত্র অফিসার। চাঁপাইনবাবগঞ্জ মুক্ত করতে গিয়ে মহানন্দা নদীর তীরে মাথায় গুলিতে শহীদ হন। বিজয়ের ২ দিন আগে।",
    keyFactEn: "The only Army Captain among the awardees. Died charging enemy defenses on the Mahananda River bank, just two days before final Victory.",
    emoji: "⚔️"
  }
];

// The 11 Sectors Data
export interface LiberationSector {
  id: number;
  commandersBn: string;
  commandersEn: string;
  coverageBn: string;
  coverageEn: string;
  hqBn: string;
  hqEn: string;
  specialBn: string;
  specialEn: string;
  mapCoords: { x: number; y: number; label: string };
}

export const SECTOR_DATA: LiberationSector[] = [
  {
    id: 1,
    commandersBn: "মেজর জিয়াউর রহমান, মেজর রফিকুল ইসলাম",
    commandersEn: "Major Ziaur Rahman, Major Rafiqul Islam",
    coverageBn: "চট্টগ্রাম, পার্বত্য চট্টগ্রাম এবং নোয়াখালী জেলার অংশবিশেষ (ফেনী নদী পর্যন্ত)।",
    coverageEn: "Chattogram, Chittagong Hill Tracts, and parts of Noakhali (up to Feni River).",
    hqBn: "হরিণা (ত্রিপুরা, ভারত)",
    hqEn: "Harina (Tripura, India)",
    specialBn: "কালুরঘাট বেতার কেন্দ্র এবং ঐতিহাসিক প্রথম প্রতিরোধ যুদ্ধ এই সেক্টরে শুরু হয়েছিল।",
    specialEn: "The Kalurghat Radio Transmitter and first active resistance began within this sector.",
    mapCoords: { x: 410, y: 460, label: "S1" }
  },
  {
    id: 2,
    commandersBn: "মেজর খালেদ মোশাররফ, মেজর এ.টি.এম. হায়দার",
    commandersEn: "Major Khaled Mosharraf, Major A.T.M. Haider",
    coverageBn: "ঢাকা, কুমিল্লা, ফরিদপুর এবং নোয়াখালীর অংশবিশেষ।",
    coverageEn: "Dhaka, Cumilla, Faridpur, and parts of Noakhali.",
    hqBn: "মেলাঘর (ত্রিপুরা, ভারত)",
    hqEn: "Melaghar (Tripura, India)",
    specialBn: "কিংবদন্তি guerrilla বাহিনী 'ক্র্যাক প্লাটুন' এই ২ নং সেক্টরের অধীনে ঢাকা শহরে দুঃসাহসিক অপারেশন পরিচালনা করেছিল।",
    specialEn: "The legendary guerrilla unit 'Crack Platoon' operated inside Dhaka city under Sector 2.",
    mapCoords: { x: 320, y: 370, label: "S2" }
  },
  {
    id: 3,
    commandersBn: "মেজর কে.এম. শফিউল্লাহ, মেজর এ.এন.এম. নুরুজ্জামান",
    commandersEn: "Major K.M. Shafiullah, Major A.N.M. Nuruzzaman",
    coverageBn: "হবিগঞ্জ, কিশোরগঞ্জ, ময়মনসিংহের দক্ষিণ অংশ এবং গাজীপুর।",
    coverageEn: "Habiganj, Kishoreganj, southern parts of Mymensingh, and Gazipur.",
    hqBn: "হেজামারা (ত্রিপুরা, ভারত)",
    hqEn: "Hezamara (Tripura, India)",
    specialBn: "ঢাকা-সিলেট মহাসড়ক ব্লক করার জন্য এবং গেরিলা আক্রমণের অন্যতম প্রধান ঘাঁটি ছিল এই সেক্টর।",
    specialEn: "Highly strategic for blocking the Dhaka-Sylhet highway and launches of guerrilla raids.",
    mapCoords: { x: 335, y: 290, label: "S3" }
  },
  {
    id: 4,
    commandersBn: "মেজর সি.আর. দত্ত (চিত্ত রঞ্জন দত্ত)",
    commandersEn: "Major C.R. Dutta",
    coverageBn: "সিলেট জেলার পূর্বাঞ্চল (খোয়াই-শায়েস্তাগঞ্জ রেলপথ থেকে কানাইঘাট পর্যন্ত)।",
    coverageEn: "Eastern Sylhet regional pockets from Khowai-Shayestaganj railway up to Kanaighat border.",
    hqBn: "কৈলাশহর (ত্রিপুরা, ভারত)",
    hqEn: "Koilashor (Tripura, India)",
    specialBn: "চা বাগান অধ্যুষিত এবং পাহাড়ি সীমান্ত অঞ্চলে পাকিস্তান সেনাবাহিনীর রসদ ও যোগাযোগ বিচ্ছিন্ন করতে গেরিলা যুদ্ধ হয়েছিল।",
    specialEn: "A mountainous tea-garden terrain vital for interrupting enemy logistics and supply units.",
    mapCoords: { x: 400, y: 260, label: "S4" }
  },
  {
    id: 5,
    commandersBn: "মেজর মীর শওকত আলী",
    commandersEn: "Major Mir Shawkat Ali",
    coverageBn: "সিলেট জেলার পশ্চিমাঞ্চল (ডাউকি-শিলং সড়ক থেকে তামাকাবিল সীমান্ত পর্যন্ত)।",
    coverageEn: "Western Sylhet, ranging from Dawki-Shillong road up to Tamabil border.",
    hqBn: "বাঁশতলা (সুনামগঞ্জ, বাংলাদেশ)",
    hqEn: "Banshtola (Sunamganj, Bangladesh)",
    specialBn: "খাসিয়া ও জয়ন্তিয়া পাহাড় সীমান্তবর্তী এই অঞ্চলের হেডকোয়ার্টার বাঁশতলা বাংলাদেশে অবস্থিত ছিল।",
    specialEn: "Bordering Khasi and Jaintia Hills, its focal headquarters in Banshtola was situated inside Bangladesh.",
    mapCoords: { x: 370, y: 210, label: "S5" }
  },
  {
    id: 6,
    commandersBn: "উইং কমান্ডার এম. খাদেমুল বাশার",
    commandersEn: "Wing Commander M. Khademul Bashar",
    coverageBn: "রংপুর বিভাগ এবং দিনাজপুর জেলা অঞ্চল।",
    coverageEn: "The entire Rangpur division and Dinajpur districts.",
    hqBn: "বুড়িমারী (পাটগ্রাম, লালমনিরহাট)",
    hqEn: "Burimari (Patgram, Lalmonirhat)",
    specialBn: "একমাত্র সেক্টর যার হেডকোয়ার্টার যুদ্ধকালীন সময়ে শুরু থেকেই সম্পূর্ণ স্বাধীন এবং মুক্ত বাংলাদেশি ভূখণ্ডে (পাটগ্রাম) ছিল।",
    specialEn: "The only regional land sector whose HQ was operating from fully liberated Bangladesh soil (Patgram) from day one.",
    mapCoords: { x: 170, y: 150, label: "S6" }
  },
  {
    id: 7,
    commandersBn: "মেজর কাজী নুরুজ্জামান",
    commandersEn: "Major Qazi Nuruzzaman",
    coverageBn: "রাজশাহী, পাবনা, বগুড়া এবং দিনাজপুর জেলার দক্ষিণাঞ্চল।",
    coverageEn: "Rajshahi, Pabna, Bogura, and southern parts of Dinajpur.",
    hqBn: "তরঙ্গপুর (পশ্চিমবঙ্গ, ভারত)",
    hqEn: "Tarangapur (West Bengal, India)",
    specialBn: "উত্তরের খাদ্যভাণ্ডারখ্যাত অত্যন্ত উর্বর এই অঞ্চলে পাক হানাদারদের খাদ্য সরবরাহ রুখতে অসংখ্য অর্থনৈতিক অপারেশন হয়েছিল।",
    specialEn: "Coordinated extensive blockades to dry up the food supplies of occupation forces in the North.",
    mapCoords: { x: 190, y: 280, label: "S7" }
  },
  {
    id: 8,
    commandersBn: "মেজর আবু ওসমান চৌধুরী, মেজর এম.এ. মঞ্জুর",
    commandersEn: "Major Abu Osman Chowdhury, Major M.A. Manzur",
    coverageBn: "কুষ্টিয়া, যশোর, খুলনা জেলা এবং ফরিদপুরের একাংশ।",
    coverageEn: "Kushtia, Jashore, Khulna, and parts of Faridpur.",
    hqBn: "বেনাপোল (যশোর, বাংলাদেশ/ভারত সীমান্ত)",
    hqEn: "Benapole (Jashore, border zone)",
    specialBn: "মেহেরপুরের বৈদ্যনাথতলায় (মুজিবনগর) প্রথম বাংলাদেশ বিপ্লবী সরকার গঠন এই সেক্টরের ভৌগোলিক সীমানায় হয়েছিল।",
    specialEn: "The historic declaration & oath of the first cabinet (Mujibnagar) emerged within this sector's geography on April 17.",
    mapCoords: { x: 200, y: 410, label: "S8" }
  },
  {
    id: 9,
    commandersBn: "মেজর এম.এ. জলিল, মেজর জয়নাল আবেদীন",
    commandersEn: "Major M.A. Jalil, Major Joynal Abedin",
    coverageBn: "বরিশাল বিভাগ, পটুয়াখালী এবং খুলনার দক্ষিণাঞ্চল।",
    coverageEn: "The entire Barishal division, Patuakhali, and southern Khulna.",
    hqBn: "হাসনাবাদ (পশ্চিমবঙ্গ, ভারত)",
    hqEn: "Hasnabad (West Bengal, India)",
    specialBn: "নদীমাতৃক এবং দুর্গম সুন্দরবন অঞ্চল এই সেক্টরের অংশ হিসেবে নৌ-গেরিলা যুদ্ধের জন্য ব্যবহৃত হয়ে আসছিল।",
    specialEn: "Fitted with rivers and dense Sundarban forests, perfect for defensive water-borne ambushes.",
    mapCoords: { x: 250, y: 490, label: "S9" }
  },
  {
    id: 11,
    commandersBn: "মেজর আবু তাহের, স্কোয়াড্রন লিডার এম. হামিদুল্লাহ",
    commandersEn: "Major Abu Taher, Squadron Leader M. Hamidullah",
    coverageBn: "ময়মনসিংহ (দক্ষিণ অংশ বাদে) এবং টাঙ্গাইল জেলা।",
    coverageEn: "Mymensingh (except southern parts) and Tangail district.",
    hqBn: "মহেন্দ্রগঞ্জ (মেঘালয়, ভারত)",
    hqEn: "Mahendraganj (Meghalaya, India)",
    specialBn: "কিংবদন্তি সংগঠক কাদের সিদ্দিকীর বিখ্যাত 'কাদেরিয়া বাহিনী' এই সেক্টরে স্বতঃস্ফূর্ত গেরিলা যুদ্ধ পরিচালনা করেছিল।",
    specialEn: "The legendary spontaneous guerrilla force 'Quaderia Bahini' operated deep in Tangail within this sector.",
    mapCoords: { x: 290, y: 240, label: "S11" }
  },
  {
    id: 10,
    commandersBn: "কোন নির্দিষ্ট কমান্ডার ছিলেন না (নৌ-কমান্ডো উইং)",
    commandersEn: "No fixed regional commander (Naval Commando force)",
    coverageBn: "সমগ্র উপকূলীয় সমুদ্র উপকূল, বন্দর ও নৌপথসমূহ।",
    coverageEn: "All maritime coastlines, sea ports, and inland major river waterways.",
    hqBn: "সরাসরি মুজিবনগর হেডকোয়ার্টার (জিএইচকিউ)",
    hqEn: "Directly under GHQ (Mujibnagar HQ)",
    specialBn: "এর অধীনে সংঘটিত হয় বিখ্যাত 'অপারেশন জ্যাকপট' (১৫ আগস্ট, ১৯৭১), যেখানে পাক সেনার মাইলের পর মাইল জাহাজ ধ্বংস হয়েছিল।",
    specialEn: "Most popular in MAT tests. Led 'Operation Jackpot' on August 15, destroying Pakistani military ships.",
    mapCoords: { x: 310, y: 550, label: "S10" }
  }
];

// High-Yield MCQ Practice Questions
export interface QuizQuestion {
  id: number;
  questionBn: string;
  questionEn: string;
  optionsBn: string[];
  optionsEn: string[];
  correctIdx: number;
  explanationBn: string;
  explanationEn: string;
}

export const GK_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    questionBn: "বাংলাদেশের প্রথম অস্থায়ী সরকার (মুজিবনগর সরকার) কোন তারিখে গঠিত হয়েছিল?",
    questionEn: "When was the first provisional government of Bangladesh formed?",
    optionsBn: [
      "১৭ এপ্রিল ১৯৭১",
      "১০ এপ্রিল ১৯৭১",
      "২৬ মার্চ ১৯৭১",
      "১৬ ডিসেম্বর ১৯৭১"
    ],
    optionsEn: [
      "17 April 1971",
      "10 April 1971",
      "26 March 1971",
      "16 December 1971"
    ],
    correctIdx: 1,
    explanationBn: "মুজিবনগর সরকার গঠিত হয় ১০ এপ্রিল ১৯৭১ এবং তারা শপথ গ্রহণ করেন ১৭ এপ্রিল ১৯৭১ মেহেরপুরের বৈদ্যনাথতলায়।",
    explanationEn: "The provisional government was formed on April 10, 1971 and took oath on April 17, 1971."
  },
  {
    id: 2,
    questionBn: "মুক্তিযুদ্ধের সময় ঢাকা শহর কোন সেক্টরের অধীন ছিল?",
    questionEn: "Under which sector was Dhaka city during the Liberation War?",
    optionsBn: [
      "সেক্টর ১",
      "সেক্টর ২",
      "সেক্টর ১০",
      "সেক্টর ১১"
    ],
    optionsEn: [
      "Sector 1",
      "Sector 2",
      "Sector 10",
      "Sector 11"
    ],
    correctIdx: 1,
    explanationBn: "ঢাকা ২ নং সেক্টরের অধীনে ছিল। ক্র্যাক প্লাটুনের বীর যোদ্ধারা এই সেক্টরেই অ্যাকশন পরিচালনা করেন।",
    explanationEn: "Dhaka was designated under Sector 2 where the legendary Crack Platoon operation occurred."
  },
  {
    id: 3,
    questionBn: "মুক্তিযুদ্ধের সময় সর্বাধিনায়ক (Supreme Commander) কে ছিলেন?",
    questionEn: "Who was the Supreme Commander of Bangladesh Armed Forces during the Liberation War?",
    optionsBn: [
      "জেনারেল এম. এ. .জি. ওসমানী",
      "বঙ্গবন্ধু শেখ মুজিবুর রহমান",
      "তাজউদ্দীন আহমদ",
      "মেজর জিয়াউর রহমান"
    ],
    optionsEn: [
      "General M. A. G. Osmani",
      "Bangabandhu Sheikh Mujibur Rahman",
      "Tajuddin Ahmad",
      "Major Ziaur Rahman"
    ],
    correctIdx: 1,
    explanationBn: "মুক্তিযুদ্ধের 'সর্বাধিনায়ক' (Supreme Commander) ছিলেন রাষ্ট্রপতি বঙ্গবন্ধু শেখ মুজিবুর রহমান। আর 'প্রধান সেনাপতি' (Commander-in-Chief) ছিলেন জেনারেল এম. এ. জি. ওসমানী। এটি মেডিকেল ভর্তি পরীক্ষার একটি অত্যন্ত গুরুত্বপূর্ণ পিনপয়েন্ট!",
    explanationEn: "The President, Bangabandhu Sheikh Mujibur Rahman, was the Supreme Commander. General M. A. G. Osmani was the Commander-in-Chief. This is a crucial distinction tested in the MAT!"
  },
  {
    id: 4,
    questionBn: "নিচের কোন সেক্টরটির কোনো নিয়মিত সেক্টর কমান্ডার ছিল না?",
    questionEn: "Which of the following sectors had no regular sector commander?",
    optionsBn: [
      "সেক্টর ১",
      "সেক্টর ৬",
      "সেক্টর ১০",
      "সেক্টর ১১"
    ],
    optionsEn: [
      "Sector 1",
      "Sector 6",
      "Sector 10",
      "Sector 11"
    ],
    correctIdx: 2,
    explanationBn: "১০ নং নৌ-সেক্টরের কোনো নির্দিষ্ট কমান্ডার ছিলেন না। নৌ-কমান্ডোদের প্রধান যুদ্ধের সময় সরাসরি প্রধান কার্যালয়ের অধীনে কাজ করতেন।",
    explanationEn: "Sector 10 (naval operations sector) had no regular commander. Operations were directly coordinated from General Headquarters."
  },
  {
    id: 5,
    questionBn: "স্বাধীন বাংলাদেশের জাতীয় পতাকার মূল রূপকার বা ডিজাইনার কে?",
    questionEn: "Who is the designer of the national flag of Bangladesh?",
    optionsBn: [
      "জয়নুল আবেদীন",
      "কামরুল হাসান",
      "হামিদুর রহমান",
      "হাশেম খান"
    ],
    optionsEn: [
      "Zainul Abedin",
      "Kamrul Hasan",
      "Hamidur Rahman",
      "Hashem Khan"
    ],
    correctIdx: 1,
    explanationBn: "স্বাধীন বাংলাদেশের জাতীয় পতাকার মূল ডিজাইনার হলেন পটুয়া কামরুল হাসান। প্রথম পতাকার মানচিত্র খচিত অংশের রূপকার ছিলেন শিবনারায়ণ দাস।",
    explanationEn: "Kamrul Hasan is the master designer of the national flag of Bangladesh. Shib Narayan Das designed the map-inlay of the initial version."
  },
  {
    id: 6,
    questionBn: "বীরশ্রেষ্ঠদের মধ্যে একমাত্র সেনাবাহিনীর ক্যাপ্টেন পদমর্যাদার অফিসার কে ছিলেন?",
    questionEn: "Who was the only Army Captain among the seven Bir Sreshthos?",
    optionsBn: [
      "ক্যাপ্টেন মহিউদ্দিন জাহাঙ্গীর",
      "ল্যান্স নায়েক মুন্সী আব্দুর রউফ",
      "সিপাহী হামিদুর রহমান",
      "ফ্লাইট লেফটেন্যান্ট মতিউর রহমান"
    ],
    optionsEn: [
      "Captain Mohiuddin Jahangir",
      "Lance Naik Munshi Abdur Rouf",
      "Sepoy Hamidur Rahman",
      "Flight Lieutenant Matiur Rahman"
    ],
    correctIdx: 0,
    explanationBn: "বীরশ্রেষ্ঠ ক্যাপ্টেন মহিউদ্দিন জাহাঙ্গীর ছিলেন একমাত্র অফিসার (সেনাবাহিনী), যিনি চাঁপাইনবাবগঞ্জ এলাকায় ৭ নং সেক্টরে লড়াই করে শাহাদাত বরণ করেন। বিজয়ের মাত্র দুই দিন আগে (১৪ ডিসেম্বর) তিনি শহীদ হন।",
    explanationEn: "Captain Mohiuddin Jahangir was the only Army Captain among the awardees. He fought valiantly in Sector 7 and embraced martyrdom on Dec 14, just 2 days before total victory."
  },
  {
    id: 7,
    questionBn: "স্বাধীন বাংলাদেশকে স্বীকৃতিদানকারী প্রথম দেশ কোনটি?",
    questionEn: "Which country was the first to recognize Bangladesh?",
    optionsBn: [
      "ভারত",
      "ভুটান",
      "শ্রীলঙ্কা",
      "নেপাল"
    ],
    optionsEn: [
      "India",
      "Bhutan",
      "Sri Lanka",
      "Nepal"
    ],
    correctIdx: 1,
    explanationBn: "১৯৭১ সালের ৬ ডিসেম্বর সকালে ভুটান প্রথম স্বাধীন বাংলাদেশকে স্বীকৃতি দেয়। তার কয়েক ঘণ্টা পর ভারত আনুষ্ঠানিকভাবে স্বীকৃতি পাঠায়। সরকারি ও নির্ভরযোগ্য ইতিহাস অনুযায়ী প্রথম দেশ ভুটান।",
    explanationEn: "Bhutan was the first nation to officially recognize Bangladesh on the morning of December 6, 1971. India recognized Bangladesh later on the same day."
  },
  {
    id: 8,
    questionBn: "মুক্তিযুদ্ধে বীরত্বपूर्ण অবদানের জন্য কতজন নারীকে 'বীর প্রতীক' খেতাব দেওয়া হয়?",
    questionEn: "How many females were awarded the 'Bir Protik' title for their role in the war?",
    optionsBn: [
      "১ জন",
      "২ জন",
      "৩ জন",
      "৫ জন"
    ],
    optionsEn: [
      "1 person",
      "2 persons",
      "3 persons",
      "5 persons"
    ],
    correctIdx: 1,
    explanationBn: "মুক্তিযুদ্ধে গুরুত্বপূর্ণ অবদানের জন্য ২ জন বীর নারী 'বীর প্রতীক' উপাধি পান: ডা. সেতারা বেগম এবং তারামন বিবি।",
    explanationEn: "Only two women were decorated with the 'Bir Protik' gallantry award: Dr. Setara Begum and Taramon Bibi."
  },
  {
    id: 9,
    questionBn: "ঐতিহাসিক ৭ই মার্চের ভাষণ সংবিধানের কোন তফসিলে অন্তর্ভুক্ত করা হয়েছে?",
    questionEn: "Which schedule of the constitution incorporates the historic 7th March Speech?",
    optionsBn: [
      "তৃতীয় তফসিল",
      "চতুর্থ তফসিল",
      "পঞ্চম তফসিল",
      "সপ্তম তফসিল"
    ],
    optionsEn: [
      "Third Schedule",
      "Fourth Schedule",
      "Fifth Schedule",
      "Seventh Schedule"
    ],
    correctIdx: 2,
    explanationBn: "পঞ্চম তফসিলে বঙ্গবন্ধুর ঐতিহাসিক ৭ মার্চের ভাষণ, ষষ্ঠ তফসিলে স্বাধীনতার ঘোষণা এবং সপ্তম তফসিলে মুজিবনগর সরকারের স্বাধীনতার ঘোষণাপত্র রয়েছে।",
    explanationEn: "The 5th schedule is dedicated to the historic March 7 speech of Bangabandhu, 6th to declaration of independence, and 7th to proclamation of independence."
  },
  {
    id: 10,
    questionBn: "মুজিবনগরে গঠিত স্বাধীন বাংলাদেশ সরকারের শপথ গ্রহণ অনুষ্ঠান কে পরিচালনা করেন?",
    questionEn: "Who conducted the oath ceremony of the provisional government at Mujibnagar?",
    optionsBn: [
      "বঙ্গবন্ধু শেখ মুজিবুর রহমান",
      "তাজউদ্দীন আহমদ",
      "অধ্যাপক ইউসুফ আলী",
      "সৈয়দ নজরুল ইসলাম"
    ],
    optionsEn: [
      "Bangabandhu Sheikh Mujibur Rahman",
      "Tajuddin Ahmad",
      "Professor Yusuf Ali",
      "Syed Nazrul Islam"
    ],
    correctIdx: 2,
    explanationBn: "১৭ এপ্রিল ১৯৭১ মেহেরপুরের বৈদ্যনাথতলার আম্রকাননে মুজিবনগর সরকারের শপথ গ্রহণ অনুষ্ঠান পরিচালনা এবং স্বাধীনতার ঘোষণাপত্র পাঠ করেন অধ্যাপক ইউসুফ আলী।",
    explanationEn: "Professor Yusuf Ali read the Proclamation of Independence and formally conducted the oath-taking ceremony of the cabinet on April 17, 1971."
  }
];



export interface EnglishFlashcard {
  id: number;
  word: string;
  category: "Synonyms" | "Preposition" | "Idioms" | "Spelling";
  categoryBn: string;
  meaningBn: string;
  meaningEn: string;
  synonyms?: string;
  antonyms?: string;
  sentenceEn: string;
  sentenceBn: string;
  examFactBn: string;
  examFactEn: string;
}

export const ENGLISH_FLASHCARDS: EnglishFlashcard[] = [
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
    examFactEn: "A high-frequency word in MAT. 'Abate' translates to decrease or make less."
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
    examFactEn: "Always followed by the preposition 'from'. Same applies to the synonym 'Refrain from'."
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
    examFactEn: "A very common spelling trap in MAT. Practice: B-U-R-E-A-U-C-R-A-C-Y."
  },
  {
    id: 4,
    word: "At daggers drawn",
    category: "Idioms",
    categoryBn: "বাগধারা ও প্রবাদ",
    meaningBn: "ভিষণ শত্রুতা ভাব / খড়্গহস্ত সম্পর্ক",
    meaningEn: "In a state of open hostility; bitter enemies.",
    sentenceEn: "The two local factions have been at daggers drawn for years.",
    sentenceBn: "দুইটি স্থানীয় গ্রুপ বছরের পর বছর ধরে ভিষণ শত্রুতাভাব বজায় রেখেছে।",
    examFactBn: "বাগধারাটির অর্থ 'Bitterly hostile' বা 'On the verge of fighting'।",
    examFactEn: "An idiom indicating extreme hostility or enmity. Often tested in MAT."
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
    examFactEn: "As a medical exam topic, medical spellings are high-yield. Remember: D-I-A-R-R-H-O-E-A."
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
    examFactEn: "Originates from Greek myth. Means a weak or vulnerable point."
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
    examFactEn: "Followed by the preposition 'on'. Note that the following verb must take the gerund (-ing) form."
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
    examFactEn: "Altruistic means selfless. Antonym is Selfish. High-yield synonym: Benevolent."
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
    examFactBn: "মজার টেকনিক: Lie (মিথ্যা) + U (তুমি) + Ten (দশ) + Ant (পিপড়া) = Lieutenant! এই চমৎকার সূত্রটি ব্যবহার করে কখনোই ভুলবেন না এবং ভর্তি পরীক্ষায় পূর্ণ নম্বর তুলুন।",
    examFactEn: "Mnemonic trick: Lie + U + Ten + Ant = Lieutenant. Memorize spelling: L-I-E-U-T-E-N-A-N-T."
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
    examFactEn: "Idiomatic phrase for eloquence or speaking skill. Correct meaning: Eloquence."
  },
  {
    id: 11,
    word: "Prone to",
    category: "Preposition",
    categoryBn: "উপযুক্ত প্রিপজিশন",
    meaningBn: "ঝুঁকিপূর্ণ / প্রবণতা রয়েছে এমন",
    meaningEn: "Likely to or liable to suffer from, do, or experience something.",
    sentenceEn: "Newborn babies are highly prone to winter infections.",
    sentenceBn: "নবজাতক শিশুরা শীতকালীন ইনফেকশনে আক্রান্ত হওয়ার ক্ষেত্রে অত্যন্ত ঝুঁকিপূর্ণ।",
    examFactBn: "Prone শব্দের পর সবসময় 'to' বসে যার অর্থ 'আক্রান্ত হবার আশঙ্কা'। একই রূপ প্রিপজিশন: Subject to, Susceptible to।",
    examFactEn: "Followed by the preposition 'to'. Similar expressions: Subject to, Susceptible to."
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
    examFactEn: "An adjective meaning kind and generous. Crucial Antonym: Malevolent."
  }
];

export default function GkSection({ currentUser, onProfileUpdate, language, theme }: GkSectionProps) {
  const [activeSubTab, setActiveSubTab] = useState<"timeline" | "sectors" | "heroes" | "quiz" | "english">("timeline");
  const [searchQuery, setSearchQuery] = useState("");

  // English Flashcards State
  const [englishSearch, setEnglishSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"All" | "Synonyms" | "Preposition" | "Idioms" | "Spelling">("All");
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});
  const [masteredCardIds, setMasteredCardIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem("mat_mastered_eng_cards");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleToggleMastered = (cardId: number) => {
    playSound("click");
    setMasteredCardIds((prev) => {
      let updated;
      if (prev.includes(cardId)) {
        updated = prev.filter((id) => id !== cardId);
      } else {
        updated = [...prev, cardId];
        try { playSound("victory"); } catch (e) {}
      }
      localStorage.setItem("mat_mastered_eng_cards", JSON.stringify(updated));
      return updated;
    });
  };

  const handleToggleFlip = (cardId: number) => {
    playSound("click");
    setFlippedCards((prev) => ({
      ...prev,
      [cardId]: !prev[cardId],
    }));
  };

  // Sector Map States
  const [selectedSectorId, setSelectedSectorId] = useState<number>(1);
  const [hoveredSectorId, setHoveredSectorId] = useState<number | null>(null);
  const [isTourActive, setIsTourActive] = useState<boolean>(false);

  // Auto-tour slideshow effect
  React.useEffect(() => {
    let timer: any;
    if (isTourActive) {
      timer = setInterval(() => {
        setSelectedSectorId((prev) => {
          const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
          const currIdx = ids.indexOf(prev);
          const nextIdx = (currIdx + 1) % ids.length;
          return ids[nextIdx];
        });
      }, 3000); // changes sector every 3 seconds
    }
    return () => clearInterval(timer);
  }, [isTourActive]);

  // Global Search GK Navigation Listener
  React.useEffect(() => {
    const handleGkSearchSelection = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        const { subTab, query, id } = customEvent.detail;
        if (subTab) {
          setActiveSubTab(subTab);
        }
        if (query !== undefined) {
          setSearchQuery(query);
        }
        if (id !== undefined) {
          if (subTab === "sectors") {
            setSelectedSectorId(Number(id));
          }
        }
      }
    };
    window.addEventListener("medibridge_gk_search_selected", handleGkSearchSelection);
    return () => window.removeEventListener("medibridge_gk_search_selected", handleGkSearchSelection);
  }, []);

  // Quiz State
  const [quizIdx, setQuizIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submittedQuiz, setSubmittedQuiz] = useState(false);
  const [quizPointsGained, setQuizPointsGained] = useState(0);

  const [streakCount, setStreakCount] = useState(1);

  const isDark = theme === "dark";

  // Actions for MCQ Quiz
  const handleOptionSelect = (idx: number) => {
    if (submittedQuiz) return;
    playSound("click");
    setSelectedOption(idx);
  };

  const handleQuizSubmit = () => {
    if (selectedOption === null || submittedQuiz) return;
    setSubmittedQuiz(true);
    const q = GK_QUIZ_QUESTIONS[quizIdx];
    const mappedQ: Question = {
      id: `gk_quiz_${q.id}`,
      questionText: language === "bn" ? q.questionBn : q.questionEn,
      options: language === "bn" ? q.optionsBn : q.optionsEn,
      correctAnswerIndex: q.correctIdx,
      explanation: language === "bn" ? q.explanationBn : q.explanationEn,
      subject: "GK",
      chapter: language === "bn" ? "সাধারণ জ্ঞান অনুশীলন" : "GK Practice",
      difficulty: "Medium"
    };

    if (selectedOption === q.correctIdx) {
      playSound("victory");
      setQuizPointsGained((p) => p + 10);
      setStreakCount((s) => s + 1);
      // Give XP/Score to profile
      const currentXp = currentUser.xp || 0;
      const currentSolved = currentUser.questionsSolved || 0;
      const currentCorrect = currentUser.questionsCorrect || 0;
      onProfileUpdate({
        xp: currentXp + 15,
        questionsSolved: currentSolved + 1,
        questionsCorrect: currentCorrect + 1,
      });
      
      removeQuestionMistake(currentUser.uid, mappedQ.id);
    } else {
      playSound("wrong");
      setStreakCount(1);
      
      logQuestionMistake(currentUser.uid, mappedQ);
    }
  };

  const handleNextQuiz = () => {
    playSound("click");
    setSelectedOption(null);
    setSubmittedQuiz(false);
    setQuizIdx((prev) => (prev + 1) % GK_QUIZ_QUESTIONS.length);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8">
      
      {/* HEADER HERO AREA */}
      <div className={`p-6 rounded-3xl border mb-8 relative overflow-hidden transition-all duration-300 ${
        isDark 
          ? "bg-gradient-to-br from-slate-900 to-indigo-950 border-white/5 text-white" 
          : "bg-gradient-to-br from-[#FFFCE7] to-[#FFF6D4] border-yellow-200 text-slate-900"
      }`}>
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <BookOpen className="w-48 h-48 rotating" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-3 ${
              isDark ? "bg-amber-500/10 text-amber-400" : "bg-yellow-500/20 text-yellow-700"
            }`}>
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>{language === "bn" ? "মেডিকেল ভর্তি সহায়িকা" : "Medical Admission Test Ready Direct GK"}</span>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              {language === "bn" ? "ম্যাট জেনারেল নলেজ প্ল্যাটফর্ম 🇧🇩" : "MAT General Knowledge Deck 🇧🇩"}
            </h1>
            <p className="text-sm mt-2 max-w-xl opacity-85 leading-relaxed">
              {language === "bn" 
                ? "এখানে রয়েছে অগেরিলা উপায়ে মনে রাখার টেকনিক, সম্পূর্ণ লিবারেশন ওয়ার টাইমলাইন এবং গেমার স্টাইল ইন্টারঅ্যাক্টিভ ফ্ল্যাশ-ফ্লিপ লার্নিং কার্ড।" 
                : "Dynamic interactive syllabus containing liberation timelines, heroic records, and 3D study flippers designed for maximum Retention."}
            </p>
          </div>

          <div className={`px-4 py-3 rounded-2xl border flex items-center gap-3.5 ${
            isDark ? "bg-black/30 border-white/5" : "bg-white/80 border-yellow-100"
          }`}>
            <span className="text-2xl">🔥</span>
            <div>
              <div className="text-xs text-gray-500 font-mono tracking-wider">STUDY STREAK</div>
              <div className="text-xl font-black font-mono text-amber-500">{streakCount}x Streak</div>
            </div>
          </div>
        </div>
      </div>

      {/* COMPONENT INTERACTIVE NAVIGATION BAR */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-150/10 pb-4">
        {[
          { id: "timeline", labelBn: "📅 ল্যান্ডমার্ক টাইমলাইন", labelEn: "📅 Roadmap Timeline", icon: Calendar },
          { id: "sectors", labelBn: "🗺️ ১১ সেক্টর ডিটেইলস", labelEn: "🗺️ 11 Sectors Grid", icon: Map },
          { id: "heroes", labelBn: "⚔️ বীরশ্রেষ্ঠ বীরগাথা", labelEn: "⚔️ Bir Sreshtho Icons", icon: Trophy },
          { id: "quiz", labelBn: "🏆 হাই-ইয়েল্ড কুইজ", labelEn: "🏆 High-Yield Tests", icon: Award },
          { id: "english", labelBn: "🎴 ইংলিশ ফ্ল্যাশকার্ডস", labelEn: "🎴 English Flashcards", icon: Layers }
        ].map((tab) => {
          const IconComponent = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                playSound("click");
                setActiveSubTab(tab.id as any);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/20 scale-102"
                  : isDark
                    ? "bg-white/5 text-gray-300 hover:bg-white/10"
                    : "bg-white border border-gray-200 text-slate-700 hover:bg-gray-50"
              }`}
            >
              <IconComponent className="w-4 h-4 shrink-0" />
              <span>{language === "bn" ? tab.labelBn : tab.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT WITH ANIMATE PRESENCE */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
        >
          {/* TAB 2: LANDMARK TIMELINE */}
          {activeSubTab === "timeline" && (
            <div className="space-y-6">
              
              {/* SEARCH FILTER */}
              <div className="relative max-w-md mx-auto">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={language === "bn" ? "শাল বা ঘটনা খুঁজুন..." : "Search key years or milestones..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-yellow-500 ${
                    isDark ? "bg-slate-900 border-white/5 text-white" : "bg-white border-gray-200 text-slate-800"
                  }`}
                />
              </div>

              {/* TIMELINE TREE */}
              <div className="relative border-l-2 border-dashed border-gray-150/20 pl-6 md:pl-10 space-y-8">
                {TIMELINE_DATA.filter((item) => {
                  const matchString = `${item.year} ${item.titleBn} ${item.titleEn} ${item.descBn} ${item.descEn}`.toLowerCase();
                  return matchString.includes(searchQuery.toLowerCase());
                }).map((item, idx) => (
                  <motion.div
                    key={item.year}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`p-5 rounded-2xl border transition-all dynamic-timeline-card relative ${
                      isDark ? "bg-slate-900/60 border-white/5" : "bg-white border-gray-200/90"
                    }`}
                  >
                    
                    {/* Timeline Dot Indicator */}
                    <div className="absolute -left-[37px] md:-left-[53px] top-6 w-7 h-7 rounded-full bg-yellow-500 border-4 border-black/80 flex items-center justify-center text-xs text-black z-20">
                      {item.icon}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-150/10 pb-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl md:text-2xl font-black font-mono text-yellow-500 bg-yellow-500/10 px-2.5 py-0.5 rounded-lg">
                          {item.year}
                        </span>
                        <div>
                          <h3 className="font-extrabold text-sm text-slate-800 dark:text-neutral-100">
                            {language === "bn" ? item.titleBn : item.titleEn}
                          </h3>
                          <span className="text-[10px] text-gray-500 font-mono tracking-wide">
                            {language === "bn" ? item.dateBn : item.dateEn}
                          </span>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider ${
                        isDark ? "bg-white/5 text-gray-400" : "bg-slate-100 text-slate-600"
                      }`}>
                        {item.tag}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-300 leading-relaxed">
                      {language === "bn" ? item.descBn : item.descEn}
                    </p>

                    {/* HIGH YIELD BOX */}
                    <div className={`mt-3.5 p-3 rounded-xl border flex items-start gap-2.5 ${
                      isDark ? "bg-yellow-500/5 border-yellow-500/10" : "bg-yellow-50 border-yellow-250/20"
                    }`}>
                      <span className="text-lg">⭐</span>
                      <div>
                        <span className="text-[9px] font-black uppercase text-yellow-600 dark:text-yellow-400 block font-mono">
                          {language === "bn" ? "ভর্তি পরীক্ষার জন্য গুরুত্বপূর্ণ (HIGH-YIELD POINTER):" : "MAT HIGH-YIELD POINTS:"}
                        </span>
                        <p className="text-xs text-slate-700 dark:text-neutral-200 mt-0.5 leading-normal">
                          {language === "bn" ? item.yieldBn : item.yieldEn}
                        </p>
                      </div>
                    </div>

                  </motion.div>
                ))}
              </div>

            </div>
          )}

          {/* TAB 3: 11 SECTORS */}
          {activeSubTab === "sectors" && (
            <div className="space-y-6">
              
              {/* INTRODUCTORY BANNER & TOUR CONTROL BAR */}
              <div className={`p-4 md:p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                isDark ? "bg-slate-900/60 border-white/5 text-white" : "bg-gradient-to-r from-red-500/5 to-emerald-500/5 border-gray-200 text-slate-800"
              }`}>
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-1.5 text-rose-500 animate-pulse">
                    <Map className="w-4 h-4" />
                    {language === "bn" ? "১১টি সেক্টরের ইন্টারেক্টিভ রণক্ষেত্র মানচিত্র" : "Interactive Battlefields of the 11 Sectors"}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xl">
                    {language === "bn" 
                      ? "পিনপয়েন্টে চাপ দিয়ে বা নিচের তালিকা ব্যবহার করে সেক্টর কমান্ডার, সীমানা এবং গুরুত্বপূর্ণ তথ্যসমূহ পর্যবেক্ষণ করুন।" 
                      : "Click sector pins on the map below or explore the database side-by-side to master crucial commanders and bounds."}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      playSound("click");
                      setIsTourActive(!isTourActive);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md ${
                      isTourActive
                        ? "bg-rose-500 text-white animate-pulse"
                        : isDark
                        ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/5"
                        : "bg-white hover:bg-slate-50 text-slate-700 border border-gray-200"
                    }`}
                  >
                    <span className="relative flex h-2 w-2">
                      {isTourActive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>}
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${isTourActive ? "bg-white" : "bg-gray-400"}`}></span>
                    </span>
                    {isTourActive 
                      ? (language === "bn" ? "অটো ট্যুর বন্ধ করুন" : "Pause Auto-Tour") 
                      : (language === "bn" ? "🚀 ট্যুর চালু করুন" : "🚀 Start Auto-Tour")}
                  </button>
                </div>
              </div>

              {/* DUAL-COLUMN BENTO GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* COLUMN 1: INTERACTIVE GEOGRAPHICAL SVG MAP OF BANGLADESH */}
                <div className="lg:col-span-5 space-y-4">
                  <div className={`p-4 rounded-3xl border flex flex-col items-center justify-center relative overflow-hidden backdrop-blur-md ${
                    isDark ? "bg-slate-950/40 border-white/5 text-white" : "bg-teal-50/15 border-gray-200 text-slate-800"
                  }`}>
                    
                    {/* Compass Rose Accent */}
                    <div className="absolute top-4 left-4 flex items-center gap-2 text-gray-400 dark:text-gray-600 text-[10px] font-mono leading-none">
                      <Compass className="w-5 h-5 animate-spin-slow text-teal-600 dark:text-teal-400" />
                      <div>
                        <span>N 23.685°</span>
                        <span className="block text-[8px]">E 90.356°</span>
                      </div>
                    </div>

                    {/* Waterways Accent Header */}
                    <div className="absolute top-4 right-4 text-right text-[8px] font-mono tracking-wider text-teal-600 dark:text-teal-400">
                      <span>BAY OF BENGAL LINK</span>
                      <span className="block opacity-60">SECTOR 10 COASTLINE</span>
                    </div>

                    {/* INTERACTIVE SVG TERRITORY MAP */}
                    <div className="w-full max-w-sm py-4 relative select-none">
                      <svg viewBox="0 0 500 620" className="w-full h-auto drop-shadow-xl" style={{ filter: "drop-shadow(0px 8px 16px rgba(0, 0, 0, 0.15))" }}>
                        
                        {/* Background Bangladesh Territorial Shape Path (Stylized Outline) */}
                        <path
                          d="M 180 50 C 130 90, 110 140, 100 170 C 90 200, 120 220, 130 250 C 140 280, 110 320, 120 350 C 130 380, 160 380, 160 410 C 160 440, 140 460, 170 480 C 190 490, 210 470, 240 470 C 270 470, 270 510, 290 530 C 310 550, 310 490, 275 480 C 270 470, 310 460, 330 460 C 350 460, 370 500, 390 510 C 410 520, 430 450, 420 400 C 430 360, 450 350, 450 320 C 450 290, 370 280, 380 250 C 390 220, 410 180, 400 150 C 380 120, 350 130, 330 140 C 310 155, 300 130, 280 120 C 260 110, 240 100, 210 120 C 200 110, 205 70, 180 50 Z"
                          fill={isDark ? "rgba(13, 148, 136, 0.05)" : "rgba(13, 148, 136, 0.03)"}
                          stroke={isDark ? "rgba(13, 148, 136, 0.25)" : "rgba(13, 148, 136, 0.2)"}
                          strokeWidth="2"
                          strokeDasharray="4,4"
                          className="transition-all duration-500"
                        />

                        {/* Major Rivers of Bangladesh representing strategic blockades */}
                        <path
                          d="M 110 320 Q 220 320 280 340 T 360 420"
                          fill="none"
                          stroke={isDark ? "rgba(56, 189, 248, 0.3)" : "rgba(14, 165, 233, 0.25)"}
                          strokeWidth="3"
                        />
                        <path
                          d="M 330 140 Q 320 250 350 360 T 290 520"
                          fill="none"
                          stroke={isDark ? "rgba(56, 189, 248, 0.3)" : "rgba(14, 165, 233, 0.25)"}
                          strokeWidth="2"
                        />

                        {/* Bay of Bengal / Nautical Coast waves */}
                        <path
                          d="M 230 495 Q 260 480 300 500 T 360 505"
                          fill="none"
                          stroke={isDark ? "rgba(56, 189, 248, 0.2)" : "rgba(14, 165, 233, 0.15)"}
                          strokeWidth="2.5"
                        />

                        {/* Tactical lines connecting selected sector to Dhaka Command Center */}
                        {SECTOR_DATA.map((item) => {
                          if (item.id === 2) return null; // skip default central sector
                          const isSelected = selectedSectorId === item.id;
                          return (
                            <line
                              key={`link-${item.id}`}
                              x1={320} // Sector 2 X coordinate
                              y1={370} // Sector 2 Y coordinate
                              x2={item.mapCoords.x}
                              y2={item.mapCoords.y}
                              stroke={isSelected ? "rgba(244, 63, 94, 0.65)" : "rgba(148, 163, 184, 0.1)"}
                              strokeWidth={isSelected ? "2.5" : "1"}
                              strokeDasharray={isSelected ? "4,3" : "3,4"}
                              className="transition-all duration-300"
                            />
                          );
                        })}

                        {/* SECTOR GLOWING NODES */}
                        {SECTOR_DATA.map((item) => {
                          const isSelected = selectedSectorId === item.id;
                          const isHovered = hoveredSectorId === item.id;
                          return (
                            <g
                              key={`sector-node-${item.id}`}
                              className="cursor-pointer"
                              onMouseEnter={() => setHoveredSectorId(item.id)}
                              onMouseLeave={() => setHoveredSectorId(null)}
                              onClick={() => {
                                playSound("click");
                                setSelectedSectorId(item.id);
                                setIsTourActive(false); // Pause auto playback on manual select
                              }}
                            >
                              {/* Pulsing Outer Range Outer Ring */}
                              {isSelected && (
                                <motion.circle
                                  cx={item.mapCoords.x}
                                  cy={item.mapCoords.y}
                                  r="20"
                                  fill="none"
                                  stroke="#f43f5e"
                                  strokeWidth="2"
                                  animate={{ scale: [1, 1.35, 1], opacity: [0.6, 1, 0.6] }}
                                  transition={{ repeat: Infinity, duration: 2 }}
                                />
                              )}

                              {/* Interactive Circle Pin */}
                              <circle
                                cx={item.mapCoords.x}
                                cy={item.mapCoords.y}
                                r={isSelected ? "11" : isHovered ? "10" : "8"}
                                className={`transition-all duration-300 ${
                                  isSelected 
                                    ? "fill-rose-500 stroke-white dark:stroke-slate-900 shadow-md" 
                                    : isHovered
                                    ? "fill-amber-500 stroke-white dark:stroke-slate-900"
                                    : "fill-emerald-600/90 dark:fill-teal-500/80 stroke-white dark:stroke-slate-950"
                                }`}
                                strokeWidth="1.5"
                              />

                              {/* Sector ID Number Label */}
                              <text
                                x={item.mapCoords.x}
                                y={item.mapCoords.y + 3.5}
                                textAnchor="middle"
                                className="font-mono text-[9px] font-extrabold select-none pointer-events-none fill-white"
                              >
                                {item.id}
                              </text>
                            </g>
                          );
                        })}

                        {/* Floating Tooltips inside SVG using clean absolute positions */}
                        <AnimatePresence>
                          {hoveredSectorId !== null && (
                            <g className="pointer-events-none">
                              {(() => {
                                const hoveredSec = SECTOR_DATA.find((s) => s.id === hoveredSectorId);
                                if (!hoveredSec) return null;
                                // position of tooltips properly bounded in frame
                                const tX = Math.max(10, Math.min(310, hoveredSec.mapCoords.x - 90));
                                const tY = Math.max(10, hoveredSec.mapCoords.y - 85);
                                return (
                                  <foreignObject
                                    x={tX}
                                    y={tY}
                                    width="180"
                                    height="80"
                                    className="overflow-visible"
                                  >
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.95 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      exit={{ opacity: 0 }}
                                      className="bg-slate-950/95 border border-amber-500/30 text-white rounded-xl p-2.5 shadow-2xl backdrop-blur-md text-[10px]"
                                    >
                                      <div className="flex justify-between items-center font-extrabold text-amber-500 mb-0.5">
                                        <span>Sector {hoveredSec.id}</span>
                                        <span className="text-[7.5px] uppercase tracking-wider text-teal-400 font-bold px-1 py-0.2 bg-teal-400/10 rounded">
                                          HQ: {language === "bn" ? hoveredSec.hqBn : hoveredSec.hqEn}
                                        </span>
                                      </div>
                                      <div className="text-slate-200 font-bold truncate">
                                        {language === "bn" ? hoveredSec.commandersBn : hoveredSec.commandersEn}
                                      </div>
                                      <div className="text-slate-400 text-[8px] leading-tight line-clamp-2 mt-0.5">
                                        {language === "bn" ? hoveredSec.coverageBn : hoveredSec.coverageEn}
                                      </div>
                                    </motion.div>
                                  </foreignObject>
                                );
                              })()}
                            </g>
                          )}
                        </AnimatePresence>

                      </svg>
                    </div>

                    {/* Help indicator label */}
                    <div className="text-[10px] text-gray-500 flex items-center justify-center gap-1 mt-1 font-mono">
                      <span>💡</span>
                      <span>{language === "bn" ? "পিনসমূহে টাচ করে সেক্টর পরিবর্তন করুন" : "Hover or Tap to trigger battle statistics"}</span>
                    </div>

                  </div>

                  {/* QUICK BUTTONS NAVIGATOR BAR */}
                  <div className={`p-4 rounded-3xl border ${
                    isDark ? "bg-slate-900/40 border-white/5" : "bg-white border-gray-150"
                  }`}>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-2 font-mono tracking-wider text-center">
                      {language === "bn" ? "⚡ দ্রুত সেক্টর সিলেক্টর গ্রিড" : "⚡ QUICK SECTOR SELECTOR"}
                    </span>
                    <div className="grid grid-cols-6 gap-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((sId) => (
                        <button
                          key={`btn-shortcut-${sId}`}
                          onClick={() => {
                            playSound("click");
                            setSelectedSectorId(sId);
                            setIsTourActive(false);
                          }}
                          className={`py-2 rounded-lg font-mono text-xs font-black transition-all cursor-pointer ${
                            selectedSectorId === sId
                              ? "bg-rose-500 text-white shadow-md shadow-rose-500/25 border-rose-500"
                              : isDark
                              ? "bg-slate-800/40 hover:bg-slate-800 border border-white/5 text-slate-300"
                              : "bg-slate-100 hover:bg-slate-200 border border-gray-200 text-slate-700"
                          }`}
                        >
                          S{sId}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>

                {/* COLUMN 2: SELECTED SECTOR DETAILED INFO DASHBOARD */}
                <div className="lg:col-span-7 space-y-4">
                  {(() => {
                    const activeSector = SECTOR_DATA.find((s) => s.id === selectedSectorId) || SECTOR_DATA[0];
                    return (
                      <motion.div
                        key={activeSector.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`p-6 md:p-8 rounded-3xl border relative ${
                          isDark ? "bg-slate-900/60 border-white/5 text-white" : "bg-white border-gray-200 text-slate-800"
                        }`}
                        style={{ boxShadow: isDark ? "none" : "0 10px 30px -10px rgba(0,0,0,0.05)" }}
                      >
                        {/* Huge background watermark number */}
                        <div className="absolute top-4 right-6 text-7xl font-sans font-black tracking-tighter opacity-10 select-none font-mono">
                          #{activeSector.id}
                        </div>

                        {/* SECTOR ID HEADER BADGE */}
                        <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-gray-150/15 pb-4">
                          <span className="text-xs font-black px-3.5 py-1.5 bg-rose-500/15 text-rose-500 rounded-xl uppercase tracking-widest font-mono">
                            {language === "bn" ? `সেক্টর ${activeSector.id} রণক্ষেত্র` : `Sector ${activeSector.id} Battleground`}
                          </span>

                          <div className={`px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wide flex items-center gap-1.5 ${
                            isDark ? "bg-white/5 text-gray-400" : "bg-slate-100 text-slate-600"
                          }`}>
                            <Flag className="w-3.5 h-3.5 text-rose-500" />
                            <span>HQ: {language === "bn" ? activeSector.hqBn : activeSector.hqEn}</span>
                          </div>
                        </div>

                        {/* DETAILED STATS GRID */}
                        <div className="space-y-6">
                          
                          {/* Sector Commanders */}
                          <div className="relative pl-7">
                            <div className="absolute left-0 top-0.5 p-1 bg-yellow-500/10 rounded-lg text-yellow-500">
                              <ShieldCheck className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] text-gray-400 uppercase font-bold block font-mono tracking-wider mb-1">
                              {language === "bn" ? "সেক্টর কমান্ডারসমূহ (COMMANDERS)" : "SECTOR COMMANDERS"}
                            </span>
                            <span className="text-sm font-extrabold font-sans text-amber-500 leading-normal block">
                              {language === "bn" ? activeSector.commandersBn : activeSector.commandersEn}
                            </span>
                          </div>

                          {/* Geographic coverage bounds */}
                          <div className="relative pl-7">
                            <div className="absolute left-0 top-0.5 p-1 bg-teal-500/10 rounded-lg text-teal-500">
                              <Map className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] text-gray-400 uppercase font-bold block font-mono tracking-wider mb-1">
                              {language === "bn" ? "আঞ্চলিক সীমানা ও রণক্ষেত্র (GEOGRAPHICAL COVERAGE)" : "GEOGRAPHICAL SCOPE & WARZONE"}
                            </span>
                            <span className="text-xs opacity-90 leading-relaxed block dark:text-neutral-200">
                              {language === "bn" ? activeSector.coverageBn : activeSector.coverageEn}
                            </span>
                          </div>

                          {/* Special dynamic landmark fun fact / MAT takeaway */}
                          <div className={`mt-5 p-5 rounded-2xl border flex items-start gap-4 transition-all duration-300 ${
                            isDark 
                              ? "bg-rose-500/5 border-rose-500/10 hover:bg-rose-500/10" 
                              : "bg-rose-50/50 border-rose-100 hover:bg-rose-50/80"
                          }`}>
                            <div className="text-2xl mt-0.5 flex-none select-none">💡</div>
                            <div>
                              <span className="text-[9px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 block font-mono">
                                {language === "bn" ? "মেডিকেল ভর্তি পরীক্ষার জন্য অত্যন্ত গুরুত্বপূর্ণ (MAT KEY POINT):" : "MAT SPECIFIC KEY TAKEAWAY:"}
                              </span>
                              <p className="text-xs font-semibold leading-relaxed mt-1 dark:text-gray-300">
                                {language === "bn" ? activeSector.specialBn : activeSector.specialEn}
                              </p>
                            </div>
                          </div>

                        </div>

                      </motion.div>
                    );
                  })()}

                  {/* MINI DATABASE LIST OF ALL SECTORS FOR COMPARATIVE SEARCH */}
                  <div className={`p-5 rounded-3xl border ${
                    isDark ? "bg-slate-950/40 border-white/5" : "bg-slate-50/70 border-gray-200"
                  }`}>
                    <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                      <span className="text-xs font-extrabold uppercase font-mono tracking-wider text-emerald-600 dark:text-teal-400">
                        {language === "bn" ? "📋 দ্রুত রেফারেন্স তালিকা" : "📋 COHESIVE COMPARISON DATABASE"}
                      </span>
                      <span className="text-[10px] font-mono text-gray-500">
                        Total {SECTOR_DATA.length} Sectors Registered
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                      {SECTOR_DATA.map((sec) => (
                        <button
                          key={`list-ref-${sec.id}`}
                          onClick={() => {
                            playSound("click");
                            setSelectedSectorId(sec.id);
                            setIsTourActive(false);
                          }}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between gap-2.5 ${
                            selectedSectorId === sec.id
                              ? "bg-rose-500/10 border-rose-500/40 shadow-xs"
                              : isDark
                              ? "bg-slate-900/50 border-white/5 hover:border-slate-700/60 text-white"
                              : "bg-white border-gray-200 hover:border-gray-300 text-slate-800"
                          }`}
                        >
                          <div className="truncate">
                            <span className="text-[10px] font-black font-mono text-rose-500 block">
                              {language === "bn" ? `সেক্টর ${sec.id}` : `SECTOR ${sec.id}`}
                            </span>
                            <span className="text-xs font-bold truncate block">
                              {language === "bn" ? sec.commandersBn.split(",")[0] : sec.commandersEn.split(",")[0]}
                            </span>
                          </div>
                          <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 bg-black/5 dark:bg-black/30 rounded text-gray-500">
                            HQ: {language === "bn" ? sec.hqBn.split(" ")[0] : sec.hqEn.split(" ")[0]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* TAB 4: BIR SRESHHTHOS */}
          {activeSubTab === "heroes" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {BIR_SRESHTHO_DATA.map((hero) => (
                  <div
                    key={hero.nameEn}
                    className={`p-6 rounded-3xl border transition-all hover:-translate-y-1 relative overflow-hidden ${
                      isDark ? "bg-slate-950/80 border-slate-800 text-white" : "bg-white border-gray-200 text-slate-800"
                    }`}
                  >
                    <div className="absolute top-0 right-0 p-6 text-4xl opacity-15 pointer-events-none">
                      {hero.emoji}
                    </div>

                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 border border-yellow-500/25 flex items-center justify-center text-2xl">
                        🎖️
                      </div>
                      <div>
                        <h3 className="text-lg font-black tracking-tight">{language === "bn" ? hero.nameBn : hero.nameEn}</h3>
                        <span className="text-xs font-semibold text-rose-500">{language === "bn" ? hero.rankBn : hero.rankEn}</span>
                      </div>
                    </div>

                    <div className="space-y-2.5 text-xs border-t border-gray-150/10 pt-3 mb-4">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase block font-mono">{language === "bn" ? "বাহিনীর শাখা" : "Force Branch"}</span>
                          <span className="font-bold">{language === "bn" ? hero.forceBn : hero.forceEn}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase block font-mono">{language === "bn" ? "অপারেশন সেক্টর" : "Sector ID"}</span>
                          <span className="font-bold text-amber-500">{hero.sector}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase block font-mono">{language === "bn" ? "মৃত্যু ও শাহাদাত" : "Date of Death"}</span>
                          <span>{language === "bn" ? hero.diedBn : hero.diedEn}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase block font-mono">{language === "bn" ? "জন্ম / মৃত্যু জেলা" : "Districts"}</span>
                          <span>{language === "bn" ? hero.districtBn : hero.districtEn}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-500 uppercase block font-mono">{language === "bn" ? "সমাধিস্থল" : "Burial Location"}</span>
                        <span className="font-semibold text-emerald-500">{language === "bn" ? hero.burialBn : hero.burialEn}</span>
                      </div>
                    </div>

                    <div className={`p-3 rounded-xl text-xs leading-relaxed font-sans ${
                      isDark ? "bg-[#C1121F]/10 text-rose-300" : "bg-rose-50 text-rose-800"
                    }`}>
                      <span className="font-bold uppercase tracking-wider text-[9px] block mb-0.5">{language === "bn" ? "রণকৌশল ও বীরত্বগাঁথা" : "LEGENDARY BATTLE STORY"}</span>
                      {language === "bn" ? hero.keyFactBn : hero.keyFactEn}
                    </div>

                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: HIGH-YIELD QUIZ */}
          {activeSubTab === "quiz" && (
            <div className="max-w-2xl mx-auto">
              
              {/* POINTS GRAPHIC BAR */}
              <div className={`p-4 rounded-2xl border mb-6 flex justify-between items-center ${
                isDark ? "bg-black/20 border-white/5" : "bg-white border-gray-150"
              }`}>
                <span className="text-xs font-bold text-gray-500">
                  {language === "bn" ? "কুইজ সেশন প্রগ্রেস" : "Quiz points Tracker"}
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-xl">🏆</span>
                  <span className="text-sm font-extrabold text-yellow-500 font-mono">+{quizPointsGained} PTS</span>
                </div>
              </div>

              {/* ACTIVE QUESTION BOARD */}
              <div className={`p-6 md:p-8 rounded-3xl border ${
                isDark ? "bg-slate-900 border-white/5 text-white" : "bg-white border-gray-200 text-slate-800"
              }`}>
                <div className="flex justify-between items-center mb-6">
                  <span className="px-3 py-1 bg-yellow-500/10 text-yellow-500 font-bold font-mono rounded-lg text-xs">
                    QUESTION {quizIdx + 1} / {GK_QUIZ_QUESTIONS.length}
                  </span>
                  <span className="text-xs font-bold text-gray-400">MAT PREP</span>
                </div>

                <h3 className="text-lg md:text-xl font-bold font-sans tracking-tight mb-6 leading-relaxed">
                  {language === "bn" ? GK_QUIZ_QUESTIONS[quizIdx].questionBn : GK_QUIZ_QUESTIONS[quizIdx].questionEn}
                </h3>

                {/* OPTIONS LIST */}
                <div className="space-y-3.5 mb-6">
                  {(language === "bn" ? GK_QUIZ_QUESTIONS[quizIdx].optionsBn : GK_QUIZ_QUESTIONS[quizIdx].optionsEn).map((opt, oIdx) => {
                    const isSelected = selectedOption === oIdx;
                    const isCorrect = GK_QUIZ_QUESTIONS[quizIdx].correctIdx === oIdx;
                    
                    let bgStyles = isDark 
                      ? "bg-white/[0.02] border-white/5 text-white hover:bg-white/[0.05]" 
                      : "bg-gray-50 border-gray-200 text-slate-800 hover:bg-gray-100";

                    if (isSelected) {
                      bgStyles = "bg-yellow-500/20 border-yellow-500 text-yellow-500";
                    }

                    if (submittedQuiz) {
                      if (isCorrect) {
                        bgStyles = "bg-emerald-500/20 border-emerald-500 text-emerald-500";
                      } else if (isSelected) {
                        bgStyles = "bg-red-500/20 border-red-500 text-red-500";
                      }
                    }

                    return (
                      <button
                        key={oIdx}
                        disabled={submittedQuiz}
                        onClick={() => handleOptionSelect(oIdx)}
                        className={`w-full p-4 rounded-2xl border text-left text-xs font-bold transition-all cursor-pointer flex justify-between items-center ${bgStyles}`}
                      >
                        <span>{opt}</span>
                        {submittedQuiz && isCorrect && <CheckCircle className="w-4.5 h-4.5 text-emerald-500" />}
                        {submittedQuiz && isSelected && !isCorrect && <XCircle className="w-4.5 h-4.5 text-red-500" />}
                      </button>
                    );
                  })}
                </div>

                {/* ACTION TRIGGERS */}
                <div className="flex gap-4">
                  {!submittedQuiz ? (
                    <button
                      onClick={handleQuizSubmit}
                      disabled={selectedOption === null}
                      className="w-full py-4 bg-yellow-500 text-black font-black text-xs uppercase tracking-wider rounded-2xl hover:opacity-90 disabled:opacity-40 transition-all cursor-pointer"
                    >
                      {language === "bn" ? "উত্তর সাবমিট করুন" : "CONFIRM ANSWER"}
                    </button>
                  ) : (
                    <button
                      onClick={handleNextQuiz}
                      className="w-full py-4 bg-gradient-to-r from-slate-800 to-slate-900 border border-white/5 text-white font-black text-xs uppercase tracking-wider rounded-2xl hover:opacity-90 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>{language === "bn" ? "পরবর্তী কুইজ" : "NEXT QUESTION"}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* HISTORICAL EXPLANATION INSIGHT */}
                {submittedQuiz && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className={`mt-6 p-4 rounded-2xl border ${
                      isDark ? "bg-white/[0.01] border-white/5 text-gray-300" : "bg-neutral-50 border-gray-200 text-neutral-600"
                    }`}
                  >
                    <span className="text-[10px] text-yellow-500 font-extrabold uppercase block mb-1 font-mono tracking-wider">
                      {language === "bn" ? "মেডিকেল ভর্তি সহায়কের সঠিক ব্যাখ্যা (IN-DEPTH EXPLANATION):" : "ACADEMIC FEEDBACK:"}
                    </span>
                    <p className="text-xs leading-relaxed">
                      {language === "bn" ? GK_QUIZ_QUESTIONS[quizIdx].explanationBn : GK_QUIZ_QUESTIONS[quizIdx].explanationEn}
                    </p>
                  </motion.div>
                )}

              </div>
            </div>
          )}

          {/* TAB 6: ENGLISH FLASH CARDS */}
          {activeSubTab === "english" && (
            <div className="space-y-6">
              
              {/* SEARCH & FILTERS CONTROLS */}
              <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-transparent">
                
                {/* CATEGORY BAR */}
                <div className="flex flex-wrap gap-1.5 shrink-0">
                  {([
                    { id: "All", bn: "সব", en: "All" },
                    { id: "Synonyms", bn: "সমার্থক/বিপরীত", en: "Vocabulary" },
                    { id: "Preposition", bn: "প্রিপজিশন", en: "Prepositions" },
                    { id: "Idioms", bn: "বাগধারা", en: "Idioms" },
                    { id: "Spelling", bn: "বানান", en: "Spellings" }
                  ] as const).map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          playSound("click");
                          setSelectedCategory(cat.id);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          isSelected
                            ? "bg-yellow-500 text-black shadow"
                            : isDark
                            ? "bg-slate-800 text-slate-300 border border-white/5"
                            : "bg-white border border-gray-250 hover:bg-gray-50 text-slate-700"
                        }`}
                      >
                        {language === "bn" ? cat.bn : cat.en}
                      </button>
                    );
                  })}
                </div>

                {/* SEARCH INPUT */}
                <div className="relative w-full md:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-450" />
                  <input
                    type="text"
                    value={englishSearch}
                    onChange={(e) => setEnglishSearch(e.target.value)}
                    placeholder={language === "bn" ? "শব্দ বা ব্যাখ্যা খুঁজুন..." : "Search word or fact..."}
                    className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs focus:outline-none focus:border-yellow-500 transition-all ${
                      isDark
                        ? "bg-slate-900 border-white/5 text-white placeholder-slate-500"
                        : "bg-white border-gray-200 text-slate-800 placeholder-slate-400"
                    }`}
                  />
                </div>

              </div>

              {/* STATS PROGRESS OVERVIEW */}
              <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row justify-between items-center gap-3 ${
                isDark ? "bg-slate-900/40 border-white/5 text-gray-300" : "bg-yellow-50/40 border-yellow-105 text-slate-800"
              }`}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎯</span>
                  <p className="text-xs font-semibold leading-none">
                    {language === "bn"
                      ? `আপনি ১২টি হাই-ইয়েল্ড কার্ডের মধ্যে ${masteredCardIds.length}টি আয়ত্ত করেছেন!`
                      : `You mastered ${masteredCardIds.length} of 12 high-yield test cards!`}
                  </p>
                </div>
                
                {/* Progress bar */}
                <div className="w-full sm:w-48 h-2 bg-gray-250 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500 transition-all duration-500"
                    style={{ width: `${(masteredCardIds.length / 12) * 100}%` }}
                  />
                </div>
              </div>

              {/* FLASHCARDS GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {ENGLISH_FLASHCARDS.filter((card) => {
                  const matchesCat = selectedCategory === "All" || card.category === selectedCategory;
                  const matchesSearch =
                    card.word.toLowerCase().includes(englishSearch.toLowerCase()) ||
                    card.meaningBn.includes(englishSearch) ||
                    card.meaningEn.toLowerCase().includes(englishSearch.toLowerCase());
                  return matchesCat && matchesSearch;
                }).map((card) => {
                  const isFlipped = !!flippedCards[card.id];
                  const isMastered = masteredCardIds.includes(card.id);
                  return (
                    <div
                      key={card.id}
                      className="h-80 w-full relative block perspective-1000 group cursor-pointer"
                      onClick={() => handleToggleFlip(card.id)}
                    >
                      {/* CARD CONTAINER WITH 3D FLIP EFFECT */}
                      <div
                        className={`w-full h-full relative transition-all duration-500 transform-style-3d ${
                          isFlipped ? "rotate-y-180" : ""
                        }`}
                      >
                        
                        {/* FRONT OF THE CARD */}
                        <div
                          className={`absolute inset-0 w-full h-full p-6 rounded-3xl border backface-hidden flex flex-col justify-between transition-all duration-300 overflow-hidden ${
                            isMastered
                              ? isDark
                                ? "bg-gradient-to-br from-teal-950/40 to-slate-900 border-teal-500/30 text-white"
                                : "bg-gradient-to-br from-emerald-50/60 to-white border-emerald-200 text-slate-800"
                              : isDark
                              ? "bg-slate-900 border-white/5 text-white hover:border-slate-800"
                              : "bg-white border-gray-200 text-slate-800 hover:border-gray-350"
                          }`}
                          style={{
                            boxShadow: isDark ? "none" : "0 8px 24px -12px rgba(0,0,0,0.08)"
                          }}
                        >
                          {/* Top badge line */}
                          <div className="flex justify-between items-center w-full">
                            <span className={`px-2.5 py-1 rounded-md text-[9px] font-extrabold uppercase tracking-widest ${
                              isDark ? "bg-white/5 text-amber-400" : "bg-yellow-50 text-yellow-600 border border-yellow-105"
                            }`}>
                              {language === "bn" ? card.categoryBn : card.category}
                            </span>
                            
                            {/* Mastery Badge / Bookmark */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleMastered(card.id);
                              }}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                isMastered
                                  ? "bg-emerald-500 text-white border-emerald-400 scale-105"
                                  : isDark
                                  ? "bg-white/5 border-white/5 text-gray-500 hover:text-white"
                                  : "bg-slate-50 border-gray-200 text-gray-400 hover:text-gray-600"
                              }`}
                              title={isMastered ? "Mark as Review Needed" : "Mark as Mastered"}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Word Center */}
                          <div className="my-auto text-center py-4">
                            <h2 className="text-xl font-extrabold tracking-tight break-words font-sans mb-1">
                              {card.word}
                            </h2>
                            <p className="text-[10px] text-gray-400 font-mono tracking-wide uppercase">
                              {language === "bn" ? "কার্ডটি ফ্লিপ করতে ক্লিক করুন" : "Click card to flip over"}
                            </p>
                          </div>

                          {/* Card Footer Indicator */}
                          <div className="flex justify-between items-center text-[10px] text-gray-400 pt-3 border-t border-gray-150/10 w-full font-mono">
                            <span>#{card.id} HIGH-YIELD</span>
                            <span className="flex items-center gap-1 text-yellow-500">
                              <Layers className="w-3.5 h-3.5 animate-pulse" />
                              <span>{language === "bn" ? "উল্টান" : "FLIP"}</span>
                            </span>
                          </div>

                        </div>

                        {/* BACK OF THE CARD */}
                        <div
                          className={`absolute inset-0 w-full h-full p-6 rounded-3xl border backface-hidden rotate-y-180 flex flex-col justify-between overflow-y-auto ${
                            isDark
                              ? "bg-slate-950 border-amber-500/20 text-white"
                              : "bg-slate-50 border-gray-300 text-slate-800"
                          }`}
                        >
                          
                          {/* Back Top Bar */}
                          <div className="flex justify-between items-center border-b border-gray-150/10 pb-2 mb-2">
                            <span className="text-[9px] font-extrabold tracking-wider text-amber-500 uppercase font-mono">
                              {language === "bn" ? "ব্যাখ্যা ও সমাধান" : "ACADEMIC CORNER"}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono">#{card.id}</span>
                          </div>

                          {/* Meanings */}
                          <div className="space-y-3">
                            <div>
                              <span className="text-[8.5px] uppercase font-bold text-gray-400 block font-mono">
                                {language === "bn" ? "অর্থ (BENGALI MEANING):" : "BENGALI MEANING:"}
                              </span>
                              <p className="text-xs font-bold text-slate-800 dark:text-neutral-100">
                                {card.meaningBn}
                              </p>
                            </div>

                            <div>
                              <span className="text-[8.5px] uppercase font-bold text-gray-400 block font-mono">
                                {language === "bn" ? "ইংরেজি সংজ্ঞা (DEFINITION):" : "ENGLISH DEFINITION:"}
                              </span>
                              <p className="text-xs leading-normal opacity-90 dark:text-gray-300">
                                {card.meaningEn}
                              </p>
                            </div>

                            {/* Synonym / Antonyms if available */}
                            {(card.synonyms || card.antonyms) && (
                              <div className="p-2 rounded-xl bg-slate-900/30 border border-white/5 space-y-1">
                                {card.synonyms && (
                                  <p className="text-[10px]">
                                    <strong className="text-emerald-500 font-mono">SYN:</strong> {card.synonyms}
                                  </p>
                                )}
                                {card.antonyms && (
                                  <p className="text-[10px]">
                                    <strong className="text-red-500 font-mono">ANT:</strong> {card.antonyms}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Sentence Example */}
                            <div>
                              <span className="text-[8.5px] uppercase font-bold text-gray-400 block font-mono">
                                {language === "bn" ? "প্রয়োগ (EXAMPLE SENTENCE):" : "CONTEXT EXAMPLES:"}
                              </span>
                              <p className="text-[11px] italic leading-tight text-amber-500 mt-0.5">
                                "{card.sentenceEn}"
                              </p>
                              <p className="text-[10px] text-gray-405 mt-0.5 leading-snug">
                                {language === "bn" ? card.sentenceBn : card.sentenceBn}
                              </p>
                            </div>
                          </div>

                          {/* Medical Admission high yield fact */}
                          <div className={`mt-3 p-2.5 rounded-xl border text-[10px] leading-relaxed ${
                            isDark ? "bg-yellow-500/5 border-yellow-500/10 text-yellow-300" : "bg-yellow-50 border-yellow-200 text-yellow-800"
                          }`}>
                            <strong className="block text-[8px] uppercase tracking-wider font-mono text-amber-500">
                              {language === "bn" ? "ভর্তি পরীক্ষার হ্যাক (MAT HIGHLIGHT):" : "MAT SPECIFIC TIP:"}
                            </strong>
                            {language === "bn" ? card.examFactBn : card.examFactEn}
                          </div>

                          {/* Return Button inside foot */}
                          <div className="text-[9px] text-center text-slate-400 pt-2 border-t border-gray-150/10 font-mono">
                            {language === "bn" ? "ফিরে যেতে আবার ক্লিক করুন" : "Click to flip front"}
                          </div>

                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

        </motion.div>
      </AnimatePresence>

    </div>
  );
}
