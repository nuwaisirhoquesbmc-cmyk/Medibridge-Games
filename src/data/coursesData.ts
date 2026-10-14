import { Course, Batch, CourseClass, CourseMaterial, CourseAnnouncement, CourseExam, Coupon, CoursePaymentSettings } from "../types/courseTypes";
import { STARTER_QUESTIONS } from "../questionsData";
import { Question } from "../types";

export const INITIAL_COURSES: Course[] = [
  {
    id: "course_med_2027",
    slug: "medical-standard-exam-batch-2027",
    title: "Medical Standard Exam Batch 2027",
    shortDescription: "বাংলাদেশ সেরা মেডিকেল কলেজগুলোতে চান্স পাওয়ার জন্য সম্পূর্ণ অধ্যায়ভিত্তিক ও সাবজেক্টভিত্তিক মডেল টেস্ট প্রোগ্রাম।",
    fullDescription: "মেডিকেল ভর্তি পরীক্ষা (MAT)-এ কাঙ্ক্ষিত সাদা কোট অর্জন করার জন্য সুনির্দিষ্ট ও পরিকল্পনা নির্ভর প্রিপারেশন সবচেয়ে গুরুত্বপূর্ণ। এই ব্যাচে থাকবে ড. আবুল হাসান ও গাজী আজমল স্যারের জীববিজ্ঞানের প্রতিটি চ্যাপ্টারের নিখুঁত MCQ বিশ্লেষণ, হাজারী নাগ স্যারের রসায়ন এবং ইসহাক স্যারের পদার্থবিজ্ঞানের হাই-ইয়েল্ড প্রশ্ন ও রিভিশন নোটস। প্রতিদিনের পরীক্ষা, লাইভ ক্লাস এবং প্রফেশনাল লিডারবোর্ড সিস্টেমের মাধ্যমে নিজেকে সেরা ১০-এ উন্নীত করুন।",
    thumbnail: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=60",
    banner: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&auto=format&fit=crop&q=80",
    instructorName: "Shahriar Kabir & Team (DMC)",
    instructorTitle: "Dhaka Medical College (K-78), Medical Student Mentor",
    instructorAvatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=60",
    duration: "10 Months",
    totalExams: 120,
    totalClasses: 85,
    totalMaterials: 160,
    subjects: ["Biology", "Chemistry", "Physics", "GK", "English"],
    syllabus: [
      {
        subject: "Biology 1st & 2nd Paper",
        chapters: [
          { chapterTitle: "কোষ ও এর গঠন (Cell Structure)", topics: ["কোষ প্রাচীর ও প্লাজমামেমব্রেন", "অঙ্গাণু ও সাইটোপ্লাজম", "লাইসোসোম ও মাইটোকন্ড্রিয়া"] },
          { chapterTitle: "কোষ বিভাজন (Cell Division)", topics: ["মাইটোসিস মেটাকাইনেসিস", "মিয়োসিস কায়াজমা", "কোষ চক্র (G1, S, G2)"] },
          { chapterTitle: "রক্ত ও সংবহন (Blood & Circulation)", topics: ["প্লাজমা ও রক্তকণিকা", "বাইকার্বনেট বাফার", "হৃদপিণ্ড ও কপাটিকা"] }
        ]
      },
      {
        subject: "Chemistry 1st & 2nd Paper",
        chapters: [
          { chapterTitle: "গুণগত রসায়ন (Qualitative Chemistry)", topics: ["কোয়ান্টাম সংখ্যা", "আউফবাউ ও পাউলি নীতি", "দ্রাব্যতা ও দ্রাব্যতা গুণফল"] },
          { chapterTitle: "জৈব রসায়ন (Organic Chemistry)", topics: ["IUPAC নামকরণ", "ইলেক্ট্রোফিলিক প্রতিস্থাপন", "অ্যালকোহল ও অ্যালডিহাইড"] }
        ]
      }
    ],
    features: [
      "১২০টি লাইভ স্ট্যান্ডার্ড মেডিকেল মডেল টেস্ট",
      "আবুল হাসান ও গাজী আজমল বইয়ের লাইন-বাই-লাইন ডিকোড",
      "রিয়েল-টাইম জাতীয় লিডারবোর্ড ও এআই ডায়াগনস্টিক রিপোর্ট",
      "২৪/৭ স্মার্ট মিসটেক ব্যাংক ও ইনস্ট্যান্ট রিভিশন অ্যালগরিদম",
      "প্রতিটি পরীক্ষার পর এক্সক্লুসিভ লাইভ ও রেকর্ডেড সল্ভ ক্লাস"
    ],
    benefits: [
      "ভর্তি পরীক্ষায় নেগেটিভ মার্কিং কমানোর বিশেষ কৌশল",
      "টাইম ম্যানেজমেন্ট স্পিড ট্র্যাকিং এনালিটিক্স",
      "টপ ১০০ মেডিকেল শিক্ষার্থীদের সাথে গ্রুপ কম্পিটিশন"
    ],
    examInfo: "প্রতিদিন রাত ৮:০০ টায় পরীক্ষা শুরু। পরীক্ষার সময়কাল ৪৫ মিনিট।",
    classInfo: "সপ্তাহে ৪ দিন রাত ৯:০০ টায় স্পেশাল ইন্টারেক্টিভ লাইভ ডাউট সলভিং ক্লাস।",
    reviews: [
      {
        id: "rev_1",
        studentName: "Nusrat Jahan",
        rating: 5,
        comment: "প্রতিদিনের এক্সাম ও ইনস্ট্যান্ট এআই এনালাইসিস আমার দুর্বল চ্যাপ্টারগুলো দ্রুত রিভিশন দিতে অনেক সাহায্য করেছে।",
        date: "2026-08-01"
      },
      {
        id: "rev_2",
        studentName: "Tahmid Hasan",
        rating: 5,
        comment: "ডায়াগনস্টিক রিপোর্ট ও মিসটেক ব্যাংক ফিচারটি অসাধারণ। মেডিকেল প্রিপারেশনের জন্য সেরা প্ল্যাটফর্ম।",
        date: "2026-08-03"
      }
    ],
    faq: [
      {
        question: "লাইভ ক্লাস মিস হলে কি রেকর্ডিং পাওয়া যাবে?",
        answer: "হ্যাঁ, প্রতিটি ক্লাসের পর এইচডি রেকর্ডিং ও লেকচার পিডিএফ ক্লাস সেকশনে আপলোড হয়ে যাবে।"
      },
      {
        question: "পেমেন্ট সম্পন্ন হওয়ার পর কত দ্রুত অ্যাক্সেস পাব?",
        answer: "অটো পেমেন্টে সাথে সাথে এবং ম্যানুয়াল ভেরিফিকেশনে সর্বোচ্চ ১০ মিনিটের মধ্যে ব্যাচ অ্যাক্সেস সক্রিয় হয়ে যাবে।"
      }
    ],
    originalPrice: 12000,
    discountedPrice: 6990,
    defaultBatchId: "batch_2027_alpha",
    demoVideoUrl: "",
    demoVideoTitle: "",
    demoPdfUrl: "",
    demoClasses: [],
    routineItems: [],
    createdAt: "2026-01-01T00:00:00Z"
  },
  {
    id: "course_mat_revision",
    slug: "mat-final-crack-revision-batch",
    title: "MAT Final Crack & Crash Revision Batch",
    shortDescription: "শেষ মুহূর্তের ১০০ দিনের সুপার ফাস্ট রিভিশন, শর্টকাট টেকনিক ও ৩০টি মেগা ফাইনাল মডেল টেস্ট।",
    fullDescription: "ভর্তি পরীক্ষার পূর্বের শেষ ১০০ দিন সবচেয়ে ক্রুশিয়াল। এই ক্র্যাশ কোর্সে প্রতিটি চ্যাপ্টারের কোর কনসেপ্ট, বিগত বছরের প্রশ্ন ব্যাংক সমাধান এবং স্পেশাল এক্সক্লুসিভ জিকে ও ইংলিশ হাইলাইটস প্রদান করা হয়।",
    thumbnail: "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=800&auto=format&fit=crop&q=60",
    banner: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=1200&auto=format&fit=crop&q=80",
    instructorName: "Dr. Tanjim Ahmed",
    instructorTitle: "Sir Salimullah Medical College (K-49), MedPrep Core Mentor",
    instructorAvatar: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300&auto=format&fit=crop&q=60",
    duration: "4 Months",
    totalExams: 60,
    totalClasses: 45,
    totalMaterials: 90,
    subjects: ["Biology", "Chemistry", "Physics", "GK", "English"],
    syllabus: [
      {
        subject: "All Combined Subjects",
        chapters: [
          { chapterTitle: "জীববিজ্ঞান ফুল রিভিশন", topics: ["উদ্ভিদবিজ্ঞান হাই ইয়েল্ড", "প্রাণীবিজ্ঞান হাই ইয়েল্ড"] },
          { chapterTitle: "রসায়ন ও পদার্থবিজ্ঞান ক্র্যাশ", topics: ["জৈব রসায়ন বিক্রিয়া", "পদার্থবিজ্ঞান সূত্রাবলি ও ম্যাথ"] }
        ]
      }
    ],
    features: [
      "৬০টি মেগা মডেল টেস্ট ও ডেইলি র‍্যাপিড এক্সাম",
      "জিকে ও ইংরেজির ১০০% কমন উপযোগী ক্যাপসুল শিট",
      "টপ ডক্টরস প্যানেল কর্তৃক লাইভ ডাউট সলভিং"
    ],
    benefits: [
      "বোর্ডের বিগত ১০ বছরের প্রশ্ন এক নজরে রিভিশন",
      "টাইম ম্যানেজমেন্ট স্পিড বাড়ানোর ট্র্যাকার"
    ],
    examInfo: "প্রতি শুক্রবার মেগা পেপার ফাইনাল এক্সাম এবং ডেইলি সাবজেক্ট টেস্ট।",
    classInfo: "সপ্তাহে ৩ দিন রাত ৯:০০ টায় স্পেশাল রিভিশন সেশন।",
    reviews: [
      {
        id: "rev_3",
        studentName: "Mahir Faysal",
        rating: 5,
        comment: "শর্টকাট ট্রিকস ও জিকে শিটগুলো এক কথায় সেরা!",
        date: "2026-08-05"
      }
    ],
    faq: [
      {
        question: "এক্সামগুলো কি নেগেটিভ মার্কিং সহ?",
        answer: "হ্যাঁ, প্রতি ভুল উত্তরে ০.২৫ মার্কস কাটা যাবে এবং ইনস্ট্যান্ট র‍্যাঙ্ক দেখতে পারবেন।"
      }
    ],
    originalPrice: 8000,
    discountedPrice: 4990,
    defaultBatchId: "batch_2026_rev",
    demoVideoUrl: "",
    demoVideoTitle: "",
    demoPdfUrl: "",
    demoClasses: [],
    routineItems: [],
    createdAt: "2026-02-15T00:00:00Z"
  },
  {
    id: "course_bio_mastery",
    slug: "medical-biology-mastery-program",
    title: "Medical Biology 100% Mastery & Mnemonics Program",
    shortDescription: "বোটানি ও জুলজির প্রতিটি অধ্যায়ের লাইন-বাই-লাইন ডিকোড ও মনে রাখার বিশেষ নিউমোনিক পদ্ধতি।",
    fullDescription: "মেডিকেল ভর্তি পরীক্ষায় জীববিজ্ঞানে ৩০ এ ৩০ তোলাই চান্স পাওয়ার মূল চাবিকাঠি। এই স্পেশালাইজড প্রোগ্রামে বোটানি ও জুলজির জটিল পরিভাষা, বৈজ্ঞানিক নাম এবং কঠিন ছকগুলো ছন্দে ছন্দে আয়ত্ত করানো হয়।",
    thumbnail: "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=800&auto=format&fit=crop&q=60",
    banner: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=1200&auto=format&fit=crop&q=80",
    instructorName: "Dr. Sazzad Hossain",
    instructorTitle: "MBBS (DMC), Top MedPrep Instructor",
    instructorAvatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=60",
    duration: "3 Months",
    totalExams: 40,
    totalClasses: 36,
    totalMaterials: 60,
    subjects: ["Biology 1st Paper", "Biology 2nd Paper"],
    syllabus: [
      {
        subject: "Biology Mastery",
        chapters: [
          { chapterTitle: "উদ্ভিদ শারীরতত্ত্ব ও প্রজনন", topics: ["সালোকসংশ্লেষণ C3 C4 চক্র", "শসন ও এনজাইম"] },
          { chapterTitle: "প্রাণীর অণুজীব ও পরিপাক", topics: ["পরিপাক নালী ও এনজাইমস", "শ্বসন ও রক্ত সংবহন"] }
        ]
      }
    ],
    features: [
      "আবুল হাসান ও গাজী আজমল বইয়ের লাইন-বাই-লাইন দাগানো প্রশ্ন",
      "মেডিকেলিয়ান্স নিউমোনিক ও শর্টকাট চার্ট",
      "৩০টি স্পেশাল বায়োলজি চ্যাপ্টারওয়াইজ টেস্ট"
    ],
    benefits: [
      "বায়োলজিতে ৩০-এ ৩০ পাওয়ার পূর্ণাঙ্গ প্রস্তুতি",
      "বইয়ের প্রতিটি ছক ও গুরুত্বপূর্ণ তথ্যের পিডিএফ"
    ],
    examInfo: "প্রতিদিন চ্যাপ্টার ভিত্তিক ৫০ মার্কস এর এক্সাম।",
    classInfo: "সপ্তাহে ৩টি লাইভ মাস্টারক্লাস।",
    reviews: [
      {
        id: "rev_4",
        studentName: "Sadiya Sultana",
        rating: 5,
        comment: "বায়োলজিতে এতো ডিটেইলস সুন্দর ছক ও ক্লাসিফাইড প্র্যাকটিস আগে কোথাও দেখিনি!",
        date: "2026-08-10"
      }
    ],
    faq: [
      {
        question: "অন্য সাবজেক্টের ক্লাস থাকবে কি?",
        answer: "না, এটি ডেডিকেটেড বায়োলজি স্পেশালিস্ট কোর্স।"
      }
    ],
    originalPrice: 5000,
    discountedPrice: 2990,
    defaultBatchId: "batch_bio_master",
    demoVideoUrl: "",
    demoVideoTitle: "",
    demoPdfUrl: "",
    demoClasses: [],
    routineItems: [],
    createdAt: "2026-03-01T00:00:00Z"
  }
];

export const INITIAL_BATCHES: Batch[] = [
  {
    id: "batch_2027_alpha",
    courseId: "course_med_2027",
    batchName: "Medical Admission Exam Batch 2027",
    batchSlug: "batch-2027",
    teacherIds: ["teacher_shahriar", "teacher_tanjim"],
    totalStudents: 2310,
    price: 8500,
    originalPrice: 12500,
    discountedPrice: 8500,
    startDate: "2026-09-01",
    endDate: "2027-06-30",
    accessUntil: "2027-07-31",
    scheduleDetails: "রবি, মঙ্গল, বৃহস্পতি রাত ৮:০০ টা",
    createdAt: "2026-01-10T00:00:00Z"
  },
  {
    id: "batch_2026_rev",
    courseId: "course_med_2026",
    batchName: "Final Revision Batch 2026",
    batchSlug: "revision-2026",
    teacherIds: ["teacher_tanjim"],
    totalStudents: 2150,
    price: 4990,
    originalPrice: 8000,
    discountedPrice: 4990,
    startDate: "2026-08-15",
    endDate: "2026-12-31",
    accessUntil: "2027-01-31",
    scheduleDetails: "প্রতিদিন রাত ৯:০০ টা",
    createdAt: "2026-02-15T00:00:00Z"
  },
  {
    id: "batch_bio_master",
    courseId: "course_bio_mastery",
    batchName: "Biology Champion Batch 01",
    batchSlug: "bio-champion-01",
    teacherIds: ["teacher_sazzad"],
    totalStudents: 670,
    price: 2990,
    originalPrice: 5000,
    discountedPrice: 2990,
    startDate: "2026-08-20",
    endDate: "2026-11-20",
    accessUntil: "2027-02-28",
    scheduleDetails: "শনিবার ও বুধবার রাত ৮:৩০ টা",
    createdAt: "2026-03-01T00:00:00Z"
  }
];

export const INITIAL_CLASSES: CourseClass[] = [
  {
    id: "cls_101",
    courseId: "course_med_2027",
    batchId: "batch_2027_alpha",
    title: "কোষ ও এর গঠন: সাইটোপ্লাজমীয় অঙ্গাণু ও লাইসোসোম ট্রিকস",
    description: "ড. আবুল হাসান স্যারের ৩য় অধ্যায়ের প্রতিটি চিত্র, অঙ্গাণুর কাজ ও বিগত বছরের MAT প্রশ্ন সমাধান।",
    instructor: "Dr. Shahriar Kabir (DMC)",
    isLive: false,
    platform: "youtube",
    recordingUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    youtubeLiveUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    googleMeetUrl: "https://meet.google.com/abc-cell-med",
    meetingCode: "abc-cell-med",
    date: "2026-08-10",
    time: "07:30 PM",
    durationMinutes: 75,
    subject: "Biology",
    chapter: "Cell Structure",
    status: "ended",
    createdAt: "2026-08-10T10:00:00Z"
  },
  {
    id: "cls_102",
    courseId: "course_med_2027",
    batchId: "batch_2027_alpha",
    title: "লাইভ ক্লাস: জৈব রসায়নের নামকরণ ও মেকানিজম মাস্টারক্লাস",
    description: "হাজারী নাগ স্যারের জৈব রসায়নের IUPAC নামকরণ ও গুরুত্বপূর্ণ রাসায়নিক বিক্রিয়া সংক্ষিপ্ত টেকনিক।",
    instructor: "Dr. Tanjim Ahmed (SSMC)",
    isLive: true,
    platform: "dual",
    liveUrl: "https://meet.google.com/med-chem-2027",
    googleMeetUrl: "https://meet.google.com/med-chem-2027",
    meetingCode: "med-chem-2027",
    youtubeLiveUrl: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
    recordingUrl: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
    date: "2026-08-21",
    time: "08:00 PM",
    durationMinutes: 90,
    subject: "Chemistry",
    chapter: "Organic Chemistry",
    status: "live_now",
    createdAt: "2026-08-12T00:00:00Z"
  },
  {
    id: "cls_103",
    courseId: "course_med_2027",
    batchId: "batch_2027_alpha",
    title: "লাইভ ডাউট সলভিং: মানব শারীরতত্ত্ব - রক্ত ও সংবহনতন্ত্র",
    description: "গাজী আজমল স্যারের হার্ট সাইকেল, রক্তচাপ ও ইসিজি রিলেটেড কনফিউজিং প্রশ্নের লাইভ আলোচনা ও ডাউট সমাধান।",
    instructor: "Dr. Shahriar Kabir (DMC)",
    isLive: true,
    platform: "google_meet",
    liveUrl: "https://meet.google.com/med-circ-2027",
    googleMeetUrl: "https://meet.google.com/med-circ-2027",
    meetingCode: "med-circ-2027",
    youtubeLiveUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    date: "2026-08-22",
    time: "07:30 PM",
    durationMinutes: 80,
    subject: "Biology",
    chapter: "Circulatory System",
    status: "live_now",
    createdAt: "2026-08-14T00:00:00Z"
  },
  {
    id: "cls_104",
    courseId: "course_med_2027",
    batchId: "batch_2027_alpha",
    title: "মেগা লাইভ সেশন: পদার্থবিজ্ঞান ১ম পত্র - ভেক্টর ও গতিবিদ্যা শর্টকাট",
    description: "মেডিকেল ভর্তি পরীক্ষার জন্য ক্যালকুলেটর ছাড়া ভেক্টর ও গতিবিদ্যার জটিল ম্যাথ ৫ সেকেন্ডে সমাধানের সুপার ট্রিকস।",
    instructor: "Engr. Rafid Hossain (BUET / MedPrep Physics)",
    isLive: true,
    platform: "youtube",
    liveUrl: "https://www.youtube.com/watch?v=5qap5aO4i9A",
    youtubeLiveUrl: "https://www.youtube.com/watch?v=5qap5aO4i9A",
    googleMeetUrl: "https://meet.google.com/phy-vector-live",
    meetingCode: "phy-vector-live",
    date: "2026-08-23",
    time: "09:00 PM",
    durationMinutes: 90,
    subject: "Physics",
    chapter: "Vectors & Kinematics",
    status: "upcoming",
    createdAt: "2026-08-15T00:00:00Z"
  },
  {
    id: "cls_105",
    courseId: "course_bio_mastery",
    batchId: "batch_bio_master",
    title: "লাইভ স্পেশাল ক্লাস: জেনেটিক্স ও মেন্ডেলিজম এক্সসেপশন",
    description: "মেন্ডেলের সূত্রের ব্যতিক্রম, এপিস্ট্যাসিস ও সেক্স লিঙ্কড ডিজঅর্ডার এর ১০০% শিওর প্রশ্ন সমাধান।",
    instructor: "Dr. Sazzad Hossain",
    isLive: true,
    platform: "dual",
    liveUrl: "https://meet.google.com/bio-gen-champ",
    googleMeetUrl: "https://meet.google.com/bio-gen-champ",
    meetingCode: "bio-gen-champ",
    youtubeLiveUrl: "https://www.youtube.com/watch?v=M576WGiDBdQ",
    date: "2026-08-24",
    time: "08:30 PM",
    durationMinutes: 85,
    subject: "Biology",
    chapter: "Genetics & Evolution",
    status: "upcoming",
    createdAt: "2026-08-15T00:00:00Z"
  }
];

export const INITIAL_MATERIALS: CourseMaterial[] = [
  {
    id: "mat_201",
    courseId: "course_med_2027",
    batchId: "batch_2027_alpha",
    title: "আবুল হাসান স্যার - জীববিজ্ঞান ১ম পত্র হাই-ইয়েল্ড দাগানো বই (পিডিএফ)",
    type: "pdf",
    fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    fileSize: "14.2 MB",
    subject: "Biology",
    chapter: "Cell Structure",
    createdAt: "2026-08-01T00:00:00Z"
  },
  {
    id: "mat_202",
    courseId: "course_med_2027",
    batchId: "batch_2027_alpha",
    title: "জৈব রসায়ন শর্টকাট বিক্রিয়া ফ্ল্যাশ কার্ড ও চার্ট",
    type: "lecture_sheet",
    fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    fileSize: "8.5 MB",
    subject: "Chemistry",
    chapter: "Organic Chemistry",
    createdAt: "2026-08-05T00:00:00Z"
  },
  {
    id: "mat_203",
    courseId: "course_med_2027",
    batchId: "batch_2027_alpha",
    title: "মেডিকেল সাধারণ জ্ঞান (মুক্তিযুদ্ধ ও বাংলাদেশ) স্পেশাল নোট",
    type: "note",
    fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    fileSize: "5.1 MB",
    subject: "GK",
    chapter: "History of Bangladesh",
    createdAt: "2026-08-08T00:00:00Z"
  }
];

export const INITIAL_ANNOUNCEMENTS: CourseAnnouncement[] = [
  {
    id: "anc_301",
    courseId: "course_med_2027",
    batchId: "batch_2027_alpha",
    title: "📌 [জরুরি শিক্ষক নির্দেশনা] আগামীকালের লাইভ মেগা মডেল টেস্ট ০১ সংক্রান্ত নিয়মাবলী",
    content: "প্রিয় শিক্ষার্থীবৃন্দ, আগামীকাল রাত ৮:০০ টায় আমাদের বায়োলজি ও কেমিস্ট্রি ১ম পত্রের উপর ১০০ মার্কসের লাইভ মডেল টেস্ট অনুষ্ঠিত হবে। নেগেটিভ মার্কিং ০.২৫। ট্যাব সুইচ এবং ফোকাস লস ডিটেকশন সক্রিয় থাকবে। পরীক্ষায় কোনোভাবেই ব্রাউজার পরিবর্তন করা যাবে না। প্রস্তুতি জোরদার করো!",
    authorName: "Dr. Shahriar Kabir",
    authorRole: "Head Faculty (Biology & Admission Specialist)",
    authorAvatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80",
    priority: "high",
    isPinned: true,
    tag: "Exam Instruction",
    createdAt: "2026-08-18T10:00:00Z"
  },
  {
    id: "anc_302",
    courseId: "course_med_2027",
    batchId: "batch_2027_alpha",
    title: "📌 [হাই-ইল্ড গাইডলাইন] মানব শারীরতত্ত্ব (রক্ত ও সংবহনতন্ত্র) দাগানো বই ও শর্টকাট আপডেট",
    content: "আবুল হাসান ও গাজী আজমল স্যারের বইয়ের যেসব চার্ট থেকে বিগত ৫ বছরে মেডিকেল ভর্তি পরীক্ষায় প্রশ্ন এসেছে, তার বিশেষ হাই-ইল্ড সামারি নোটস সেকশনে আপলোড করা হয়েছে। সবাই ডাউনলোড করে রিভিশন দিয়ে নাও।",
    authorName: "Dr. Nuwaisir Hoque",
    authorRole: "Course Director & Mentor (DMCian)",
    authorAvatar: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80",
    priority: "high",
    isPinned: true,
    tag: "High Yield Study",
    createdAt: "2026-08-17T14:30:00Z"
  },
  {
    id: "anc_303",
    courseId: "course_med_2027",
    batchId: "batch_2027_alpha",
    title: "🔔 [ক্লাস শিডিউল] জৈব রসায়ন মেকানিজম বিশেষ ডাউট সলভিং লাইভ সেশন",
    content: "আগামী শুক্রবার বিকাল ৫:০০ টায় জৈব রসায়নের ইলেক্ট্রোফিলিক ও নিউক্লিওফিলিক বিক্রিয়ার মেকানিজম নিয়ে এক্সক্লুসিভ লাইভ সেশন অনুষ্ঠিত হবে। জুম এবং ফেসবুক প্রাইভেট গ্রুপে সরাসরি যুক্ত থাকতে পারবে।",
    authorName: "Dr. Ayesha Siddiqa",
    authorRole: "Senior Chemistry Mentor",
    authorAvatar: "https://images.unsplash.com/photo-1594824813620-42861c8f1807?w=150&auto=format&fit=crop&q=80",
    priority: "normal",
    isPinned: false,
    tag: "Live Class",
    createdAt: "2026-08-15T09:00:00Z"
  },
  {
    id: "anc_304",
    courseId: "course_med_bio_mastery",
    batchId: "batch_bio_mastery_01",
    title: "📌 [টিচার পিন্ড আপডেট] উদ্ভিদ প্রজনন ও জেনেটিক্স বিশেষ ফর্মুলা শিট",
    content: "বায়োলজি মাস্টারির প্রিয় ছাত্রছাত্রীরা, মেন্ডেলের সূত্রের ব্যতিক্রম ও জিনতত্ত্বের ক্রস মনে রাখার সহজ ট্রিকস সম্বলিত পিডিএফ লেকচার শিট 'নোটস & শিট' ট্যাবে যুক্ত করা হয়েছে। পরীক্ষার আগে অবশ্যই ৩ বার রিভিশন দিবে।",
    authorName: "Dr. Shahriar Kabir",
    authorRole: "Head Faculty",
    authorAvatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80",
    priority: "high",
    isPinned: true,
    tag: "Study Material",
    createdAt: "2026-08-18T12:00:00Z"
  }
];

export const INITIAL_COUPONS: Coupon[] = [
  {
    id: "coup_1",
    code: "MED1000",
    discountType: "fixed",
    discountValue: 1000,
    minOrderAmount: 4000,
    expiryDate: "2027-12-31",
    usageCount: 142,
    maxUsage: 1000,
    isActive: true,
    applicableScope: "all",
    applicableCourseIds: ["all"],
    applicableCourseTitles: ["সকল কোর্স (All Courses)"],
    totalDiscountGiven: 142000,
    usageLogs: [
      {
        userId: "user_demo_1",
        userName: "Dr. Farhan Tanvir",
        userEmail: "farhan.med@gmail.com",
        courseId: "course_med_2027",
        courseTitle: "Medical Standard Exam Batch 2027",
        originalAmount: 4999,
        discountAmount: 1000,
        finalAmount: 3999,
        transactionId: "TRX88492019",
        usedAt: "2026-08-19T14:22:00.000Z"
      },
      {
        userId: "user_demo_2",
        userName: "Sumaiya Akhter",
        userEmail: "sumaiya.mat@gmail.com",
        courseId: "course_bio_master",
        courseTitle: "Biology Masterclass for MAT",
        originalAmount: 3500,
        discountAmount: 1000,
        finalAmount: 2500,
        transactionId: "BKASH938210",
        usedAt: "2026-08-20T09:15:00.000Z"
      }
    ]
  },
  {
    id: "coup_2",
    code: "BIOVIP500",
    discountType: "fixed",
    discountValue: 500,
    minOrderAmount: 2000,
    expiryDate: "2027-12-31",
    usageCount: 68,
    maxUsage: 250,
    isActive: true,
    applicableScope: "specific",
    applicableCourseIds: ["course_bio_master"],
    applicableCourseTitles: ["Biology Masterclass for MAT"],
    totalDiscountGiven: 34000,
    usageLogs: [
      {
        userId: "user_demo_3",
        userName: "Tahmid Hasan",
        userEmail: "tahmid.hasan@yahoo.com",
        courseId: "course_bio_master",
        courseTitle: "Biology Masterclass for MAT",
        originalAmount: 3500,
        discountAmount: 500,
        finalAmount: 3000,
        transactionId: "NAGAD449201",
        usedAt: "2026-08-19T18:40:00.000Z"
      }
    ]
  },
  {
    id: "coup_3",
    code: "PRO20",
    discountType: "percentage",
    discountValue: 20,
    minOrderAmount: 3000,
    expiryDate: "2027-12-31",
    usageCount: 89,
    maxUsage: 500,
    isActive: true,
    applicableScope: "all",
    applicableCourseIds: ["all"],
    applicableCourseTitles: ["সকল কোর্স (All Courses)"],
    totalDiscountGiven: 62300,
    usageLogs: []
  }
];

// Helper to extract questions
const getExamQuestions = (subject: string, count: number = 20): Question[] => {
  const filtered = STARTER_QUESTIONS.filter((q) => q.subject.toLowerCase() === subject.toLowerCase());
  const selected = filtered.length >= count ? filtered.slice(0, count) : STARTER_QUESTIONS.slice(0, count);
  return selected.map((q, idx) => ({
    id: `exam_q_${subject.toLowerCase()}_${idx + 1}`,
    questionText: q.questionText,
    options: q.options,
    correctAnswerIndex: q.correctAnswerIndex,
    explanation: q.explanation,
    subject: q.subject as any,
    chapter: q.chapter,
    difficulty: (q.difficulty as any) || "Medium",
    category: "Medical Standard Questions",
    createdAt: new Date().toISOString()
  }));
};

export const INITIAL_EXAMS: CourseExam[] = [
  {
    id: "exam_live_101",
    courseId: "course_med_2027",
    batchId: "batch_2027_alpha",
    title: "লাইভ উইকলি মডেল টেস্ট ০১: বায়োলজি (কোষ ও এর গঠন + কোষ বিভাজন)",
    subject: "Biology",
    chapter: "কোষ ও এর গঠন + কোষ বিভাজন",
    durationMinutes: 45,
    totalQuestions: 50,
    passMarks: 35,
    startTime: "2026-08-16T20:00:00+06:00",
    endTime: "2026-08-16T21:30:00+06:00",
    isPublished: true,
    questions: getExamQuestions("Biology", 50),
    createdAt: "2026-08-12T00:00:00Z"
  },
  {
    id: "exam_live_102",
    courseId: "course_med_2027",
    batchId: "batch_2027_alpha",
    title: "লাইভ সাবজেক্ট ফাইনাল: জৈব রসায়ন ও রাসায়নিক পরিবর্তন মেগা এক্সাম",
    subject: "Chemistry",
    chapter: "জৈব রসায়ন ও রাসায়নিক পরিবর্তন",
    durationMinutes: 45,
    totalQuestions: 50,
    passMarks: 35,
    startTime: "2026-08-18T20:00:00+06:00",
    endTime: "2026-08-18T21:30:00+06:00",
    isPublished: true,
    questions: getExamQuestions("Chemistry", 50),
    createdAt: "2026-08-13T00:00:00Z"
  },
  {
    id: "exam_live_103",
    courseId: "course_med_2027",
    batchId: "batch_2027_alpha",
    title: "লাইভ চ্যাপ্টার টেস্ট: মানব শারীরতত্ত্ব - রক্ত ও সংবহনতন্ত্র",
    subject: "Biology",
    chapter: "রক্ত ও রক্ত সংবহন",
    durationMinutes: 35,
    totalQuestions: 40,
    passMarks: 28,
    startTime: "2026-08-20T20:30:00+06:00",
    endTime: "2026-08-20T21:45:00+06:00",
    isPublished: true,
    questions: getExamQuestions("Biology", 40),
    createdAt: "2026-08-14T00:00:00Z"
  },
  {
    id: "exam_live_104",
    courseId: "course_med_2027",
    batchId: "batch_2027_alpha",
    title: "লাইভ পেপার টেস্ট: পদার্থবিজ্ঞান ১ম পত্র - ভেক্টর ও গতিবিদ্যা সুপার টেস্ট",
    subject: "Physics",
    chapter: "ভেক্টর ও গতিবিদ্যা",
    durationMinutes: 45,
    totalQuestions: 50,
    passMarks: 35,
    startTime: "2026-08-22T20:00:00+06:00",
    endTime: "2026-08-22T21:30:00+06:00",
    isPublished: true,
    questions: getExamQuestions("Physics", 50),
    createdAt: "2026-08-15T00:00:00Z"
  },
  {
    id: "exam_live_105",
    courseId: "course_med_2027",
    batchId: "batch_2027_alpha",
    title: "লাইভ স্পেশাল এক্সাম: মেডিকেল GK ও ইংলিশ হাই-ভোল্টেজ টেস্ট",
    subject: "GK",
    chapter: "মুক্তিযুদ্ধ, সংবিধান ও মেডিকেল ভোকাবুলারি",
    durationMinutes: 40,
    totalQuestions: 50,
    passMarks: 35,
    startTime: "2026-08-25T20:00:00+06:00",
    endTime: "2026-08-25T21:30:00+06:00",
    isPublished: true,
    questions: getExamQuestions("GK", 50),
    createdAt: "2026-08-15T00:00:00Z"
  },
  {
    id: "exam_live_106",
    courseId: "course_bio_mastery",
    batchId: "batch_bio_master",
    title: "লাইভ বায়োলজি গ্র্যান্ড টেস্ট: বোটানি ও জুওলজি ফুল রিভিশন",
    subject: "Biology",
    chapter: "জীববিজ্ঞান ১ম ও ২য় পত্র সম্পূর্ণ সিলেবাস",
    durationMinutes: 50,
    totalQuestions: 60,
    passMarks: 45,
    startTime: "2026-08-21T20:00:00+06:00",
    endTime: "2026-08-21T21:30:00+06:00",
    isPublished: true,
    questions: getExamQuestions("Biology", 60),
    createdAt: "2026-08-15T00:00:00Z"
  }
];

export const INITIAL_ENROLLMENTS: any[] = [];
export const INITIAL_MISTAKES: any[] = [];

export const DEFAULT_PAYMENT_SETTINGS: CoursePaymentSettings = {
  bkashNumber: "01789-000111",
  bkashType: "personal",
  bkashInstructionBn: "bKash অ্যাপ বা *247# ডায়াল করে 'Send Money' করুন।",
  bkashInstructionEn: "Use bKash app or dial *247# to Send Money to this personal number.",
  isBkashEnabled: true,

  nagadNumber: "01889-000222",
  nagadType: "personal",
  nagadInstructionBn: "Nagad অ্যাপ বা *167# ডায়াল করে 'Send Money' করুন।",
  nagadInstructionEn: "Use Nagad app or dial *167# to Send Money to this personal number.",
  isNagadEnabled: true,

  rocketNumber: "01989-000333",
  rocketType: "personal",
  rocketInstructionBn: "Rocket অ্যাপ বা *322# ডায়াল করে 'Send Money' করুন।",
  rocketInstructionEn: "Use Rocket app or dial *322# to Send Money to this number.",
  isRocketEnabled: true,

  upayNumber: "",
  isUpayEnabled: false,

  bankName: "Dutch-Bangla Bank Limited (DBBL)",
  bankAccountName: "MediSense Medical Prep Ltd",
  bankAccountNumber: "123.105.987654",
  bankBranch: "Mirpur-10, Dhaka",
  bankRoutingNumber: "090261234",
  isBankEnabled: true,

  generalProcessStepsBn: [
    "আপনার বিকাশ, নগদ, রকেট অ্যাপ বা ব্যাংকিং অ্যাপ ওপেন করুন।",
    "অফিসিয়াল অ্যাকাউন্টে কোর্স ফি'র সমপরিমাণ টাকা পাঠান।",
    "টাকা পাঠানোর পর প্রাপ্ত Transaction ID (TrxID) ও আপনার প্রেরক নম্বর সঠিকভাবে কপি করে ফর্ম সাবমিট করুন।",
    "এডমিন ভেরিফিকেশনের পর স্বয়ংক্রিয়ভাবে আপনার ব্যাচ এনরোলমেন্ট সক্রিয় হবে।"
  ],
  generalProcessStepsEn: [
    "Open your bKash, Nagad, Rocket or Banking application.",
    "Transfer the exact course fee to our official payment number/account.",
    "Copy the transaction ID (TrxID) and sender mobile number into the checkout verification form.",
    "Upon verification, your course batch enrollment will be activated instantly."
  ],
  helplinePhone: "+880 1789-000111",
  helplineWhatsapp: "+880 1789-000111",
  helplineEmail: "medibridgeedu@gmail.com",
  facebookPageName: "Medibridge Academy",
  facebookPageUrl: "https://facebook.com/medibridgeacademy",
  paymentNoticeBn: "পেমেন্ট সম্পন্ন করার সর্বোচ্চ ৫-১৫ মিনিটের মধ্যে আপনার ব্যাচ অ্যাক্সেস এপ্রুভ হয়ে যাবে। কোনো জটিলতায় হেল্পলাইনে যোগাযোগ করুন।",
  paymentNoticeEn: "Your batch access is verified within 5-15 minutes of payment submission. Contact helpline for immediate support."
};

export const MOCK_COURSES = INITIAL_COURSES;
export const MOCK_BATCHES = INITIAL_BATCHES;
export const MOCK_CLASSES = INITIAL_CLASSES;
export const MOCK_MATERIALS = INITIAL_MATERIALS;
export const MOCK_ANNOUNCEMENTS = INITIAL_ANNOUNCEMENTS;
export const MOCK_EXAMS = INITIAL_EXAMS;
export const MOCK_ENROLLMENTS = INITIAL_ENROLLMENTS;
export const MOCK_MISTAKES = INITIAL_MISTAKES;
export const MOCK_COUPONS = INITIAL_COUPONS;
