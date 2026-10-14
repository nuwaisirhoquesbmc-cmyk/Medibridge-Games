// GlobalSearchData.ts - High-Yield textbook content, admission info, mnemonics, and custom quizzes for all search items.

export interface EnhancedQuizQuestion {
  questionTextBn: string;
  questionTextEn: string;
  optionsBn: string[];
  optionsEn: string[];
  correctIndex: number;
  explanationBn: string;
  explanationEn: string;
}

export interface EnhancedChapter {
  summaryBn: string;
  summaryEn: string;
  factsBn: string[];
  factsEn: string[];
  mnemonicBn: string;
  mnemonicEn: string;
  quizQuestion: EnhancedQuizQuestion;
}

export interface EnhancedTimeline {
  detailedInfoBn: string;
  detailedInfoEn: string;
  quizQuestion: EnhancedQuizQuestion;
}

export interface EnhancedHero {
  burialPlaceBn: string;
  burialPlaceEn: string;
  factsBn: string[];
  factsEn: string[];
  quizQuestion: EnhancedQuizQuestion;
}

export interface EnhancedSector {
  factsBn: string[];
  factsEn: string[];
  quizQuestion: EnhancedQuizQuestion;
}

export interface EnhancedEnglish {
  quizQuestion: EnhancedQuizQuestion;
}

export const CHAPTER_ENHANCED_DATA: Record<number, EnhancedChapter> = {
  // 0: কোষ ও এর গঠন
  0: {
    summaryBn: "কোষপ্রাচীর, কোষঝিল্লি, সাইটোপ্লাজমীয় অঙ্গাণু (মাইটোকন্ড্রিয়া, প্লাস্টিড, রাইবোজোম, গলজি বডি, লাইসোজোম), নিউক্লিয়াস, ক্রোমোজোম, DNA এবং RNA এর গঠন ও কাজ।",
    summaryEn: "Cell wall, membrane, cytoplasmic organelles (mitochondria, plastids, ribosomes, golgi, lysosomes), nucleus, chromosomes, DNA and RNA structure.",
    factsBn: [
      "মাইটোকন্ড্রিয়াকে কোষের শক্তিঘর (Powerhouse) বলা হয়।",
      "রাইবোজোমকে প্রোটিন ফ্যাক্টরি (Protein Factory) বলা হয়।",
      "লাইসোজোমকে কোষের আত্মঘাতী থলিকা (Suicidal Bag) বলা হয়।",
      "প্লাস্টিডকে কোষের রান্নাঘর বলা হয়।"
    ],
    factsEn: [
      "Mitochondria is known as the Powerhouse of the cell.",
      "Ribosome is known as the Protein Factory of the cell.",
      "Lysosome is called the Suicidal Bag due to hydrolytic enzymes.",
      "Plastid is termed the Kitchen of the cell."
    ],
    mnemonicBn: "ঝিল্লিহীন সাইটোপ্লাজমীয় অঙ্গাণু মনে রাখার ছন্দ: 'মামা নাই প্রিয় বেলুন দিলে শান্ত হবে' (মাইক্রোটিউবিউলস, সেন্ট্রোসোম, রাইবোজোম, প্রোটিয়াসোম, ইন্টারমিডিয়েট ফিলামেন্ট, নিউক্লিওলাস)।",
    mnemonicEn: "Membrane-less organelles mnemonic: 'MAMA NAI PRIYO BELUN' (Microtubules, Centrosome, Ribosome, Nucleolus, Proteasome).",
    quizQuestion: {
      questionTextBn: "নিচের কোনটি কোষের ঝিল্লিহীন বা পর্দাবিহীন সাইটোপ্লাজমীয় অঙ্গাণু?",
      questionTextEn: "Which of the following is a membrane-less cytoplasmic organelle?",
      optionsBn: ["মাইটোকন্ড্রিয়া", "লাইসোজোম", "রাইবোজোম", "গলজি বডি"],
      optionsEn: ["Mitochondria", "Lysosome", "Ribosome", "Golgi Body"],
      correctIndex: 2,
      explanationBn: "রাইবোজোম এবং সেন্ট্রোসোম হলো পর্দাবিহীন অঙ্গাণু, অপরদিকে মাইটোকন্ড্রিয়া, প্লাস্টিড ও লাইসোজোম দ্বিস্তরী ঝিল্লি দ্বারা আবৃত থাকে।",
      explanationEn: "Ribosomes and Centrosomes are membrane-less, whereas mitochondria, plastids, and lysosomes are bound by double membranes."
    }
  },
  // 1: কোষ বিভাজন
  1: {
    summaryBn: "মাইটোসিস ও মিওসিস বিভাজনের বিভিন্ন পর্যায় (প্রোফেজ, প্রো-মেটাফেজ, মেটাফেজ, অ্যানাফেজ, টেলোফেজ) এবং গুরুত্ব। মিওসিস-১ এর প্রফেজ-১ উপদশাগুলো (লেপ্টোটিন, জাইগোটিন, প্যাকাইটিন, ডিপ্লোটিন, ডায়াকিনেসিস) মেডিকেল পরীক্ষার জন্য অত্যন্ত গুরুত্বপূর্ণ।",
    summaryEn: "Mitosis and Meiosis phases (prophase, metaphase, anaphase, telophase). Meiosis-1 Prophase-1 sub-stages are highly high-yield.",
    factsBn: [
      "ক্রসিং ওভার ঘটে প্যাকাইটিন উপদশায়।",
      "সিন্যাপসিস বা হোমোলোগাস ক্রোমোজোমের জোড় বাঁধা ঘটে জাইগোটিন উপদশায়।",
      "ক্রোমোজোমগুলো সবচেয়ে খাটো এবং মোটা দেখায় মেটাফেজ পর্যায়ে (সুপার কয়েলিং)।",
      "সেন্ট্রোমিয়ারের বিভাজন ঘটে অ্যানাফেজ পর্যায়ে।"
    ],
    factsEn: [
      "Crossing over occurs during the Pachytene stage.",
      "Synapsis (pairing of homologous chromosomes) happens in Zygotene.",
      "Chromosomes appear thickest and shortest at Metaphase due to supercoiling.",
      "Centromere division and sister chromatid separation occur in Anaphase."
    ],
    mnemonicBn: "প্রোফেজ-১ এর উপদশা মনে রাখার ছন্দ: 'লেজি প্যান্ট ডিপ্লোম্যাট ডায়েরি' (লেপ্টোটিন, জাইগোটিন, প্যাকাইটিন, ডিপ্লোটিন, ডায়াকিনেসিস)।",
    mnemonicEn: "Substages of Prophase-1 mnemonic: 'Lazy Pant Diplomat Diary' (Leptotene, Zygotene, Pachytene, Diplotene, Diakinesis).",
    quizQuestion: {
      questionTextBn: "হোমোলোগাস ক্রোমোজোমের জোড় বাঁধার প্রক্রিয়া 'সিন্যাপসিস' কোন উপদশায় ঘটে?",
      questionTextEn: "In which sub-stage of Prophase-1 does the pairing process 'Synapsis' take place?",
      optionsBn: ["লেপ্টোটিন", "জাইগোটিন", "প্যাকাইটিন", "ডিপ্লোটিন"],
      optionsEn: ["Leptotene", "Zygotene", "Pachytene", "Diplotene"],
      correctIndex: 1,
      explanationBn: "জাইগোটিন উপদশায় হোমোলোগাস ক্রোমোজোমের মধ্যে জোড় সৃষ্টি হয়, এই জোড় বাঁধার প্রক্রিয়াকে সিন্যাপসিস বলে এবং জোড়বদ্ধ ক্রোমোজোমকে বাইভ্যালেন্ট বলে।",
      explanationEn: "In Zygotene, homologous chromosomes pair up. This pairing is called Synapsis, and the pair is called a bivalent."
    }
  },
  // 2: রক্ত ও রক্ত সংবহন
  2: {
    summaryBn: "রক্তরস ও রক্তকণিকা (লোহিত, শ্বেত, অণুচক্রিকা), রক্ত তঞ্চন ফ্যাক্টর (১৩টি), হৃৎপিণ্ডের গঠন, রক্ত সংবহন চক্র (সিস্টোল-ডায়াস্টোল), এবং পেসমেকার (SA Node)।",
    summaryEn: "Plasma and blood cells (RBC, WBC, Platelets), 13 clotting factors, heart structure, cardiac cycle, and pacemaker (SA Node).",
    factsBn: [
      "SA Node-কে হৃৎপিণ্ডের প্রাকৃতিক পেসমেকার (Natural Pacemaker) বলা হয়।",
      "লোহিত রক্তকণিকার গড় আয়ু ১২০ দিন বা ৪ месяц। অণুচক্রিকার আয়ু ৫-১০ দিন।",
      "রক্ত তঞ্চনের প্রধান ৪টি ফ্যাক্টর হলো ফাইব্রিনোজেন, প্রোথ্রোম্বিন, থ্রোম্বোপ্লাস্টিন, ক্যালসিয়াম আয়ন।",
      "মানুষের হৃৎপিণ্ড ৪ প্রকোষ্ঠ বিশিষ্ট।"
    ],
    factsEn: [
      "SA Node is the natural pacemaker of the heart.",
      "RBC average lifespan is 120 days. Platelets live for 5-10 days.",
      "The 4 primary clotting factors are Fibrinogen, Prothrombin, Thromboplastin, and Calcium.",
      "The human heart is divided into 4 chambers."
    ],
    mnemonicBn: "রক্ত তঞ্চনের প্রধান ৪টি ফ্যাক্টর মনে রাখার সহজ ছন্দ: 'ফুল পড়ে টুপ করে' (ফাইব্রিনোজেন, প্রোথ্রোম্বিন, থ্রোম্বোপ্লাস্টিন, ক্যালসিয়াম আয়ন)।",
    mnemonicEn: "Clotting factors 1-4 mnemonic: 'Fresh Pasta Tasty Choice' (Fibrinogen, Prothrombin, Thromboplastin, Calcium).",
    quizQuestion: {
      questionTextBn: "মানুষের হৃৎপিণ্ডের কোন অংশকে 'প্রাকৃতিক পেসমেকার' (Natural Pacemaker) বলা হয়?",
      questionTextEn: "Which part of the human heart is called the 'Natural Pacemaker'?",
      optionsBn: ["AV Node", "SA Node", "বান্ডল অব হিজ", "পারকিনজি তন্তু"],
      optionsEn: ["AV Node", "SA Node", "Bundle of His", "Purkinje Fibers"],
      correctIndex: 1,
      explanationBn: "SA Node (Sinoatrial Node) হৃৎপিণ্ডের ডান অলিন্দে অবস্থিত এবং এটি স্বতঃস্ফূর্তভাবে হৃৎস্পন্দন তৈরি করে, তাই একে প্রাকৃতিক পেসমেকার বলে।",
      explanationEn: "The SA Node initiates cardiac impulses autonomously, serving as the heart's natural pacemaker."
    }
  },
  // 3: উদ্ভিদ শারীরতত্ত্ব
  3: {
    summaryBn: "খনিজ লবণ শোষণ, সালোকসংশ্লেষণ (C3 ও C4 চক্র), শ্বসন (গ্লাইকোলাইসিস, ক্রেবস চক্র, ইটিসি), এবং প্রস্বেদন।",
    summaryEn: "Mineral absorption, photosynthesis (C3 & C4 cycles), respiration (glycolysis, Krebs cycle, ETC), and transpiration.",
    factsBn: [
      "গ্লাইকোলাইসিস ঘটে সাইটোপ্লাজমে, এটি শ্বসনের সাধারণ পর্যায়।",
      "ক্রেবস চক্র এবং ইলেকট্রন ট্রান্সপোর্ট চেইন ঘটে মাইটোকন্ড্রিয়াতে।",
      "C3 উদ্ভিদের প্রথম স্থায়ী পদার্থ ৩-ফসফোগ্লিসারিক এসিড (3-PGA)।",
      "C4 উদ্ভিদের প্রথম স্থায়ী পদার্থ অক্সালোএসিটিক এসিড (OAA)।"
    ],
    factsEn: [
      "Glycolysis takes place in the cytoplasm and requires no oxygen.",
      "Krebs Cycle and Electron Transport Chain occur inside the mitochondria.",
      "The first stable product of the C3 cycle is 3-phosphoglyceric acid (3-PGA).",
      "The first stable product of the C4 cycle is Oxaloacetic Acid (OAA)."
    ],
    mnemonicBn: "উদ্ভিদের ম্যাক্রোমৌলিক উপাদান মনে রাখার ছন্দ: 'MG K Cafe for Nice CHOS' (Mg, K, Ca, Fe, N, C, H, O, S)।",
    mnemonicEn: "Macro-nutrients mnemonic: 'C. HOPKINS CaFe Mighty Good' (Carbon, Hydrogen, Oxygen, Phosphorus, Potassium, Iodine, Nitrogen, Sulfur, Calcium, Iron, Magnesium).",
    quizQuestion: {
      questionTextBn: "সালোকসংশ্লেষণের C4 চক্র বা হ্যাচ ও স্ল্যাক চক্রের প্রথম স্থায়ী পদার্থ কোনটি?",
      questionTextEn: "What is the first stable compound produced in C4 Photosynthesis (Hatch & Slack Pathway)?",
      optionsBn: ["৩-ফসফোগ্লিসারিক এসিড", "অক্সালোএসিটিক এসিড", "রাইবুলোজ ১,৫-বিসফসফেট", "ফসফোগ্লিসারালডিহাইড"],
      optionsEn: ["3-Phosphoglyceric Acid", "Oxaloacetic Acid", "Ribulose 1,5-bisphosphate", "Phosphoglyceraldehyde"],
      correctIndex: 1,
      explanationBn: "C4 উদ্ভিদে কার্বন ডাই অক্সাইড গ্রহণের পর প্রথম স্থায়ী যৌগ হলো ৪-কার্বন বিশিষ্ট অক্সালোএসিটিক এসিড। C3 উদ্ভিদে এটি ৩-ফসফোগ্লিসারিক এসিড।",
      explanationEn: "In C4 plants, the first stable product is Oxaloacetic acid (4 carbons), while in C3 plants it is 3-PGA (3 carbons)."
    }
  },
  // 4: প্রাণীর পরিচিতি ও শ্রেণীবিন্যাস
  4: {
    summaryBn: "হাইড্রা (Hydra), রুই মাছ (Labeo rohita) এবং ঘাসফড়িং (Grasshopper) এর অঙ্গসংস্থান, পরিপাক, রক্ত সংবহন, এবং রেচন প্রক্রিয়া। প্রাণীর শ্রেণীবিন্যাস ও নন-কর্ডাটা পর্বসমূহ।",
    summaryEn: "Morphology, digestion, circulation, and excretion of Hydra, Rohu fish, and Grasshoppers. Animal classification phyla.",
    factsBn: [
      "হাইড্রাতে কোনো রক্ত সংবহন ও শ্বসনতন্ত্র নেই, তবে নেটওয়ার্ক স্নায়ুতন্ত্র বিদ্যমান।",
      "ঘাসফড়িং এর রক্তকে হিমোলিম্ফ বলা হয় এবং হৃৎপিণ্ড ৫ প্রকোষ্ঠ বিশিষ্ট স্পন্দনশীল নলাকার অঙ্গ।",
      "রুই মাছের হৃৎপিণ্ডকে ভেনাস হার্ট বা শিরা-হৃৎপিণ্ড বলা হয় কারণ এর মধ্য দিয়ে কেবল কার্বন ডাই অক্সাইডযুক্ত রক্ত প্রবাহিত হয়।",
      "হাইড্রার দংশক অঙ্গাণুকে নেমাটোসিস্ট বলা হয়।"
    ],
    factsEn: [
      "Hydra lacks circulatory and respiratory systems but has a nerve net.",
      "Grasshopper blood is called hemolymph; its tubular heart has 5 chambers.",
      "Rohu heart is called a Venus Heart because it only pumps deoxygenated blood.",
      "Hydra uses nematocysts for defense and capturing prey."
    ],
    mnemonicBn: "রুই মাছের আঁশ হলো সাইক্লয়েড (Cycloid) এবং লেজ হলো হোমোসার্কাল (Homocercal)। হাইড্রার ৪ ধরনের নেমাটোসিস্ট মনে রাখার ছন্দ: 'পেনিস ড্রাইভ গ্লু স্ট্র্যাপ' (পেনিট্র্যান্ট, ভলভেন্ট, গ্লুটিন্যান্ট, স্টেরিওলিন)।",
    mnemonicEn: "Hydra nematocyst types: Penetrant, Volvent, Streptoline glutinant, Stereoline glutinant.",
    quizQuestion: {
      questionTextBn: "রুই মাছের (Rohu Fish) হৃৎপিণ্ডকে কেন 'ভেনাস হার্ট' (Venus Heart) বা শিরা-হৃৎপিণ্ড বলা হয়?",
      questionTextEn: "Why is the heart of Rohu fish called a 'Venus Heart'?",
      optionsBn: ["এটি খুব দ্রুত স্পন্দিত হয় বলে", "এর ভেতর দিয়ে কেবল বিশুদ্ধ অক্সিজেনযুক্ত রক্ত প্রবাহিত হয় বলে", "এর ভেতর দিয়ে কেবল কার্বন ডাই অক্সাইডযুক্ত (অক্সিজেনহীন) রক্ত প্রবাহিত হয় বলে", "এটি রক্ত জমাট বাঁধতে সাহায্য করে বলে"],
      optionsEn: ["Because it beats exceptionally fast", "Because it only pumps highly oxygenated blood", "Because it only pumps deoxygenated (carbon-dioxide rich) blood", "Because it is single-chambered"],
      correctIndex: 2,
      explanationBn: "রুই মাছের হৃৎপিণ্ডের মধ্য দিয়ে কেবল কার্বন ডাই অক্সাইডযুক্ত রক্ত সংবহিত হয় এবং এটি গ্যাস বিনিময়ের জন্য ফুলকায় যায়, তাই একে ভেনাস হার্ট বলে।",
      explanationEn: "The fish heart only receives and pumps deoxygenated blood to the gills, earning the name Venus Heart."
    }
  },
  // 5: গুণগত রসায়ন
  5: {
    summaryBn: "রাদারফোর্ড ও বোর পরমাণু মডেল, কোয়ান্টাম সংখ্যা (n, l, m, s), ইলেকট্রন বিন্যাসের নীতি (আউফবাউ, হুন্ড, পাউলির বর্জন নীতি), হাইড্রোজেন বর্ণালী, এবং দ্রাব্যতা গুণফল (Ksp)।",
    summaryEn: "Rutherford & Bohr atomic models, quantum numbers, electron configuration principles (Aufbau, Hund, Pauli exclusion), hydrogen spectrum, and solubility product (Ksp).",
    factsBn: [
      "প্রধান কোয়ান্টাম সংখ্যা (n) কক্ষপথের আকার নির্দেশ করে।",
      "সহকারী কোয়ান্টাম সংখ্যা (l) কক্ষপথের আকৃতি নির্দেশ করে।",
      "চৌম্বক কোয়ান্টাম সংখ্যা (m) কক্ষপথের ত্রিমাত্রিক বিন্যাস নির্দেশ করে।",
      "পাউলির বর্জন নীতি অনুযায়ী একটি পরমাণুতে দুটি ইলেকট্রনের ৪টি কোয়ান্টাম সংখ্যার মান কখনো একই হতে পারে না।"
    ],
    factsEn: [
      "Principal Quantum Number (n) determines the size/energy level of orbit.",
      "Azimuthal Quantum Number (l) defines the subshell shape (s, p, d, f).",
      "Magnetic Quantum Number (m) describes 3D orientation in space.",
      "Pauli Exclusion Principle states no two electrons can have identical four quantum numbers."
    ],
    mnemonicBn: "হাইড্রোজেন বর্ণালীর সারি মনে রাখার ছন্দ: 'লাইলি বেলী গেল ইন্ডিয়া ফান্ডে হামাগুড়ি দিয়ে' (লাইম্যান, বামার, প্যাশেন, ব্র্যাকেট, ফান্ড, হামফ্রিজ)। কেবল বামার সিরিজ দৃশ্যমান অঞ্চলের অন্তর্গত।",
    mnemonicEn: "Hydrogen spectrum series mnemonic: 'Lyman Balmer Paschen Bracket Pfund Humphreys' (Lyman is UV, Balmer is Visible, others are IR).",
    quizQuestion: {
      questionTextBn: "হাইড্রোজেন বর্ণালীর (Hydrogen Spectrum) কোন সিরিজটি দৃশ্যমান অঞ্চলের (Visible Region) অন্তর্গত?",
      questionTextEn: "Which series of the hydrogen emission spectrum falls within the Visible Region?",
      optionsBn: ["লাইম্যান সিরিজ (Lyman)", "বামার সিরিজ (Balmer)", "প্যাশেন সিরিজ (Paschen)", "ব্র্যাকেট সিরিজ (Bracket)"],
      optionsEn: ["Lyman Series", "Balmer Series", "Paschen Series", "Bracket Series"],
      correctIndex: 1,
      explanationBn: "কেবল বামার সিরিজটি দৃশ্যমান অঞ্চলের (৩৮০-৭৮০ nm) অন্তর্ভুক্ত। লাইম্যান সিরিজটি অতিবেগুনি (UV) এবং প্যাশেন সিরিজটি অবলোহিত (IR) অঞ্চলে অবস্থিত।",
      explanationEn: "Only the Balmer series produces wavelengths in the visible light range. Lyman is in UV, while Paschen and Brackett are in IR."
    }
  },
  // 6: জৈব রসায়ন
  6: {
    summaryBn: "হাইড্রোকার্বন, সমাণুতা (গাঠনিক ও স্টেরিও), ইলেকট্রোফাইল ও নিউক্লিওফাইল বিকারক, নামীয় বিক্রিয়া (উর্টজ, ক্যানিজারো, অ্যালডল ঘনীভবন), এবং বিভিন্ন কার্যকরী মূলক পরীক্ষা।",
    summaryEn: "Hydrocarbons, isomerism, electrophiles & nucleophiles, named organic reactions (Wurtz, Cannizzaro, Aldol), and functional group tests.",
    factsBn: [
      "জ্যামিতিক সমাণুতা দুই প্রকার: সিস (cis) এবং ট্রান্স (trans)।",
      "যেসব অ্যালডিহাইডে আলফা-হাইড্রোজেন নেই তারা ক্যানিজারো বিক্রিয়া দেয় (যেমন: ফরমালডিহাইড)।",
      "ক্লোরোফর্ম শনাক্তকরণে কার্বিল অ্যামিন পরীক্ষা ব্যবহৃত হয়, যা অত্যন্ত দুর্গন্ধযুক্ত ফিনাইল আইসোসায়ানাইড তৈরি করে।",
      "গ্রিগনার্ড বিকারক হলো অ্যালকাইল ম্যাগনেসিয়াম হ্যালাইড (R-Mg-X)।"
    ],
    factsEn: [
      "Geometric isomerism occurs in alkenes as Cis and Trans isomers.",
      "Aldehydes with no alpha-hydrogen undergo Cannizzaro's reaction (e.g., Formaldehyde).",
      "Carbylamine test detects chloroform by producing offensive-smelling phenyl isocyanide.",
      "Grignard reagent is Alkyl Magnesium Halide (R-Mg-X)."
    ],
    mnemonicBn: "স্টেরিও সমাণুতা মনে রাখার ছন্দ: 'জ্যামিতিক আলো' (জ্যামিতিক সমাণুতা ও আলোক সক্রিয় সমাণুতা)।",
    mnemonicEn: "Stereoisomerism sub-types: Geometric (Cis/Trans) and Optical Isomerism.",
    quizQuestion: {
      questionTextBn: "আলফা-হাইড্রোজেন অনুপস্থিত এমন কোন অ্যালডিহাইডটি ক্যানিজারো বিক্রিয়া (Cannizzaro Reaction) প্রদর্শন করে?",
      questionTextEn: "Which aldehyde, lacking an alpha-hydrogen, undergoes the Cannizzaro Reaction?",
      optionsBn: ["অ্যাসিটালডিহাইড (CH3CHO)", "ফরমালডিহাইড (HCHO)", "প্রোপানালডিহাইড (CH3CH2CHO)", "অ্যাসিটোন (CH3COCH3)"],
      optionsEn: ["Acetaldehyde", "Formaldehyde", "Propanaldehyde", "Acetone"],
      correctIndex: 1,
      explanationBn: "যেসব অ্যালডিহাইডে আলফা-কার্বনে কোনো হাইড্রোজেন থাকে না (যেমন ফরমালডিহাইড HCHO বা বেঞ্জালডিহাইড), তারা গাঢ় ক্ষারের উপস্থিতিতে ক্যানিজারো বিক্রিয়া দেয়।",
      explanationEn: "Formaldehyde lacks alpha-hydrogen, so it undergoes self-oxidation and reduction (Cannizzaro) under concentrated alkali."
    }
  },
  // 7: রাসায়নিক পরিবর্তন
  7: {
    summaryBn: "বিক্রিয়ার হার ও প্রভাবক, লা শাতেলিয়ারের নীতি (তাপমাত্রা, চাপ ও ঘনমাত্রার প্রভাব), ভরক্রিয়া সূত্র, সাম্যাবস্থা ধ্রুবক (Kp ও Kc), এবং অম্ল-ক্ষার বাফার দ্রবণ ও pH গণনা।",
    summaryEn: "Reaction rate and catalysts, Le Chatelier's Principle, Law of Mass Action, equilibrium constants (Kp, Kc), and pH of buffer solutions.",
    factsBn: [
      "লা শাতেলিয়ারের নীতি কেবল উভমুখী বিক্রিয়ার সাম্যাবস্থায় প্রযোজ্য।",
      "বাফার দ্রবণ সামান্য অম্ল বা ক্ষার যোগ করলেও pH পরিবর্তন হতে দেয় না।",
      "রক্তের pH ৭.৪০ (সামান্য ক্ষারীয়)।",
      "বিক্রিয়ার তাপমাত্রা ১০°C বৃদ্ধি করলে বিক্রিয়ার বেগ দ্বিগুণ বা তিনগুণ বৃদ্ধি পায় (তাপমাত্রা গুণাঙ্ক)।"
    ],
    factsEn: [
      "Le Chatelier's principle applies exclusively to reversible reactions at equilibrium.",
      "Buffer solutions resist changes in pH when small amounts of acid or base are added.",
      "Human blood pH is strictly maintained at approximately 7.40.",
      "For every 10°C rise in temperature, the reaction rate approximately doubles or triples."
    ],
    mnemonicBn: "বাফার প্রকারভেদ মনে রাখার ছন্দ: 'অম্লীয় বাফার = দুর্বল অম্ল + তার লবণ' (যেমন: CH3COOH + CH3COONa)। রক্তের তিনটি বাফার সিস্টেম: বাইকার্বনেট, ফসফেট এবং প্রোটিন বাফার।",
    mnemonicEn: "Blood buffer systems: Bicarbonate buffer (primary), Phosphate buffer, and Protein/Hemoglobin buffer.",
    quizQuestion: {
      questionTextBn: "সুস্থ মানুষের রক্তের স্বাভাবিক pH এর মান কত?",
      questionTextEn: "What is the normal pH value of healthy human arterial blood?",
      optionsBn: ["৬.৪০ - ৬.৮০", "৭.批 - ৭.৪৫", "৮.০০ - ৮.৫০", "৫.৫০ - ৬.০০"],
      optionsEn: ["6.40 - 6.80", "7.35 - 7.45", "8.00 - 8.50", "5.50 - 6.00"],
      correctIndex: 1,
      explanationBn: "মানুষের রক্তের স্বাভাবিক pH প্রায় ৭.৪০ (সুনির্দিষ্ট পরিসীমা ৭.৩৫ থেকে ৭.৪৫)। এই মানের সামান্য বিচ্যুতি ঘটলে (অ্যাসিডোসিস বা অ্যালকালসিস) মৃত্যুর কারণ হতে পারে।",
      explanationEn: "Normal arterial blood pH is tightly regulated between 7.35 and 7.45. Departures can cause severe medical emergencies."
    }
  },
  // 8: পরিমাণগত রসায়ন
  8: {
    summaryBn: "মোলারিটি, নরমালিটি, মোলালিটি, শতকরা হার ও পিপিএম (ppm), জারণ-বিজারণ বিক্রিয়া (জারক ও বিজারক শনাক্তকরণ), এবং নির্দেশকসমূহ।",
    summaryEn: "Molarity, normality, molality, percentage concentration, parts per million (ppm), redox reactions (oxidizing/reducing agents), and indicators.",
    factsBn: [
      "মোলারিটি (M) তাপমাত্রার ওপর নির্ভরশীল কারণ এটি আয়তনের সাথে সম্পর্কিত। মোলালিটি (m) তাপমাত্রার ওপর নির্ভরশীল নয়।",
      "জারক पदार्थ নিজে বিজারিত হয় এবং অন্যকে জারিত করে (ইলেকট্রন গ্রহণ করে)।",
      "বিজারক পদার্থ নিজে জারিত হয় এবং অন্যকে বিজারিত করে (ইলেকট্রন বর্জন করে)।",
      "পিপিএম (ppm) হলো মিলিগ্রাম প্রতি লিটার (mg/L)।"
    ],
    factsEn: [
      "Molarity is temperature-dependent because volume changes with temperature.",
      "Molality is temperature-independent because it uses mass of solvent.",
      "An oxidizing agent accepts electrons and gets reduced.",
      "A reducing agent donates electrons and gets oxidized."
    ],
    mnemonicBn: "বিজারক পদার্থ মনে রাখার ছন্দ: 'হায় হাই শান্তর আজ মিষ্টি লাল কলা চাই' (H2S, H2, SnCl2, আয়রন সালফেট FeSO4, সালফিউরাস এসিড, ধাতব মৌল)। জারক মনে রাখার ছন্দ: 'ও কোকিল হ্যালো ওদিকে নাইট্রোজেন ধরো' (O3, Cl2, HNO3, KMnO4, K2Cr2O7)।",
    mnemonicEn: "Redox memory: 'LEO says GER' (Lose Electrons = Oxidation; Gain Electrons = Reduction).",
    quizQuestion: {
      questionTextBn: "নিচের কোন ঘনমাত্রা প্রকাশের এককটি তাপমাত্রার ওপর নির্ভরশীল নয়?",
      questionTextEn: "Which of the following units of concentration is independent of temperature?",
      optionsBn: ["মোলারিটি (Molarity)", "মোলালিটি (Molality)", "নরমালিটি (Normality)", "ফরমালিটি (Formality)"],
      optionsEn: ["Molarity", "Molality", "Normality", "Formality"],
      correctIndex: 1,
      explanationBn: "মোলালিটি হলো ১ কেজি দ্রাবকে দ্রবীভূত দ্রবের মোল সংখ্যা। যেহেতু মোলালিটি ভরের ওপর ভিত্তি করে এবং ভর তাপমাত্রার সাথে পরিবর্তিত হয় না, তাই এটি তাপমাত্রার ওপর নির্ভরশীল নয়।",
      explanationEn: "Molality involves mass of solvent (mol/kg) which does not expand or contract with temperature changes."
    }
  },
  // 9: পরিবেশ রসায়ন
  9: {
    summaryBn: "গ্যাসের সূত্রসমূহ (বয়েল, চার্লস, অ্যাভোগাড্রো, ডালটনের আংশিক চাপ, গ্রাহামের ব্যাপন সূত্র), আদর্শ গ্যাস বনাম বাস্তব গ্যাস, এসিড বৃষ্টি, গ্রিনহাউস গ্যাসসমূহ এবং পানির BOD ও COD।",
    summaryEn: "Gas laws (Boyle, Charles, Avogadro, Dalton, Graham diffusion), Ideal vs Real gases, acid rain, greenhouse effect, BOD & COD.",
    factsBn: [
      "বয়েলের সূত্রে তাপমাত্রা ধ্রুবক থাকে এবং চাপ ও আয়তন ব্যস্তানুপাতিক।",
      "বাস্তব গ্যাসগুলো উচ্চ তাপমাত্রা ও নিম্ন চাপে আদর্শ গ্যাসের মতো আচরণ করে।",
      "গ্রিনহাউস গ্যাসের মধ্যে সবচেয়ে বেশি তাপ ধরে রাখে জলীয় বাষ্প ও কার্বন ডাই অক্সাইড।",
      "এসিড বৃষ্টির জন্য মূলত دায়ী সালফার ডাই অক্সাইড (SO2) এবং নাইট্রোজেন অক্সাইড (NOx)।"
    ],
    factsEn: [
      "Boyle's Law keeps temperature constant; pressure is inversely proportional to volume.",
      "Real gases behave ideally at high temperatures and low pressures.",
      "Water vapor and CO2 are the main contributors to the greenhouse effect.",
      "Sulfur dioxide (SO2) and Nitrogen oxides (NOx) are the main causes of acid rain."
    ],
    mnemonicBn: "আদর্শ গ্যাস আচরণের শর্ত মনে রাখার ছন্দ: 'হানি' (Hani -> High Temp, Low Pressure / উচ্চ তাপমাত্রা, নিম্ন চাপ)। পানির বিশুদ্ধতার মাপকাঠি: BOD (Biochemical Oxygen Demand) ও COD (Chemical Oxygen Demand)।",
    mnemonicEn: "Ideal gas conditions mnemonic: 'Hi-Lo' (High temperature, Low pressure).",
    quizQuestion: {
      questionTextBn: "বাস্তব গ্যাসসমূহ (Real Gases) কোন শর্তে আদর্শ গ্যাসের (Ideal Gas) ন্যায় আচরণ করে?",
      questionTextEn: "Under which conditions do real gases behave most like ideal gases?",
      optionsBn: ["নরম তাপমাত্রা ও উচ্চ চাপ", "উচ্চ তাপমাত্রা ও নিম্ন চাপ", "নিম্ন তাপমাত্রা ও নিম্ন চাপ", "উচ্চ তাপমাত্রা ও উচ্চ চাপ"],
      optionsEn: ["Low temperature and High pressure", "High temperature and Low pressure", "Low temperature and Low pressure", "High temperature and High pressure"],
      correctIndex: 1,
      explanationBn: "উচ্চ তাপমাত্রা ও নিম্ন চাপে গ্যাস অণুগুলোর মধ্যকার আকর্ষণ বল নগণ্য হয় এবং অণুগুলোর নিজস্ব আয়তন পাত্রের আয়তনের তুলনায় উপেক্ষণীয় হয়, ফলে বাস্তব গ্যাস আদর্শ আচরণ করে।",
      explanationEn: "At high temperature and low pressure, intermolecular forces are minimized and gas volume is negligible, satisfying ideal gas assumptions."
    }
  },
  // 10: ভেক্টর
  10: {
    summaryBn: "ভেক্টর ও স্কেলার রাশি, ভেক্টর যোগের সামান্তরিক সূত্র, ডট গুণন ও ক্রস গুণন, লব্ধির সর্বোচ্চ ও সর্বনিম্ন মান, নদী-নৌকা সংক্রান্ত গাণিতিক সমস্যা, এবং ডাইভারজেন্স, কার্ল ও গ্রেডিয়েন্ট।",
    summaryEn: "Vector and scalar quantities, parallelogram law, dot and cross products, river-boat relative motion, gradient, divergence, and curl.",
    factsBn: [
      "দুটি ভেক্টরের ডট গুণন শূন্য হলে ভেক্টরদ্বয় পরস্পর লম্ব হয়।",
      "দুটি ভেক্টরের ক্রস গুণন শূন্য হলে ভেক্টরদ্বয় পরস্পর সমান্তরাল হয়।",
      "ভেক্টর ক্ষেত্রের কার্ল (Curl) শূন্য হলে ক্ষেত্রটিকে অঘূর্ণনশীল (Irrotational) বলা হয়।",
      "ডাইভারজেন্স (Divergence) শূন্য হলে ভেক্টর ক্ষেত্রটিকে সোলেনয়ডাল (Solenoidal) বলা হয়।"
    ],
    factsEn: [
      "If the dot product of two vectors is zero, they are perpendicular.",
      "If the cross product of two vectors is zero, they are parallel.",
      "If the curl of a vector field is zero, the field is irrotational.",
      "If the divergence of a vector field is zero, the field is solenoidal."
    ],
    mnemonicBn: "স্কেলার রাশি মনে রাখার ছন্দ: 'ভবের সব প্রিয়তম খাসা ভাতে মাছ খায়' (ভর, বিভব, সময়, বলের ঘাত নয় বল ভেক্টর, কাজ, দৈর্ঘ্য, তাপমাত্রা, দ্রুতি ইত্যাদি)।",
    mnemonicEn: "Solenoidal condition: Div (V) = 0. Irrotational condition: Curl (V) = 0.",
    quizQuestion: {
      questionTextBn: "কোনো ভেক্টর ক্ষেত্রের ডাইভারজেন্স (Divergence) শূন্য হলে, সেই ক্ষেত্রটিকে কী বলা হয়?",
      questionTextEn: "If the divergence of a vector field is zero, what is the field described as?",
      optionsBn: ["অঘূর্ণনশীল (Irrotational)", "সোলেনয়ডাল (Solenoidal)", "সংরক্ষণশীল (Conservative)", "ঘূর্ণনশীল (Rotational)"],
      optionsEn: ["Irrotational", "Solenoidal", "Conservative", "Rotational"],
      correctIndex: 1,
      explanationBn: "ডাইভারজেন্সের মান শূন্য হওয়ার অর্থ হলো কোনো ভেক্টর ক্ষেত্রে অণুপ্রবেশকারী ও বহির্গামী ফ্লাক্সের পরিমাণ সমান, ফলে এই ক্ষেত্রটিকে সোলেনয়ডাল (Solenoidal) বলা হয়।",
      explanationEn: "Zero divergence indicates that net flux through any closed surface is zero, characterizing a Solenoidal field."
    }
  },
  // 11: মহাকর্ষ ও গ্র্যাভিটেশন
  11: {
    summaryBn: "নিউটনের মহাকর্ষ সূত্র, কেপলারের গতিসূত্রসমূহ, অভিকর্ষজ ত্বরণ 'g' এর পরিবর্তন (উচ্চতা, গভীরতা ও অক্ষাংশের প্রভাব), মুক্তিবেগ (Escape Velocity) এবং কৃত্রিম উপগ্রহের বেগ ও পর্যায়কাল।",
    summaryEn: "Newton's law of gravitation, Kepler's laws of planetary motion, variation of acceleration due to gravity 'g', escape velocity, and satellites.",
    factsBn: [
      "পৃথিবীর কেন্দ্রে অভিকর্ষজ ত্বরণ 'g' এর মান শূন্য। মেরু অঞ্চলে 'g' এর মান সবচেয়ে বেশি (9.83 m/s²), বিষুবীয় অঞ্চলে সবচেয়ে কম (9.78 m/s²)।",
      "পৃথিবী পৃষ্ঠে মুক্তিবেগের মান ১১.২ কিমি/সেকেন্ড (11.2 km/s)।",
      "ভূ-স্থির উপগ্রহের আবর্তনকাল ২৪ ঘণ্টা, যা পৃথিবীর নিজ অক্ষের আবর্তনকালের সমান।"
    ],
    factsEn: [
      "Gravity 'g' is zero at the center of the Earth. It is highest at poles and lowest at equator.",
      "Earth's surface escape velocity is approximately 11.2 km/s.",
      "Geostationary satellites rotate with a period of 24 hours, matching Earth's rotation."
    ],
    mnemonicBn: "কেপলারের ৩টি সূত্র: ১ম কক্ষপথের সূত্র (উপবৃত্তাকার), ২য় ক্ষেত্রফলের সূত্র (সমান ক্ষেত্রফল), ৩য় আবর্তনকালের সূত্র (T² ∝ r³)।",
    mnemonicEn: "Kepler's laws: 1st Law of Orbits (ellipse), 2nd Law of Areas, 3rd Law of Periods (T² is proportional to r³).",
    quizQuestion: {
      questionTextBn: "পৃথিবী পৃষ্ঠ থেকে কোনো বস্তুর মুক্তিবেগ (Escape Velocity) এর মান কত?",
      questionTextEn: "What is the escape velocity of any object launched from the surface of Earth?",
      optionsBn: ["৯.৮ কিমি/সেকেন্ড", "১১.২ কিমি/সেকেন্ড", "৭.৯ কিমি/সেকেন্ড", "১৫.৪ কিমি/সেকেন্ড"],
      optionsEn: ["9.8 km/s", "11.2 km/s", "7.9 km/s", "15.4 km/s"],
      correctIndex: 1,
      explanationBn: "পৃথিবী পৃষ্ঠে মুক্তিবেগের সমীকরণ V = √(2gR), এর মান প্রায় ১১.২ কিমি/সেকেন্ড। এই বেগে নিক্ষিপ্ত কোনো বস্তু আর পৃথিবীতে ফিরে আসে না।",
      explanationEn: "The escape velocity on Earth is approximately 11.2 km/s. Any projectile launched at this speed will escape gravitational pull."
    }
  },
  // 12: যান্ত্রিক ধর্ম ও গতিবিদ্যা
  12: {
    summaryBn: "স্থিতিস্থাপকতা, হুকের সূত্র (Hooke's Law), ইয়ং গুণাঙ্ক, সান্দ্রতা, প্রান্তিক বেগ (Terminal Velocity), এবং পৃষ্ঠটান ও কৈশিকতা।",
    summaryEn: "Elasticity, Hooke's Law, Young's Modulus, viscosity, terminal velocity, surface tension, and capillarity.",
    factsBn: [
      "স্থিতিস্থাপক সীমার মধ্যে পীড়ন ও বিকৃতি পরস্পর সমানুপাতিক (হুকের সূত্র)।",
      "তরলের তাপমাত্রা বৃদ্ধি পেলে সান্দ্রতা হ্রাস পায়, কিন্তু গ্যাসের তাপমাত্রা বৃদ্ধি পেলে সান্দ্রতা বৃদ্ধি পায়।",
      "পানির পৃষ্ঠটানের কারণে পানির ফোঁটা গোলাকার আকৃতি ধারণ করে।"
    ],
    factsEn: [
      "Within elastic limit, stress is proportional to strain (Hooke's Law).",
      "Viscosity of liquids decreases with temperature, whereas gas viscosity increases.",
      "Water droplets assume a spherical shape due to minimize surface area from surface tension."
    ],
    mnemonicBn: "পীড়ন = বল / ক্ষেত্রফল (N/m² বা Pa)। বিকৃতির কোনো একক নেই। সান্দ্রতার একক হলো পয়েজ (Poise) বা Pa·s।",
    mnemonicEn: "Stress = Force / Area (Pa). Strain is dimensionless. Viscosity SI unit is Pascal-second (Pa·s).",
    quizQuestion: {
      questionTextBn: "হুকের সূত্র (Hooke's Law) অনুযায়ী স্থিতিস্থাপক সীমার মধ্যে নিচের কোন সম্পর্কটি সঠিক?",
      questionTextEn: "According to Hooke's Law, which relationship is correct within the elastic limit?",
      optionsBn: ["পীড়ন × বিকৃতি = ধ্রুবক", "পীড়ন / বিকৃতি = ধ্রুবক", "বিকৃতি / পীড়ন = ধ্রুবক", "পীড়ন + বিকৃতি = ধ্রুবক"],
      optionsEn: ["Stress × Strain = Constant", "Stress / Strain = Constant", "Strain / Stress = Constant", "Stress + Strain = Constant"],
      correctIndex: 1,
      explanationBn: "হুকের সূত্রানুযায়ী, স্থিতিস্থাপক সীমার মধ্যে পীড়ন বিকৃতির সমানুপাতিক। অর্থাৎ, পীড়ন ∝ বিকৃতি, বা পীড়ন/বিকৃতি = স্থিতিস্থাপক গুণাঙ্ক (ধ্রুবক)।",
      explanationEn: "Hooke's law states stress is directly proportional to strain. Therefore, Stress/Strain = constant modulus."
    }
  },
  // 13: তাপগতিবিদ্যা
  13: {
    summaryBn: "তাপগতিবিদ্যার শূন্যতম, প্রথম ও দ্বিতীয় সূত্র, সমোষ্ণ ও রুদ্ধতাপীয় প্রক্রিয়া, কার্নো ইঞ্জিন ও এর দক্ষতা, এবং এন্ট্রপির ধারণা।",
    summaryEn: "Thermodynamics laws (0th, 1st, 2nd), isothermal & adiabatic processes, Carnot engine efficiency, and entropy.",
    factsBn: [
      "তাপগতিবিদ্যার শূন্যতম সূত্র তাপমাত্রা পরিমাপের মূল ভিত্তি (থার্মোমিটার)।",
      "সমোষ্ণ প্রক্রিয়ায় তাপমাত্রা ধ্রুবক থাকে এবং রুদ্ধতাপীয় প্রক্রিয়ায় তাপ ধ্রুবক থাকে।",
      "রুদ্ধতাপীয় প্রক্রিয়া একটি অত্যন্ত দ্রুত বা আকস্মিক প্রক্রিয়া, সমোষ্ণ প্রক্রিয়া ধীর প্রক্রিয়া।",
      "মহাবিশ্বের এন্ট্রপি ক্রমাগত বৃদ্ধি পাচ্ছে।"
    ],
    factsEn: [
      "The Zeroth Law of thermodynamics provides the basis for temperature measurement.",
      "Isothermal process keeps temperature constant; adiabatic process prevents heat transfer.",
      "Adiabatic change occurs suddenly; isothermal change occurs extremely slowly.",
      "The entropy of the universe is continuously increasing towards maximum disorder."
    ],
    mnemonicBn: "সমোষ্ণ পরিবর্তনের শর্ত: পাত্রটি সুপরিবাহী হতে হবে এবং প্রক্রিয়াটি ধীর হতে হবে। রুদ্ধতাপীয় পরিবর্তনের শর্ত: কুপরিবাহী পাত্র ও প্রক্রিয়াটি অত্যন্ত দ্রুত হতে হবে (যেমন টায়ার ফেটে যাওয়া)।",
    mnemonicEn: "Sudden bursting of a bicycle tire is a classic example of an Adiabatic process.",
    quizQuestion: {
      questionTextBn: "হঠাৎ সাইকেলের টায়ার ফেটে বাতাস বের হয়ে ঠান্ডা হয়ে যাওয়ার ঘটনাটি কোন প্রক্রিয়া?",
      questionTextEn: "The sudden bursting of a bicycle tire resulting in escaping cold air is an example of which process?",
      optionsBn: ["সমোষ্ণ প্রক্রিয়া (Isothermal)", "রুদ্ধতাপীয় প্রক্রিয়া (Adiabatic)", "সমচাপ প্রক্রিয়া (Isobaric)", "সমআয়তন প্রক্রিয়া (Isochoric)"],
      optionsEn: ["Isothermal Process", "Adiabatic Process", "Isobaric Process", "Isochoric Process"],
      correctIndex: 1,
      explanationBn: "টায়ার ফাটলে বাতাস অত্যন্ত দ্রুত প্রসারিত হয়, ফলে পরিবেশ থেকে তাপ আদান-প্রদানের সময় পায় না। এই রুদ্ধতাপীয় প্রসারণে গ্যাস নিজের অভ্যন্তরীণ শক্তি ব্যবহার করে কাজ করায় তাপমাত্রা হ্রাস পায়।",
      explanationEn: "The sudden expansion prevents heat exchange with the surroundings, resulting in an adiabatic expansion that lowers the temperature."
    }
  },
  // 14: ভৌত আলোকবিজ্ঞান
  14: {
    summaryBn: "আলোর ব্যতিচার (Interference), অপবর্তন (Diffraction), সমবর্তন (Polarization), ইয়ং-এর দ্বি-চির পরীক্ষা, এবং আলোর তরঙ্গের প্রকৃতি।",
    summaryEn: "Light interference, diffraction, polarization, Young's double-slit experiment, and wave optics fundamentals.",
    factsBn: [
      "ব্যতিচারের মাধ্যমে আলোর তরঙ্গ ধর্মের প্রমাণ পাওয়া যায় (ইয়ং-এর পরীক্ষা)।",
      "আলোর সমবর্তন প্রমাণ করে যে আলো একটি আড় বা অনুপ্রস্থ তরঙ্গ (Transverse Wave)।",
      "সাবানের বুদবুদের রঙিন দেখানোর কারণ আলোর ব্যতিচার।"
    ],
    factsEn: [
      "Young's double-slit experiment proves the wave nature of light via interference.",
      "Polarization proves that light is a transverse electromagnetic wave.",
      "The colorful sheen seen on soap bubbles is caused by thin-film light interference."
    ],
    mnemonicBn: "ব্যতিচার দুই প্রকার: গঠনমূলক (সমদশা, উজ্জ্বল ডোরা) ও ধ্বংসাত্মক (বিপরীত দশা, অন্ধকার ডোরা)।",
    mnemonicEn: "Soap bubble colors = Interference. Sharp edge bending = Diffraction. Transverse wave proof = Polarization.",
    quizQuestion: {
      questionTextBn: "কোন আলোকীয় ঘটনার মাধ্যমে আলোর অনুপ্রস্থ বা আড় তরঙ্গ (Transverse Wave) ধর্মের অকাট্য প্রমাণ পাওয়া যায়?",
      questionTextEn: "Which optical phenomenon provides definitive proof that light is a transverse wave?",
      optionsBn: ["ব্যতিচার (Interference)", "অপবর্তন (Diffraction)", "সমবর্তন (Polarization)", "প্রতিফলন (Reflection)"],
      optionsEn: ["Interference", "Diffraction", "Polarization", "Reflection"],
      correctIndex: 2,
      explanationBn: "সমবর্তন কেবল অনুপ্রস্থ বা আড় তরঙ্গের ক্ষেত্রেই সম্ভব। যেহেতু আলোর সমবর্তন ঘটে, তাই প্রমাণিত হয় আলো একটি অনুপ্রস্থ বা আড় তরঙ্গ (অনুদৈর্ঘ্য তরঙ্গের সমবর্তন ঘটে না)।",
      explanationEn: "Polarization restricts wave vibrations to a single plane, which is only possible for transverse waves, not longitudinal waves."
    }
  }
};

export const TIMELINE_ENHANCED_DATA: Record<string, EnhancedTimeline> = {
  "1947": {
    detailedInfoBn: "দ্বিজাতিতত্ত্বের ভিত্তিতে ভারত ও পাকিস্তান বিভক্ত হয়। পূর্ব বাংলা পাকিস্তানের অন্তর্ভুক্ত হয়ে পূর্ব পাকিস্তান নামে পরিচিত হয়।",
    detailedInfoEn: "Partition of India and Pakistan based on the two-nation theory. East Bengal became part of Pakistan as East Pakistan.",
    quizQuestion: {
      questionTextBn: "১৯৪৭ সালে দ্বিজাতি তত্ত্বের (Two-Nation Theory) ঘোষণা কে দিয়েছিলেন?",
      questionTextEn: "Who declared the Two-Nation Theory in 1947?",
      optionsBn: ["মহাত্মা গান্ধী", "মোহাম্মদ আলী জিন্নাহ", "শেরে বাংলা এ. কে. ফজলুল হক", "জওহরলাল নেহেরু"],
      optionsEn: ["Mahatma Gandhi", "Muhammad Ali Jinnah", "A. K. Fazlul Huq", "Jawaharlal Nehru"],
      correctIndex: 1,
      explanationBn: "১৯৩৯-১৯৪০ সালের লাহোর প্রস্তাব এবং ১৯৪৭-এর দেশভাগের পেছনে মোহাম্মদ আলী জিন্নাহর দ্বিজাতি তত্ত্ব মূল ভূমিকা পালন করে।",
      explanationEn: "Muhammad Ali Jinnah was the primary advocate of the Two-Nation Theory, which led to the partition."
    }
  },
  "1952": {
    detailedInfoBn: "উর্দুকে পাকিস্তানের একমাত্র রাষ্ট্রভাষা করার ঘোষণার বিরুদ্ধে ২১শে ফেব্রুয়ারি ঐতিহাসিক ভাষা আন্দোলন তীব্র রূপ ধারণ করে। সালাম, বরকত, রফিক, জব্বার প্রমুখ শহীদ হন।",
    detailedInfoEn: "Historic Language Movement peaks on 21st February against Urdu-only state language policy. Activists including Salam, Barkat, and Rafiq were martyred.",
    quizQuestion: {
      questionTextBn: "১৯৫২ সালের ২১শে ফেব্রুয়ারি বাংলা কত তারিখ ছিল?",
      questionTextEn: "What was the Bengali calendar date on 21st February 1952?",
      optionsBn: ["৮ই ফাল্গুন", "১১ই আশ্বিন", "৫ই ফাল্গুন", "৭ই চৈত্র"],
      optionsEn: ["8th Falgun", "11th Ashwin", "5th Falgun", "7th Chaitra"],
      correctIndex: 0,
      explanationBn: "১৯৫২ সালের ২১শে ফেব্রুয়ারি ছিল বাংলা ১৩৫৮ সনের ৮ই ফাল্গুন, দিনটি ছিল বৃহস্পতিবার।",
      explanationEn: "February 21, 1952 corresponded to the Bengali calendar date of 8th Falgun, 1358 BS."
    }
  },
  "1954": {
    detailedInfoBn: "পূর্ব পাকিস্তানের সাধারণ নির্বাচনে মুসলিম লীগকে পরাজিত করে আওয়ামী মুসলিম লীগ, কৃষক শ্রমিক পার্টি ও নেজামে ইসলামের সমন্বয়ে গঠিত যুক্তফ্রন্ট বিপুল জয়লাভ করে।",
    detailedInfoEn: "United Front coalition scores a landslide victory over Muslim League in East Bengal legislative elections.",
    quizQuestion: {
      questionTextBn: "১৯৫৪ সালের নির্বাচনে যুক্তফ্রন্টের নির্বাচনী প্রতীক কী ছিল?",
      questionTextEn: "What was the electoral symbol of the United Front in the 1954 election?",
      optionsBn: ["লাঙ্গল", "নৌকা", "ধানের শীষ", "কুঁড়েঘর"],
      optionsEn: ["Plough", "Boat", "Sheaf of Paddy", "Hut"],
      correctIndex: 1,
      explanationBn: "যুক্তফ্রন্টের নির্বাচনী প্রতীক ছিল নৌকা এবং তাদের ২১ দফার প্রথম দাবি ছিল বাংলাকে পাকিস্তানের অন্যতম রাষ্ট্রভাষা করা।",
      explanationEn: "The electoral symbol of the United Front was the Boat, winning 223 out of 237 Muslim seats."
    }
  },
  "1966": {
    detailedInfoBn: "বঙ্গবন্ধু শেখ মুজিবুর রহমান ঐতিহাসিক ৬-দফা দাবি উত্থাপন করেন, যা ছিল বাঙালি জাতির মুক্তির সনদ (Magna Carta)।",
    detailedInfoEn: "Bangabandhu Sheikh Mujibur Rahman announces the historic 6-point charter of demands, the Magna Carta of Bengalis.",
    quizQuestion: {
      questionTextBn: "বঙ্গবন্ধু শেখ মুজিবুর রহমান কোন শহরে আনুষ্ঠানিকভাবে ঐতিহাসিক ৬-দফা দাবি উত্থাপন করেন?",
      questionTextEn: "In which city did Bangabandhu formally announce the historic 6-point demands?",
      optionsBn: ["ঢাকা", "করাচি", "লাহোর", "রাওয়ালপিন্ডি"],
      optionsEn: ["Dhaka", "Karachi", "Lahore", "Rawalpindi"],
      correctIndex: 2,
      explanationBn: "৫-৬ ফেব্রুয়ারি ১৯৬৬ সালে লাহোরে অনুষ্ঠিত বিরোধী দলীয় সম্মেলনে বঙ্গবন্ধু শেখ মুজিবুর রহমান বাঙালির মুক্তির সনদ ৬-দফা দাবি উত্থাপন করেন।",
      explanationEn: "Bangabandhu first raised the 6-point demands at a national conference of opposition parties in Lahore on Feb 5-6, 1966."
    }
  },
  "1969": {
    detailedInfoBn: "আগরতলা ষড়যন্ত্র মামলা প্রত্যাহারের দাবিতে এবং বঙ্গবন্ধুর মুক্তির লক্ষে ১৯৬৯ সালের ঐতিহাসিক গণঅভ্যুত্থান ঘটে। আসাদ, ড. শামসুজ্জোহা প্রমুখ শহীদ হন।",
    detailedInfoEn: "The 1969 mass uprising force the withdrawal of Agartala Conspiracy Case and the release of Bangabandhu. Dr. Shamsuzzoha was martyred.",
    quizQuestion: {
      questionTextBn: "১৯৬৯ সালের গণঅভ্যুত্থানে শহীদ বুদ্ধিজীবী ড. শামসুজ্জোহা রাজশাহী বিশ্ববিদ্যালয়ের কোন বিভাগের শিক্ষক ছিলেন?",
      questionTextEn: "Martyred intellectual Dr. Shamsuzzoha was a professor in which department at Rajshahi University?",
      optionsBn: ["পদার্থ বিজ্ঞান", "রসায়ন বিভাগ", "বাংলা বিভাগ", "ইতিহাস বিভাগ"],
      optionsEn: ["Physics", "Chemistry", "Bengali", "History"],
      correctIndex: 1,
      explanationBn: "ড. শামসুজ্জোহা ছিলেন রাজশাহী বিশ্ববিদ্যালয়ের রসায়ন বিভাগের অধ্যাপক ও প্রক্টর, যিনি ১৮ই ফেব্রুয়ারি ১৯৬৯ সালে ছাত্রদের বাঁচাতে গিয়ে পাকিস্তানি সেনারা গুলিতে শহীদ হন।",
      explanationEn: "Dr. Shamsuzzoha was a Professor of Chemistry and Proctor of Rajshahi University, martyred on February 18, 1969."
    }
  },
  "1970": {
    detailedInfoBn: "পাকিস্তানের জাতীয় পরিষদ নির্বাচনে আওয়ামী লীগ পূর্ব পাকিস্তানের ১৬৯টি আসনের মধ্যে ১৬৭টি লাভ করে একক সংখ্যাগরিষ্ঠতা অর্জন করে।",
    detailedInfoEn: "Awami League wins 167 out of 169 seats in East Pakistan in the general elections, claiming absolute majority.",
    quizQuestion: {
      questionTextBn: "১৯৭০ সালের সাধারণ নির্বাচনে পূর্ব পাকিস্তানের জাতীয় পরিষদের মোট আসন সংখ্যা কত ছিল?",
      questionTextEn: "What was the total number of seats allocated to East Pakistan in the National Assembly in 1970?",
      optionsBn: ["৩০০টি", "১৬৯টি", "১৫০টি", "৩১৩টি"],
      optionsEn: ["300", "169", "150", "313"],
      correctIndex: 1,
      explanationBn: "১৯৭০ সালের নির্বাচনে জাতীয় পরিষদের মোট ৩১৩টি আসনের মধ্যে পূর্ব পাকিস্তানের জন্য বরাদ্দ ছিল ১৬৯টি আসন (৭টি সংরক্ষিত নারী আসনসহ)। আওয়ামী লীগ ১৬৭টি আসন পায়।",
      explanationEn: "Out of 313 seats in the Pakistan National Assembly, East Pakistan had 169 seats, of which Awami League won 167."
    }
  },
  "1971": {
    detailedInfoBn: "২৬শে মার্চ স্বাধীনতার ঘোষণা, ১৭ই এপ্রিল মুজিবনগর সরকারের শপথ এবং দীর্ঘ ৯ মাসের সশস্ত্র সংগ্রামের পর ১৬ই ডিসেম্বর বিজয় অর্জন।",
    detailedInfoEn: "Declaration of Independence on March 26, oath-taking of Mujibnagar government on April 17, and final victory on December 16 after a 9-month liberation war.",
    quizQuestion: {
      questionTextBn: "১৯৭১ সালের ১৬ই ডিসেম্বর বিজয় দিবসে পাকিস্তানি সেনাবাহিনীর আত্মসমর্পণের দলিল কোথায় স্বাক্ষরিত হয়?",
      questionTextEn: "Where was the Instrument of Surrender signed on 16th December 1971?",
      optionsBn: ["রমনা রেসকোর্স ময়দান", "ঢাকা সেনানিবাস", "বঙ্গভবন", "মুজিবনগর বৈদ্যনাথতলা"],
      optionsEn: ["Ramna Racecourse Maidan", "Dhaka Cantonment", "Bangabhaban", "Mujibnagar Baidyanathtala"],
      correctIndex: 0,
      explanationBn: "১৬ই ডিসেম্বর ১৯৭১ সালে রমনা রেসকোর্স ময়দানে (বর্তমান সোহরাওয়ার্দী উদ্যান) পাকিস্তানি জেনারেল নিয়াজী যৌথ বাহিনীর প্রধান জেনারেল অরোরা'র নিকট আত্মসমর্পণ দলিলে স্বাক্ষর করেন।",
      explanationEn: "General Niazi of Pakistan Army signed the Instrument of Surrender at the Ramna Racecourse Maidan (now Suhrawardy Udyan) in Dhaka."
    }
  }
};

export const HERO_ENHANCED_DATA: Record<string, EnhancedHero> = {
  "Munshi Abdur Rouf": {
    burialPlaceBn: "রাঙ্গামাটি জেলার নানিয়ারচর উপজেলার বুড়িঘাটে (চিংড়ি খাল)।",
    burialPlaceEn: "Burighat, Naniarchar, Rangamati Hill District.",
    factsBn: [
      "তিনি ইস্ট পাকিস্তান রাইফেলস (EPR) এর ল্যান্স নায়েক ছিলেন।",
      "১ নং সেক্টরে যুদ্ধ করেছিলেন এবং রাঙ্গামাটির চিংড়ি খালে শহীদ হন।"
    ],
    factsEn: [
      "Served as a Lance Naik in East Pakistan Rifles (EPR).",
      "Fought under Sector 1 and was martyred in Naniarchar, Rangamati."
    ],
    quizQuestion: {
      questionTextBn: " can বীরশ্রেষ্ঠ ল্যান্স নায়েক মুন্সী আব্দুর রউফ এর সমাধি কোন জেলায় অবস্থিত?",
      questionTextEn: "Where is the grave of Bir Sreshtho Lance Naik Munshi Abdur Rouf located?",
      optionsBn: ["চট্টগ্রাম", "রাঙ্গামাটি", "মিরপুর (ঢাকা)", "যশোর"],
      optionsEn: ["Chittagong", "Rangamati", "Mirpur (Dhaka)", "Jessore"],
      correctIndex: 1,
      explanationBn: "বীরশ্রেষ্ঠ মুন্সী আব্দুর রউফ ১৯৭১ সালের ২০ এপ্রিল রাঙ্গামাটির বুড়িঘাটে শহীদ হন এবং রাঙ্গামাটি জেলার নানিয়ারচরে চিংড়ি খালের পাড়ে তাকে সমাহিত করা হয়।",
      explanationEn: "He was martyred at Burighat on April 20, 1971, and his grave is situated in Naniarchar, Rangamati."
    }
  },
  "Hamidur Rahman": {
    burialPlaceBn: "মিরপুর শহীদ বুদ্ধিজীবী কবরস্থান, ঢাকা (পূর্বে ভারতের ত্রিপুরায় ছিল, ২০০৭ সালে আনা হয়)।",
    burialPlaceEn: "Mirpur Martyred Intellectual Graveyard, Dhaka (brought from Tripura, India in 2007).",
    factsBn: [
      "তিনি বীরশ্রেষ্ঠদের মধ্যে সবচেয়ে কনিষ্ঠ (বয়স ১৮ বছর)।",
      "তিনি সেনাবাহিনীর সিপাহী পদে ছিলেন এবং ৪ নং সেক্টরে ধলই সীমান্ত চৌকিতে যুদ্ধ করেছিলেন।"
    ],
    factsEn: [
      "The youngest among the seven Bir Sreshthos (aged 18).",
      "A Sepoy in Bangladesh Army who fought in Sector 4 at Dhalai outpost."
    ],
    quizQuestion: {
      questionTextBn: "বীরশ্রেষ্ঠদের মধ্যে সবচেয়ে কনিষ্ঠ মুক্তিযোদ্ধা কে ছিলেন?",
      questionTextEn: "Who was the youngest fighter among the seven Bir Sreshthos?",
      optionsBn: ["সিপাহী মোস্তফা কামাল", "সিপাহী হামিদুর রহমান", "ল্যান্স নায়েক মুন্সী আব্দুর রউফ", "ফ্লাইট লেফটেন্যান্ট মতিউর রহমান"],
      optionsEn: ["Sepoy Mostafa Kamal", "Sepoy Hamidur Rahman", "Lance Naik Munshi Abdur Rouf", "Flight Lieutenant Matiur Rahman"],
      correctIndex: 1,
      explanationBn: "সিপাহী হামিদুর রহমান মাত্র ১৮ বছর বয়সে ৪ নং সেক্টরের ধলই সীমান্তে পাকিস্তানি ব্যাংকার ধ্বংস করতে গিয়ে শহীদ হন। তিনি বীরশ্রেষ্ঠদের মধ্যে কনিষ্ঠতম।",
      explanationEn: "Sepoy Hamidur Rahman was the youngest of the seven Bir Sreshthos, aged 18 when he was martyred at Dhalai border outpost."
    }
  },
  "Mostafa Kamal": {
    burialPlaceBn: "দরুইন গ্রাম, আখাউড়া, ব্রাহ্মণবাড়িয়া।",
    burialPlaceEn: "Daruin, Akhaura, Brahmanbaria.",
    factsBn: [
      "তিনি সেনাবাহিনীর সিপাহী ছিলেন এবং ২ নং সেক্টরে যুদ্ধ করেছিলেন।",
      "আখাউড়ার দরুইন গ্রামে একা কভারিং ফায়ার দিয়ে সহযোদ্ধাদের জীবন রক্ষা করেছিলেন।"
    ],
    factsEn: [
      "A Sepoy in Bangladesh Army who fought under Sector 2.",
      "Gave his life conducting covering fire to save his retreating comrades in Akhaura."
    ],
    quizQuestion: {
      questionTextBn: "বীরশ্রেষ্ঠ সিপাহী মোস্তফা কামাল কোন সেক্টরে বীরত্বের সাথে যুদ্ধ করে শহীদ হন?",
      questionTextEn: "Under which sector did Bir Sreshtho Sepoy Mostafa Kamal fight and sacrifice his life?",
      optionsBn: ["১ নং সেক্টর", "২ নং সেক্টর", "৩ নং সেক্টর", "৪ নং সেক্টর"],
      optionsEn: ["Sector 1", "Sector 2", "Sector 3", "Sector 4"],
      correctIndex: 1,
      explanationBn: "সিপাহী মোস্তফা কামাল ২ নং সেক্টরের অধীনে ব্রাহ্মণবাড়িয়ার আখাউড়ার দরুইন গ্রামে ১৮ এপ্রিল ১৯৭১ সালে শহীদ হন।",
      explanationEn: "Sepoy Mostafa Kamal was martyred on April 18, 1971 at Daruin, Akhaura under Sector 2."
    }
  },
  "Matiur Rahman": {
    burialPlaceBn: "মিরপুর শহীদ বুদ্ধিজীবী কবরস্থান, ঢাকা (পূর্বে করাচির মাশরুর বিমান ঘাঁটিতে ছিল, ২০০৬ সালে আনা হয়)।",
    burialPlaceEn: "Mirpur Martyred Intellectual Graveyard, Dhaka (brought from Masroor Airbase, Karachi in 2006).",
    factsBn: [
      "তিনি পাকিস্তান বিমান বাহিনীর ফ্লাইট লেফটেন্যান্ট ছিলেন।",
      "টি-৩৩ প্রশিক্ষণ বিমান (ছদ্মনাম ব্লু বার্ড) হাইজ্যাক করে মুক্তিযুদ্ধে যোগ দেওয়ার চেষ্টা করেছিলেন।"
    ],
    factsEn: [
      "A Flight Lieutenant in the Pakistan Air Force.",
      "Attempted to hijack a T-33 trainer aircraft (named Blue Bird) to escape to India and join the liberation war."
    ],
    quizQuestion: {
      questionTextBn: "বীরশ্রেষ্ঠ ফ্লাইট লেফটেন্যান্ট মতিউর রহমান যে বিমানটি নিয়ে আসার চেষ্টা করেছিলেন তার ছদ্মনাম কী ছিল?",
      questionTextEn: "What was the codename of the aircraft hijacked by Flight Lieutenant Matiur Rahman?",
      optionsBn: ["থান্ডারবার্ড", "ব্লু বার্ড", "গোল্ডেন ঈগল", "স্কাই ফাইটার"],
      optionsEn: ["Thunderbird", "Blue Bird", "Golden Eagle", "Sky Fighter"],
      correctIndex: 1,
      explanationBn: "মতিউর রহমান ২০ আগস্ট ১৯৭১ করাচির মাশরুর বিমানঘাঁটি থেকে ছাত্র পাইলট রশিদ মিনহাজের কাছ থেকে টি-৩৩ 'ব্লু বার্ড' বিমানটি হাইজ্যাক করে ভারতে আসার পথে বিধ্বস্ত হয়ে শহীদ হন।",
      explanationEn: "Matiur Rahman attempted to fly the T-33 trainer jet nicknamed 'Blue Bird' to India, crashing near the border."
    }
  },
  "Noor Mohammad Sheikh": {
    burialPlaceBn: "কাশীপুর গ্রাম, শার্শা, যশোর।",
    burialPlaceEn: "Kashipur, Sharsha, Jessore.",
    factsBn: [
      "তিনি ইস্ট পাকিস্তান রাইফেলস (EPR) এর নায়েক ছিলেন।",
      "৮ নং সেক্টরের গোয়ালহাটি গ্রামে যুদ্ধ করেছিলেন এবং সহযোদ্ধা মোস্তফা কামালের জীবন বাঁচাতে গিয়ে শহীদ হন।"
    ],
    factsEn: [
      "A Naik in East Pakistan Rifles (EPR).",
      "Fought in Sector 8 and sacrificed his life in Goalhati to cover his comrades' retreat."
    ],
    quizQuestion: {
      questionTextBn: "বীরশ্রেষ্ঠ নায়েক নূর মোহাম্মদ শেখ কোন সেক্টরে যুদ্ধ করে শহীদ হন?",
      questionTextEn: "Under which sector did Naik Noor Mohammad Sheikh fight?",
      optionsBn: ["৭ নং সেক্টর", "৮ নং সেক্টর", "৯ নং সেক্টর", "১০ নং সেক্টর"],
      optionsEn: ["Sector 7", "Sector 8", "Sector 9", "Sector 10"],
      correctIndex: 1,
      explanationBn: "নায়েক নূর মোহাম্মদ শেখ ৮ নং সেক্টরের অধীনে যশোরের শার্শা উপজেলার গোয়ালহাটি সীমান্তে ৫ সেপ্টেম্বর ১৯৭১ সালে শহীদ হন এবং কাশীপুরে তাকে সমাহিত করা হয়।",
      explanationEn: "He fought under Sector 8 and was martyred on September 5, 1971 at Goalhati, Jessore."
    }
  },
  "Mohiuddin Jahangir": {
    burialPlaceBn: "ছোট সোনা মসজিদ প্রাঙ্গণ, চাঁপাইনবাবগঞ্জ।",
    burialPlaceEn: "Sona Masjid premises, Shibganj, Chapainawabganj.",
    factsBn: [
      "তিনি সেনাবাহিনীর ক্যপ্টেন ছিলেন এবং ৭ নং সেক্টরে যুদ্ধ করেছিলেন।",
      "১৪ই ডিসেম্বর ১৯৭১ সালে চাঁপাইনবাবগঞ্জ মুক্ত করার ঠিক পূর্বে রেহাইচরে পাকিস্তানি স্নাইপারের গুলিতে শহীদ হন।"
    ],
    factsEn: [
      "A Captain in Bangladesh Army who commanded forces in Sector 7.",
      "Martyred on December 14, 1971 (just 2 days before victory) by a sniper during the liberation of Chapainawabganj."
    ],
    quizQuestion: {
      questionTextBn: "বীরশ্রেষ্ঠদের মধ্যে একমাত্র সেনাবাহিনীর ক্যাপ্টেন पदমর্যাদার অফিসার কে ছিলেন?",
      questionTextEn: "Who was the only Captain rank officer among the seven Bir Sreshthos?",
      optionsBn: ["ক্যাপ্টেন মহিউদ্দিন জাহাঙ্গীর", "সিপাহী হামিদুর রহমান", "স্কোয়াড্রন লিডার মতিউর রহমান", "নায়েক নূর মোহাম্মদ শেখ"],
      optionsEn: ["Captain Mohiuddin Jahangir", "Sepoy Hamidur Rahman", "Squadron Leader Matiur Rahman", "Naik Noor Mohammad Sheikh"],
      correctIndex: 0,
      explanationBn: "ক্যাপ্টেন মহিউদ্দিন জাহাঙ্গীর ছিলেন একমাত্র বীরশ্রেষ্ঠ যিনি ক্যাপ্টেন পদমর্যাদার অফিসার ছিলেন। চাঁপাইনবাবগঞ্জের সোনা মসজিদ প্রাঙ্গণে তাকে সমাহিত করা হয়।",
      explanationEn: "Captain Mohiuddin Jahangir was the only Captain-rank army officer among the seven honorees."
    }
  },
  "Ruhul Amin": {
    burialPlaceBn: "বাগমারা গ্রাম, রূপসা নদীর তীর, খুলনা।",
    burialPlaceEn: "Rupsha River Bank, Rupsha, Khulna.",
    factsBn: [
      "তিনি নৌবাহিনীর ইঞ্জিন রুম আর্টিফিসার (ERA) ছিলেন।",
      "১০ নং সেক্টরের গানবোট 'পলাশ'-এ কর্মরত ছিলেন এবং ১০ই ডিসেম্বর ১৯৭১ সালে রূপসা নদীতে শহীদ হন।"
    ],
    factsEn: [
      "An Engine Room Artificer-1 (ERA-1) in Bangladesh Navy.",
      "Served on Gunboat 'Palash' under Sector 10, martyred on Dec 10, 1971 in Rupsha River by friendly air fire misidentification."
    ],
    quizQuestion: {
      questionTextBn: "বীরশ্রেষ্ঠ ইঞ্জিন রুম আর্টিফিসার রুহুল আমিন কোন গানবোটের প্রধান ইঞ্জিন চালক ছিলেন?",
      questionTextEn: "Which gunboat did Engine Room Artificer Ruhul Amin serve on as Chief Engineer?",
      optionsBn: ["পদ্মা", "পলাশ", "মেঘনা", "যমুনা"],
      optionsEn: ["Padma", "Palash", "Meghna", "Jamuna"],
      correctIndex: 1,
      explanationBn: "রুহুল আমিন গানবোট 'পলাশ' এর প্রধান ইঞ্জিন চালক ছিলেন। ১০ই ডিসেম্বর ভারতীয় বিমান বাহিনী ভুলবশত গানবোট পলাশে বোমা বর্ষণ করলে তিনি রূপসা নদীতে শহীদ হন।",
      explanationEn: "He was on Gunboat 'Palash', which was mistakenly bombed by Indian air forces near Rupsha, Khulna on December 10, 1971."
    }
  }
};

export const SECTOR_QUIZ_DATA: Record<number, EnhancedSector> = {
  1: {
    factsBn: ["চট্টগ্রাম, পার্বত্য চট্টগ্রাম ও নোয়াখালীর অংশবিশেষ নিয়ে গঠিত।", "সেক্টর কমান্ডার ছিলেন মেজর জিয়াউর রহমান, পরবর্তীতে মেজর রফিকুল ইসলাম।"],
    factsEn: ["Comprised of Chittagong, Chittagong Hill Tracts, and parts of Noakhali.", "Sector Commanders were Major Ziaur Rahman, followed by Major Rafiqul Islam."],
    quizQuestion: {
      questionTextBn: " can মুক্তিযুদ্ধের সময় ১ নং সেক্টরের প্রথম সেক্টর কমান্ডার কে ছিলেন?",
      questionTextEn: "Who was the first Sector Commander of Sector 1?",
      optionsBn: ["মেজর রফিকুল ইসলাম", "মেজর জিয়াউর রহমান", "মেজর খালেদ মোশাররফ", "মেজর সি. আর. দত্ত"],
      optionsEn: ["Major Rafiqul Islam", "Major Ziaur Rahman", "Major Khaled Mosharraf", "Major C. R. Dutta"],
      correctIndex: 1,
      explanationBn: "১ নং সেক্টরের প্রথম সেক্টর কমান্ডার ছিলেন মেজর জিয়াউর রহমান (এপ্রিল - জুন), পরবর্তীতে মেজর রফিকুল ইসলাম দায়িত্ব নেন (জুন - ডিসেম্বর)।",
      explanationEn: "Major Ziaur Rahman was the initial Sector 1 Commander, succeeded by Major Rafiqul Islam in June."
    }
  },
  2: {
    factsBn: ["ঢাকা, ফরিদপুর ও কুমিল্লা জেলা নিয়ে গঠিত ছিল।", "সেক্টর কমান্ডার ছিলেন মেজর খালেদ মোশাররফ, পরবর্তীতে মেজর এ. টি. এম. হায়দার।"],
    factsEn: ["Comprised of Dhaka, Faridpur, and Comilla.", "Sector Commanders were Major Khaled Mosharraf, followed by Major A. T. M. Hyder."],
    quizQuestion: {
      questionTextBn: "মুক্তিযুদ্ধের সময় ঢাকা জেলা কোন সেক্টরের অধীন ছিল?",
      questionTextEn: "Which sector did Dhaka district belong to during the liberation war?",
      optionsBn: ["১ নং সেক্টর", "২ নং সেক্টর", "৩ নং সেক্টর", "৪ নং সেক্টর"],
      optionsEn: ["Sector 1", "Sector 2", "Sector 3", "Sector 4"],
      correctIndex: 1,
      explanationBn: "ঢাকা, কুমিল্লা ও ফরিদপুর ২ নং সেক্টরের অধীনে ছিল। ক্র্যাক প্লাটুন নামক বিখ্যাত গেরিলা গ্রুপ এই ২ নং সেক্টরে ঢাকা শহরে সক্রিয় ছিল।",
      explanationEn: "Dhaka and surrounding areas were under Sector 2, commanded by Major Khaled Mosharraf."
    }
  },
  3: {
    factsBn: ["ময়মনসিংহের কিয়দংশ, সিলেট ও ঢাকার কিয়দংশ নিয়ে গঠিত ছিল।", "সেক্টর কমান্ডার ছিলেন মেজর শফিউল্লাহ, পরবর্তীতে মেজর এ. এন. এম. নুরুজ্জামান।"],
    factsEn: ["Comprised of parts of Mymensingh, Sylhet, and Dhaka.", "Sector Commanders were Major Shafiullah, followed by Major A. N. M. Nuruzzaman."],
    quizQuestion: {
      questionTextBn: "৩ নং সেক্টরের প্রথম সেক্টর কমান্ডার মেজর কে. এম. শফিউল্লাহ পরবর্তীতে বাংলাদেশ সেনাবাহিনীর কী পদে নিযুক্ত হন?",
      questionTextEn: "Major K. M. Shafiullah, the first commander of Sector 3, later held which prominent military position?",
      optionsBn: ["প্রথম সেনাপ্রধান", "প্রথম বিমানবাহিনী প্রধান", "প্রথম নৌবাহিনী প্রধান", "মুক্তিযুদ্ধ প্রধান সেনাপতি"],
      optionsEn: ["First Chief of Army Staff", "First Air Force Chief", "First Navy Chief", "Supreme Military Commander"],
      correctIndex: 0,
      explanationBn: "মেজর কে. এম. শফিউল্লাহ ছিলেন ৩ নং সেক্টরের প্রথম কমান্ডার, যিনি স্বাধীনতা পরবর্তী স্বাধীন বাংলাদেশের প্রথম সেনাপ্রধান হিসেবে নিযুক্ত হন।",
      explanationEn: "Major Shafiullah became the first Chief of Army Staff (COAS) of the Bangladesh Army after independence."
    }
  },
  4: {
    factsBn: ["সিলেট জেলার পূর্বাঞ্চল ও খোয়াই-শায়েস্তাগঞ্জ নিয়ে গঠিত ছিল।", "সেক্টর কমান্ডার ছিলেন মেজর সি. আর. দত্ত।"],
    factsEn: ["Comprised of eastern parts of Sylhet.", "Sector Commander was Major C. R. Dutta."],
    quizQuestion: {
      questionTextBn: "সিলেটের পূর্বাঞ্চল নিয়ে গঠিত ৪ নং সেক্টরের কমান্ডার কে ছিলেন?",
      questionTextEn: "Who was the Sector Commander of Sector 4 covering eastern Sylhet?",
      optionsBn: ["মেজর সি. আর. দত্ত", "মেজর খালেদ মোশাররফ", "মেজর জিয়াউর রহমান", "মেজর আবু তাহের"],
      optionsEn: ["Major C. R. Dutta", "Major Khaled Mosharraf", "Major Ziaur Rahman", "Major Abu Taher"],
      correctIndex: 0,
      explanationBn: "৪ নং সেক্টরের দায়িত্বে ছিলেন মেজর সি. আর. দত্ত (চিত্ত রঞ্জন দত্ত), যার সদর দপ্তর ছিল আসামের খোয়াই-এ।",
      explanationEn: "Major Chitta Ranjan Dutta (C. R. Dutta) was the commander of Sector 4 during 1971."
    }
  },
  5: {
    factsBn: ["সিলেট জেলার পশ্চিমাঞ্চল ও ছাতক, সুনামগঞ্জ নিয়ে গঠিত ছিল।", "সেক্টর কমান্ডার ছিলেন মেজর মীর শওকত আলী।"],
    factsEn: ["Comprised of western parts of Sylhet.", "Sector Commander was Major Mir Shawkat Ali."],
    quizQuestion: {
      questionTextBn: "সুনামগঞ্জ, ছাতক এবং সিলেটের পশ্চিমাঞ্চল নিয়ে গঠিত ৫ নং সেক্টরের কমান্ডার কে ছিলেন?",
      questionTextEn: "Who was the Commander of Sector 5 covering western Sylhet and Sunamganj?",
      optionsBn: ["মেজর মীর শওকত আলী", "মেজর রফিকুল ইসলাম", "মেজর খালেদ মোশাররফ", "মেজর সি. আর. দত্ত"],
      optionsEn: ["Major Mir Shawkat Ali", "Major Rafiqul Islam", "Major Khaled Mosharraf", "Major C. R. Dutta"],
      correctIndex: 0,
      explanationBn: "৫ নং সেক্টরের সেক্টর কমান্ডার ছিলেন মেজর মীর শওকত আলী। এর সদর দপ্তর ছিল বাঁশতলায়।",
      explanationEn: "Major Mir Shawkat Ali commanded Sector 5, which operated from its headquarters in Bashtala."
    }
  },
  6: {
    factsBn: ["রংপুর জেলা ও দিনাজপুরের অংশবিশেষ নিয়ে গঠিত ছিল।", "সেক্টর কমান্ডার ছিলেন উইং কমান্ডার এম. খাদেমুল বাশার (একমাত্র বিমান বাহিনীর অফিসার)।"],
    factsEn: ["Comprised of Rangpur and parts of Dinajpur.", "Sector Commander was Wing Commander M. Khademul Bashar (only Air Force officer)."],
    quizQuestion: {
      questionTextBn: "কোন সেক্টরের কমান্ডার ছিলেন একমাত্র পাকিস্তান বিমান বাহিনীর উইং কমান্ডার পদমর্যাদার অফিসার?",
      questionTextEn: "Which sector was commanded by the only Wing Commander officer from Pakistan Air Force?",
      optionsBn: ["৪ নং সেক্টর", "৫ নং সেক্টর", "৬ নং সেক্টর", "৭ নং সেক্টর"],
      optionsEn: ["Sector 4", "Sector 5", "Sector 6", "Sector 7"],
      correctIndex: 2,
      explanationBn: "৬ নং সেক্টরের (রংপুর-দিনাজপুর) কমান্ডার ছিলেন উইং কমান্ডার এম. খাদেমুল বাশার। এটিই একমাত্র সেক্টর যার হেডকোয়ার্টার বাংলাদেশ ভূখণ্ডে (পাটগ্রাম, লালমনিরহাট) ছিল।",
      explanationEn: "Sector 6 was commanded by Wing Commander M. Khademul Bashar and had its headquarters inside Bangladesh at Patgram."
    }
  },
  7: {
    factsBn: ["রাজশাহী, পাবনা, বগুড়া ও দিনাজপুরের অংশবিশেষ নিয়ে গঠিত ছিল।", "সেক্টর কমান্ডার ছিলেন মেজর কাজী নুরুজ্জামান।"],
    factsEn: ["Comprised of Rajshahi, Pabna, Bogra, and parts of Dinajpur.", "Sector Commander was Major Kazi Nuruzzaman."],
    quizQuestion: {
      questionTextBn: "রাজশাহী, পাবনা এবং বগুড়া জেলা কোন সেক্টরের অধীনে ছিল?",
      questionTextEn: "Which sector did Rajshahi, Pabna, and Bogra belong to?",
      optionsBn: ["৬ নং সেক্টর", "৭ নং সেক্টর", "৮ নং সেক্টর", "৯ নং সেক্টর"],
      optionsEn: ["Sector 6", "Sector 7", "Sector 8", "Sector 9"],
      correctIndex: 1,
      explanationBn: "রাজশাহী, পাবনা ও বগুড়া অঞ্চল ৭ নং সেক্টরের অধীনে ছিল। এর সেক্টর কমান্ডার ছিলেন মেজর কাজী নুরুজ্জামান এবং পূর্বে মেজর নাজমুল হক।",
      explanationEn: "These north-western districts were managed under Sector 7, initially by Major Nazmul Huq and later Major Kazi Nuruzzaman."
    }
  },
  8: {
    factsBn: ["কুষ্টিয়া, যশোর ও খুলনা জেলার অংশবিশেষ নিয়ে গঠিত ছিল।", "সেক্টর কমান্ডার ছিলেন মেজর আবু ওসমান চৌধুরী, পরবর্তীতে মেজর এম. এ. মঞ্জুর।"],
    factsEn: ["Comprised of Kushtia, Jessore, and parts of Khulna.", "Sector Commanders were Major Abu Osman Chowdhury, followed by Major M. A. Manzur."],
    quizQuestion: {
      questionTextBn: "মেজর আবু ওসমান চৌধুরী স্বাধীনতা যুদ্ধকালে কোন সেক্টরের প্রথম সেক্টর কমান্ডার হিসেবে দায়িত্ব পালন করেন?",
      questionTextEn: "Major Abu Osman Chowdhury was the first commander of which sector?",
      optionsBn: ["৭ নং সেক্টর", "৮ নং সেক্টর", "৯ নং সেক্টর", "১১ নং সেক্টর"],
      optionsEn: ["Sector 7", "Sector 8", "Sector 9", "Sector 11"],
      correctIndex: 1,
      explanationBn: "৮ নং সেক্টরের প্রথম কমান্ডার ছিলেন মেজর আবু ওসমান চৌধুরী (এপ্রিল - আগস্ট), পরবর্তীতে মেজর এম. এ. মঞ্জুর দায়িত্ব নেন।",
      explanationEn: "Major Abu Osman Chowdhury commanded Sector 8 until August, when Major M. A. Manzur took over."
    }
  },
  9: {
    factsBn: ["বরিশাল, পটুয়াখালী ও খুলনার অংশবিশেষ নিয়ে গঠিত ছিল।", "সেক্টর কমান্ডার ছিলেন মেজর এম. এ. জলিল।"],
    factsEn: ["Comprised of Barisal, Patuakhali, and parts of Khulna.", "Sector Commander was Major M. A. Jalil."],
    quizQuestion: {
      questionTextBn: "বরিশাল ও পটুয়াখালী জেলা কোন সেক্টরের অন্তর্ভুক্ত ছিল?",
      questionTextEn: "Which sector covered the southern districts of Barisal and Patuakhali?",
      optionsBn: ["৮ নং সেক্টর", "৯ নং সেক্টর", "১০ নং সেক্টর", "১১ নং সেক্টর"],
      optionsEn: ["Sector 8", "Sector 9", "Sector 10", "Sector 11"],
      correctIndex: 1,
      explanationBn: "বরিশাল, পটুয়াখালী এবং খুলনার কিয়দংশ ৯ নং সেক্টরের অন্তর্ভুক্ত ছিল, যার কমান্ডার ছিলেন মেজর এম. এ. জলিল।",
      explanationEn: "Sector 9, commanded by Major M. A. Jalil, covered the southern coastal areas of Barisal and Patuakhali."
    }
  },
  10: {
    factsBn: ["কোনো আঞ্চলিক সীমানা ছিল না। নৌ-কমান্ডোদের নিয়ে গঠিত বিশেষ নৌ-সেক্টর।", "এই সেক্টরের কোনো নিয়মিত সেক্টর কমান্ডার ছিল না। প্রয়োজনে স্থানীয় কমান্ডাররা নেতৃত্ব দিতেন।"],
    factsEn: ["No geographical boundary. Special naval sector composed of elite frogmen.", "No permanent or regular Sector Commander; coordinated directly by General Head Quarters."],
    quizQuestion: {
      questionTextBn: "মুক্তিযুদ্ধের সময় কোন সেক্টরটির কোনো ভৌগোলিক সীমানা বা নিয়মিত কমান্ডার ছিল না?",
      questionTextEn: "Which sector did not have any geographical boundary or a regular commander?",
      optionsBn: ["২ নং সেক্টর", "৮ নং সেক্টর", "১০ নং সেক্টর", "১১ নং সেক্টর"],
      optionsEn: ["Sector 2", "Sector 8", "Sector 10", "Sector 11"],
      correctIndex: 2,
      explanationBn: "১০ নং সেক্টর ছিল নৌ-সেক্টর, যার কোনো নির্দিষ্ট সীমানা বা সার্বক্ষণিক সেক্টর কমান্ডার ছিল না। নৌ-কমান্ডোরা বিভিন্ন সেক্টরে গিয়ে কাজ করতেন।",
      explanationEn: "Sector 10 was a specialized naval wing with no defined geographic territory or fixed commander."
    }
  },
  11: {
    factsBn: ["কিশোরগঞ্জ বাদে সমগ্র ময়মনসিংহ ও টাঙ্গাইল নিয়ে গঠিত ছিল।", "সেক্টর কমান্ডার ছিলেন মেজর আবু তাহের, পরবর্তীতে স্কোয়াড্রন লিডার এম. হামিদুল্লাহ খান।"],
    factsEn: ["Comprised of Mymensingh (except Kishoreganj) and Tangail.", "Sector Commanders were Major Abu Taher, followed by Squadron Leader M. Hamidullah Khan."],
    quizQuestion: {
      questionTextBn: "টাঙ্গাইল ও ময়মনসিংহ (কিশোরগঞ্জ বাদে) কোন সেক্টরের অধীনে ছিল?",
      questionTextEn: "Which sector controlled Tangail and Mymensingh region?",
      optionsBn: ["৩ নং সেক্টর", "৯ নং সেক্টর", "১০ নং সেক্টর", "১১ নং সেক্টর"],
      optionsEn: ["Sector 3", "Sector 9", "Sector 10", "Sector 11"],
      correctIndex: 3,
      explanationBn: "টাঙ্গাইল এবং ময়মনসিংহ জেলা ১১ নং সেক্টরের অধীনে ছিল। এর সেক্টর কমান্ডার ছিলেন মেজর আবু তাহের (যিনি এক পা হারিয়েছিলেন)।",
      explanationEn: "Sector 11 covered Tangail and Mymensingh, initially commanded by Major Abu Taher."
    }
  }
};

export const ENGLISH_ENHANCED_DATA: Record<string, EnhancedEnglish> = {
  "Abate": {
    quizQuestion: {
      questionTextBn: "'Abate' शब्दটির সঠিক সমার্থক শব্দ (Synonym) কোনটি?",
      questionTextEn: "What is the correct synonym of 'Abate'?",
      optionsBn: ["বৃদ্ধি করা (Increase)", "প্রশমিত করা/হ্রাস পাওয়া (Lessen)", "কঠিন করা (Intensify)", "পরিবর্তন করা (Alter)"],
      optionsEn: ["Increase", "Lessen", "Intensify", "Alter"],
      correctIndex: 1,
      explanationBn: "Abate শব্দের অর্থ হ্রাস পাওয়া বা তীব্রতা কমা, তাই এর সঠিক সমার্থক শব্দ হলো Lessen বা Subside।",
      explanationEn: "'Abate' means to become less intense or decrease. 'Lessen' is the correct synonym."
    }
  },
  "Abstain from": {
    quizQuestion: {
      questionTextBn: "He was advised to abstain ___ alcohol. (শূন্যস্থানে উপযুক্ত প্রিপজিশন বসান)",
      questionTextEn: "He was advised to abstain ___ alcohol. (Choose the appropriate preposition)",
      optionsBn: ["to", "from", "with", "at"],
      optionsEn: ["to", "from", "with", "at"],
      correctIndex: 1,
      explanationBn: "Abstain-এর পরে উপযুক্ত প্রিপজিশন হিসেবে 'from' বসে, যার অর্থ 'কোনো কিছু থেকে বিরত থাকা'।",
      explanationEn: "The verb 'abstain' is always followed by the preposition 'from', meaning to restrain oneself from something."
    }
  },
  "Bureaucracy": {
    quizQuestion: {
      questionTextBn: "নিচের কোন বানানটি সঠিক?",
      questionTextEn: "Which of the following spellings is correct?",
      optionsBn: ["Burocracy", "Bureaucracy", "Bureacracy", "Beurocracy"],
      optionsEn: ["Burocracy", "Bureaucracy", "Bureacracy", "Beurocracy"],
      correctIndex: 1,
      explanationBn: "সঠিক বানানটি হলো B-U-R-E-A-U-C-R-A-C-Y (Bureaucracy), যার বাংলা অর্থ আমলাতন্ত্র।",
      explanationEn: "The correct spelling is 'Bureaucracy' (B-U-R-E-A-U-C-R-A-C-Y), which refers to state officialdom."
    }
  },
  "At daggers drawn": {
    quizQuestion: {
      questionTextBn: "'At daggers drawn' বাগধারাটির সঠিক অর্থ কী?",
      questionTextEn: "What is the correct meaning of the idiom 'At daggers drawn'?",
      optionsBn: ["খুবই বন্ধুত্বপূর্ণ (Very friendly)", "তীব্র শত্রুতাভাব (Bitterly hostile)", "সহযোগিতাপূর্ণ (Cooperative)", "উদাসীন (Indifferent)"],
      optionsEn: ["Very friendly", "Bitterly hostile", "Cooperative", "Indifferent"],
      correctIndex: 1,
      explanationBn: "'At daggers drawn' অর্থ তীব্র শত্রুতাভাব বা ভীষণ বিরূপ সম্পর্ক (Bitterly hostile বা on the verge of fighting)।",
      explanationEn: "The idiom 'at daggers drawn' describes a state of open, bitter hostility between parties."
    }
  },
  "Diarrhoea": {
    quizQuestion: {
      questionTextBn: "ডায়রিয়া শব্দের সঠিক ইংরেজি বানান চিহ্নিত করুন:",
      questionTextEn: "Identify the correct English spelling of the medical term 'Diarrhoea':",
      optionsBn: ["Diarrhoea", "Diarrohea", "Diarea", "Diarohea"],
      optionsEn: ["Diarrhoea", "Diarrohea", "Diarea", "Diarohea"],
      correctIndex: 0,
      explanationBn: "সঠিক চিকিৎসা বানানটি হলো D-I-A-R-R-H-O-E-A (Diarrhoea)।",
      explanationEn: "The correct medical spelling is 'Diarrhoea' (D-I-A-R-R-H-O-E-A)."
    }
  },
  "Achilles' heel": {
    quizQuestion: {
      questionTextBn: "'Achilles' heel' বলতে কী বোঝায়?",
      questionTextEn: "What does the expression 'Achilles' heel' refer to?",
      optionsBn: ["সবচেয়ে শক্তিশালী অংশ (Strongest point)", "একটি মারাত্মক দুর্বলতা (A vulnerable or weak spot)", "দ্রুত দৌড়ানোর ক্ষমতা (Fast running ability)", "পায়ের পাতার চিকিৎসা (Foot pathology)"],
      optionsEn: ["Strongest point", "A vulnerable or weak spot", "Fast running ability", "Foot pathology"],
      correctIndex: 1,
      explanationBn: "'Achilles' heel' অর্থ কোনো ব্যক্তি বা বিষয়ের একমাত্র মারাত্মক দুর্বল স্থান বা মারাত্মক দুর্বলতা (vulnerable spot)।",
      explanationEn: "Originating from Greek mythology, 'Achilles' heel' means a deadly vulnerability or weak spot."
    }
  },
  "Insist on": {
    quizQuestion: {
      questionTextBn: "She insisted ___ paying the medical bill. (সঠিক শব্দ বসান)",
      questionTextEn: "She insisted ___ paying the medical bill. (Select the correct option)",
      optionsBn: ["to", "for", "on", "at"],
      optionsEn: ["to", "for", "on", "at"],
      correctIndex: 2,
      explanationBn: "Insist-এর পর এপ্রোপ্রিয়েট প্রিপজিশন 'on' বসে এবং এরপর verb-এর সাথে -ing যুক্ত হয়।",
      explanationEn: "The verb 'insist' takes the preposition 'on' followed by a gerund."
    }
  },
  "Altruistic": {
    quizQuestion: {
      questionTextBn: "'Altruistic' শব্দের সঠিক বিপরীত শব্দ (Antonym) কোনটি?",
      questionTextEn: "What is the correct antonym of 'Altruistic'?",
      optionsBn: ["পরোপকারী (Benevolent)", "উদার (Generous)", "স্বার্থপর (Selfish)", "দয়ালু (Kind)"],
      optionsEn: ["Benevolent", "Generous", "Selfish", "Kind"],
      correctIndex: 2,
      explanationBn: "Altruistic অর্থ পরোপকারী বা নিঃস্বার্থ, তাই এর বিপরীত শব্দ হলো Selfish (স্বার্থপর)।",
      explanationEn: "'Altruistic' means selfless or unselfish. The correct antonym is 'Selfish'."
    }
  },
  "Lieutenant": {
    quizQuestion: {
      questionTextBn: "লেফটেন্যান্ট শব্দের সঠিক বানান কোনটি?",
      questionTextEn: "Which of the following spellings is correct for 'Lieutenant'?",
      optionsBn: ["Lutenant", "Leutenant", "Lieutenant", "Lieutanant"],
      optionsEn: ["Lutenant", "Leutenant", "Lieutenant", "Lieutanant"],
      correctIndex: 2,
      explanationBn: "মনে রাখার কৌশল: Lie (মিথ্যা) + U (তুমি) + Ten (দশ) + Ant (পিঁপড়া) = L-I-E-U-T-E-N-A-N-T।",
      explanationEn: "The correct spelling is 'Lieutenant'. Mnemonic: Lie + U + Ten + Ant."
    }
  },
  "Gift of the gab": {
    quizQuestion: {
      questionTextBn: "'Gift of the gab' বাগধারাটি নিচের কোনটিকে প্রকাশ করে?",
      questionTextEn: "What does the phrase 'Gift of the gab' mean?",
      optionsBn: ["উপহার দেওয়ার স্বভাব (Generosity)", "চমৎকার বাচনভঙ্গি বা বাগ্মিতা (Eloquence / Talent for speaking)", "নীরব থাকার ক্ষমতা (Silence)", "চিকিৎসা দক্ষতা (Clinical expertise)"],
      optionsEn: ["Generosity", "Eloquence / Talent for speaking", "Silence", "Clinical expertise"],
      correctIndex: 1,
      explanationBn: "'Gift of the gab' বাগধারাটির অর্থ হলো সুন্দর ও প্রভাবশালী কথা বলার ক্ষমতা বা বাগ্মিতা (Eloquence)।",
      explanationEn: "'Gift of the gab' is an idiom that means possessing the talent for speaking fluently and persuasively (eloquence)."
    }
  }
};
