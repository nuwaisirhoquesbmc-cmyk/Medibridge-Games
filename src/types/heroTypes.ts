export interface OurHero {
  id: string;
  name: string;
  college: string; // Institution (Medical College / University / Engineering)
  institutionType?: "medical" | "engineering" | "university" | "dental" | "armed_forces" | "other";
  rank: string;
  score?: string;
  batchYear: string;
  courseName?: string;
  photoUrl: string;
  story: string;
  hometown?: string;
  verified: boolean;
  isFeatured: boolean;
  order: number;
  badge?: string;
  createdAt: string;
  updatedAt?: string;
}

export const INITIAL_HEROES: OurHero[] = [
  {
    id: "hero_1",
    name: "Dr. Shahriar Kabir",
    college: "Dhaka Medical College (DMC)",
    institutionType: "medical",
    rank: "National Merit 3rd (MAT)",
    score: "94.50 / 100",
    batchYear: "2024-2025",
    courseName: "Medical Standard Exam Batch",
    photoUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80",
    story: "মেডিব্রিজের নিয়মিত ডেইলি মডেল টেস্ট এবং অটোমেটিক মিসটেক ব্যাংকের রিভিশন আমার বায়োলজি ও কেমিস্ট্রির নেগেティブ মার্কিং প্রায় শূন্যে নামিয়ে এনেছিল।",
    hometown: "Dhaka",
    verified: true,
    isFeatured: true,
    order: 1,
    badge: "DMC Merit 3rd",
    createdAt: "2025-01-15T10:00:00Z"
  },
  {
    id: "hero_2",
    name: "Nusrat Jahan Fariha",
    college: "Sir Salimullah Medical College (SSMC)",
    institutionType: "medical",
    rank: "National Merit 18th",
    score: "91.25 / 100",
    batchYear: "2024-2025",
    courseName: "Biology Masterclass & CBT Batch",
    photoUrl: "https://images.unsplash.com/photo-1594824813589-9a738122d25f?w=400&auto=format&fit=crop&q=80",
    story: "আবুল হাসান ও গাজী আজমল স্যারের বইয়ের লাইন-বাই-লাইন ডিকোড প্রশ্নগুলো পরীক্ষার হলে আমাকে অসম্ভব আত্মবিশ্বাস যুগিয়েছিল।",
    hometown: "Chattogram",
    verified: true,
    isFeatured: true,
    order: 2,
    badge: "SSMC Top 20",
    createdAt: "2025-02-10T10:00:00Z"
  },
  {
    id: "hero_3",
    name: "Samiul Alam Sifat",
    college: "Dhaka University (DU - A Unit)",
    institutionType: "university",
    rank: "Merit 12th (Faculty of Science)",
    score: "96.75 / 100",
    batchYear: "2024-2025",
    courseName: "Varsity Science & Bio Master Batch",
    photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
    story: "ফিজিক্স ও কেমিস্ট্রির ম্যাথমেটিক্যাল শর্টকাট এবং বায়োলজির জটিল টপিকগুলো নিয়মিত প্র্যাকটিস করার কারণে ঢাকা বিশ্ববিদ্যালয়ে কাঙ্ক্ষিত বিষয় পেয়েছি।",
    hometown: "Rajshahi",
    verified: true,
    isFeatured: true,
    order: 3,
    badge: "DU Merit 12th",
    createdAt: "2025-02-14T10:00:00Z"
  },
  {
    id: "hero_4",
    name: "Tanvir Ahmed Chowdhury",
    college: "Chittagong Medical College (CMC)",
    institutionType: "medical",
    rank: "National Merit 34th",
    score: "89.75 / 100",
    batchYear: "2024-2025",
    courseName: "Medical Standard Exam Batch",
    photoUrl: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&auto=format&fit=crop&q=80",
    story: "টাইম-ম্যানেজমেন্ট স্পিড ট্র্যাকিং এনালিটিক্স দেখে বুঝতে পেরেছিলাম কোন সাবজেক্টে আমার বেশি সময় নষ্ট হচ্ছে। সেই অনুযায়ী প্রস্তুতি সাজিয়ে সফল হয়েছি।",
    hometown: "Sylhet",
    verified: true,
    isFeatured: true,
    order: 4,
    badge: "CMC Elite",
    createdAt: "2025-02-18T10:00:00Z"
  },
  {
    id: "hero_5",
    name: "Afrin Sultana",
    college: "BUET (Biomedical Engineering)",
    institutionType: "engineering",
    rank: "Merit 45th (Engineering Admission)",
    score: "368 / 400",
    batchYear: "2024-2025",
    courseName: "Engineering & Bio Combined Batch",
    photoUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80",
    story: "কনসেপচুয়াল প্রশ্ন এবং গভীর বিশ্লেষণাত্মক মডেল টেস্ট আমাকে ইঞ্জিনিয়ারিং ও বায়োমেডিকেল প্রস্তুতিতে সর্বোচ্চ বুস্ট দিয়েছিল।",
    hometown: "Dhaka",
    verified: true,
    isFeatured: true,
    order: 5,
    badge: "BUET Achiever",
    createdAt: "2025-02-20T10:00:00Z"
  },
  {
    id: "hero_6",
    name: "Mehnaz Tabassum",
    college: "Armed Forces Medical College (AFMC)",
    institutionType: "armed_forces",
    rank: "Merit 15th (Army Medical Selection)",
    score: "88.50 / 100",
    batchYear: "2023-2024",
    courseName: "Full Medical Revision Program",
    photoUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80",
    story: "ডাউট সলভিং লাইভ সেশনে মেন্টররা প্রতিটি জটিল টপিক যেভাবে সহজ করে বুঝিয়ে দিয়েছিলেন তা ভুলার মতো নয়।",
    hometown: "Mymensingh",
    verified: true,
    isFeatured: true,
    order: 6,
    badge: "AFMC Achiever",
    createdAt: "2024-03-01T10:00:00Z"
  }
];
